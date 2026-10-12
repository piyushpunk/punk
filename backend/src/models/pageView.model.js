import mongoose from "mongoose";

/**
 * PageView — first-party pageview event (no Google Analytics installed).
 * One document per page view; `path` is the client route, `ref` the
 * document.referrer ("" when typed/bookmarked), `visitor` a stable
 * per-browser id set by the storefront. Written by the public
 * POST /pageviews endpoint; read by the admin traffic summary.
 */
const pageViewSchema = new mongoose.Schema(
  {
    path: { type: String, required: true, trim: true, maxlength: 300 },
    ref: { type: String, trim: true, maxlength: 500, default: "" },
    visitor: { type: String, trim: true, maxlength: 64, default: "" },
    day: { type: String, trim: true, maxlength: 10 }, // UTC YYYY-MM-DD, for cheap day-bucketing
  },
  { timestamps: true }
);

// Traffic-panel lookups: recent window by day + per-path counts.
pageViewSchema.index({ createdAt: -1 });
pageViewSchema.index({ day: 1, path: 1 });

/** UTC date string (YYYY-MM-DD) used as the cheap daily bucket. */
export function utcDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export const PageView = mongoose.model("PageView", pageViewSchema);
