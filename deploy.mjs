// AKUMA deploy via Vercel API (local only, never committed)
// Uses the JSON inline-files deployment format — no deps, Node 22.
import fs from "fs";
import path from "path";

const handoff = "C:/Users/vipin Pant/Downloads/handoff.md";
const token = fs.readFileSync(handoff, "utf8").match(/vcp_[A-Za-z0-9]+/)[0];

const dist = "void-studios/dist";
const files = [];
(function walk(dir, base) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, e.name);
    const rel = base ? base + "/" + e.name : e.name;
    if (e.isDirectory()) walk(abs, rel);
    else files.push({ rel, abs });
  }
})(dist, "");
console.log("files:", files.length);

const body = {
  name: "akuma",
  target: "production",
  files: files.map((f) => ({
    file: "/" + f.rel,
    data: fs.readFileSync(f.abs).toString("base64"),
    encoding: "base64",
  })),
  // static routes config (dist files are uploaded as-is; vercel.json isn't read
  // for inline-file deploys, so the rewrites live here)
  rewrites: [
    { source: "/api/v1/(.*)", destination: "https://punk-59vj.onrender.com/api/v1/$1" },
    { source: "/(.*)", destination: "/index.html" },
  ],
};

const res = await fetch(
  "https://api.vercel.com/v13/deployments?skipAutoDetectionConfirmation=1",
  {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }
);
const created = await res.json();
if (created.error) throw new Error("create: " + JSON.stringify(created.error));
const dplId = created.id;
console.log("deployment created:", dplId, created.url || "");

let ready = false;
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 3000));
  const d = await (await fetch(`https://api.vercel.com/v13/deployments/${dplId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })).json();
  if (d.readyState === "READY") { ready = true; break; }
  if (d.readyState === "ERROR") throw new Error("deploy ERROR: " + d.errorMessage);
  process.stdout.write(".");
}
if (!ready) throw new Error("timeout waiting for READY");
console.log("\nREADY");

for (const domain of ["punkstudios.vercel.app", "akuma-store.vercel.app"]) {
  const a = await (await fetch(
    `https://api.vercel.com/v2/deployments/${dplId}/aliases`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ alias: domain }),
    }
  )).json();
  console.log("alias", domain, a.error ? JSON.stringify(a.error) : "OK");
}
console.log("DONE -> https://punkstudios.vercel.app + https://akuma-store.vercel.app");
