// Integration test for the first-party traffic feature:
//   POST /api/v1/pageviews (public) + GET /api/v1/pageviews/traffic (admin)
// Boots the real app against mongodb-memory-server, like smoke-test.mjs.
// Run: cd backend && node scripts/test-traffic.mjs
import fs from "fs";
import path from "path";

// Error-log noise guard, mirroring smoke-test's silent-error convention.
fs.openSync("scripts/.testtraffic-ok", "w");

const { MongoMemoryReplSet } = await import("mongodb-memory-server");
const mem = await MongoMemoryReplSet.create({
  replSet: { count: 1, storageEngine: "wiredTiger" },
});
process.env.MONGODB_URI = mem.getUri("void-studios-traffic-test");
process.env.NODE_ENV = "test";
// Auth needs JWT secrets; dotenv must not be able to override them.
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "traffic-test-access-secret";
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "traffic-test-refresh-secret";
try { await import("dotenv/config"); } catch { /* fine */ }

const mongoose = (await import("mongoose")).default;
await mongoose.connect(process.env.MONGODB_URI, { dbName: "void-studios-traffic-test" });

const { app } = await import("../src/app.js");
const { User } = await import("../src/models/user.model.js");

const server = app.listen(0);
await new Promise((r) => server.once("listening", r));
const base = `http://127.0.0.1:${server.address().port}/api/v1`;

let passed = 0, failed = 0;
const fail = (name, extra = "") => { failed++; console.error(`  ✗ ${name}${extra ? " — " + extra : ""}`); };
const ok = (name) => { passed++; console.log(`  ✓ ${name}`); };

const post = async (path, body) =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

// ── seed an admin ──────────────────────────────────────────────────────────
await User.create({
  name: "Traffic Admin",
  email: "traffic-admin@test.local",
  password: "traffic-admin-pass-123",
  role: "admin",
  isEmailVerified: true,
});

console.log("── public POST /pageviews ──");
{
  const res = await post("/pageviews", { path: "/product/centipede", visitor: "vid-1", ref: "https://www.google.com/search?q=akuma" });
  if (res.status === 201) ok("records a pageview (201)"); else fail("record pageview", `status ${res.status}`);
}

{
  const res = await post("/pageviews", { path: "/product/centipede", visitor: "vid-1" });
  if (res.status === 201) ok("second view, same visitor"); else fail("second view", `status ${res.status}`);
}

{
  const res = await post("/pageviews", { path: "/", visitor: "vid-2" });
  if (res.status === 201) ok("second distinct visitor"); else fail("distinct visitor", `status ${res.status}`);
}

{
  const res = await post("/pageviews", { path: "garbage", visitor: "vid-2" });
  if (res.status === 422) ok("rejects a path without a leading slash (422)"); else fail("bad path rejected", `status ${res.status}`);
}

{
  const res = await post("/pageviews", { path: "/x", visitor: "v", ref: "javascript:alert(1)" });
  if (res.status === 422) ok("rejects a non-http referrer (422)"); else fail("bad referrer rejected", `status ${res.status}`);
}

{
  // missing everything should still fail validation (path is required)
  const res = await post("/pageviews", {});
  if (res.status === 422) ok("rejects a request with no path (422)"); else fail("missing path rejected", `status ${res.status}`);
}

console.log("── admin GET /pageviews/traffic ──");
const login = async (email, password) => {
  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const cookie = (res.headers.get("set-cookie") || "").split(";")[0];
  return res.ok ? cookie : null;
};

const adminCookie = await login("traffic-admin@test.local", "traffic-admin-pass-123");
if (!adminCookie) fail("admin login"); else ok("admin login sets a session cookie");

{
  const res = await fetch(`${base}/pageviews/traffic?days=7`, { headers: { cookie: adminCookie } });
  const json = await res.json();
  if (res.status === 200 && json.success) {
    const d = json.data;
    const views = d?.totals?.views, visitors = d?.totals?.visitors;
    const paths = d?.topPaths || [];
    const refs = d?.topReferrers || [];
    const dailyOk = Array.isArray(d?.daily) && d.daily.length === 1 && d.daily[0].views === 3;
    if (views === 3 && visitors === 2 && dailyOk &&
        paths.length === 2 && paths[0].views === 2 && paths[0]._id === "/product/centipede" &&
        refs.length === 2 && refs[0].host === "direct" && refs[0].views === 2 &&
        refs[1].host === "www.google.com") {
      ok("summary totals, daily buckets, top paths and referrer hosts are correct");
    } else {
      fail("summary shape", JSON.stringify(d));
    }
  } else {
    fail("traffic summary request", `status ${res.status}`);
  }
}

{
  const res = await fetch(`${base}/pageviews/traffic`);
  if (res.status === 401 || res.status === 403) ok("blocks anonymous access to the summary"); else fail("summary requires auth", `status ${res.status}`);
}

{
  // a non-admin signed-in user must not read traffic data either
  await User.create({
    name: "Shopper", email: "shopper@test.local",
    password: "shopper-pass-123", role: "customer", isEmailVerified: true,
  });
  const cookie = await login("shopper@test.local", "shopper-pass-123");
  const res = await fetch(`${base}/pageviews/traffic`, { headers: { cookie } });
  if (res.status === 401 || res.status === 403) ok("blocks non-admin users from the summary"); else fail("summary admin-only", `status ${res.status}`);
}

{
  const res = await fetch(`${base}/pageviews/traffic?days=999`, { headers: { cookie: adminCookie } });
  if (res.status === 422) ok("rejects an out-of-range window (422)"); else fail("window bounds", `status ${res.status}`);
}

{
  // traffic window filter: only events inside the window count
  const res = await fetch(`${base}/pageviews/traffic?days=1`, { headers: { cookie: adminCookie } });
  const json = await res.json();
  if (res.status === 200 && json.data.totals.views === 3) ok("1-day window still contains today's three test views"); else fail("window filter", `status ${res.status}`);
}

server.close();
await mem.stop();
await mongoose.disconnect();

console.log(`\n${failed === 0 ? "✅" : "❌"} traffic: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
