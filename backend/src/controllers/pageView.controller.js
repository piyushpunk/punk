import { PageView, utcDay } from "../models/pageView.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * POST /pageviews — public. Records one page view. The storefront fires
 * this on every route change. Deliberately boring: no cookies, no PII,
 * no user identity — just the path, referrer, and an anonymous
 * per-browser id so the traffic panel can show unique visitors.
 */
const trackPageView = asyncHandler(async (req, res) => {
  const { path, ref = "", visitor = "" } = req.body;

  const doc = await PageView.create({
    path,
    ref,
    visitor,
    day: utcDay(),
  });

  return res.status(201).json(new ApiResponse(201, { tracked: true, id: doc._id }, "Tracked"));
});

/**
 * GET /pageviews/traffic?days=14 — admin. Aggregates:
 *  - daily views + unique visitors for the window
 *  - top paths in the window
 *  - referrer hosts (external only, "" means direct/typed)
 */
const getTrafficSummary = asyncHandler(async (req, res) => {
  const days = req.validatedQuery.days;
  const now = new Date();
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const sinceDay = utcDay(since);

  const windowMatch = { createdAt: { $gte: since } };

  const [daily, topPaths, referrers] = await Promise.all([
    // Views + visitors per day. Day is stored pre-bucketed so this is a
    // plain group instead of a date-math pipeline.
    PageView.aggregate([
      { $match: windowMatch },
      {
        $group: {
          _id: "$day",
          views: { $sum: 1 },
          visitors: { $addToSet: "$visitor" },
        },
      },
      { $addFields: { unique: { $size: "$visitors" } } },
      { $unset: "visitors" },
      { $sort: { _id: 1 } },
    ]),

    PageView.aggregate([
      { $match: windowMatch },
      { $group: { _id: "$path", views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: 10 },
    ]),

    // referrer host extraction done client-side over a daily fold;
    // simpler: group on the raw ref then trim to host here.
    PageView.aggregate([
      { $match: windowMatch },
      { $group: { _id: "$ref", views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: 12 },
    ]),
  ]);

  const hostOf = (r) => {
    try {
      return r ? new URL(r).host : "";
    } catch {
      return r; // stored refs are validated URLs or ""
    }
  };
  const byHost = new Map();
  for (const r of referrers) {
    const host = hostOf(r._id);
    byHost.set(host, (byHost.get(host) || 0) + r.views);
  }
  const topReferrers = [...byHost.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([host, views]) => ({ host: host || "direct", views }));

  const totals = daily.reduce(
    (acc, d) => {
      acc.views += d.views;
      acc.visitors += d.unique;
      return acc;
    },
    { views: 0, visitors: 0 }
  );

  return res.status(200).json(
    new ApiResponse(200, {
      days,
      since: since.toISOString(),
      totals,
      daily, // [{ _id: 'YYYY-MM-DD', views, unique }]
      topPaths,
      topReferrers,
    })
  );
});

export { trackPageView, getTrafficSummary };
