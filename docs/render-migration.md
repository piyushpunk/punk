# Migrating the API from Railway → Render

> **✅ DONE — Sep 2026.** The API now lives at `https://punk-59vj.onrender.com`
> (verified: `/health` returns current commit + SMTP configured). The frontend
> rewrite points there (`void-studios/vercel.json` + `deploy.mjs`), and
> `backend/railway.json` has been deleted. See `docs/infra.md` for the current
> setup. The rest of this doc is kept for reference.

The backend (`backend/`) is fully portable — it reads only standard env vars
(`PORT`, `MONGODB_URI`, secrets) and has a health endpoint at
`/api/v1/health`, which is what Render's health checks need. Nothing in the
code was Railway-specific, so this is a config + dashboard job.

`backend/render.yaml` (Render Blueprint) encodes everything below except
secrets, so you can either follow the dashboard steps or let the blueprint
pre-fill most fields.

---

## 1. One-time: create the service

1. Push this branch so Render can see `backend/render.yaml`.
2. In Render: **New → Blueprint**, pick this repo and the
   `feature/ecommerce-backend` branch. Render detects `backend/render.yaml`
   and shows one web service: `punk-api`.
3. In the pre-apply screen, fill in the `sync: false` values (they are
   dashboard-only, never committed):

   | Env var | Value |
   |---|---|
   | `MONGODB_URI` | Same Atlas URI you used on Railway (Render → MongoDB Atlas outbound IPs are fine — see step 4) |
   | `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET` | Copy from Railway (or rotate — nothing else stores them) |
   | `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Copy from Railway |
   | `RAZORPAY_*` | Copy from Railway (optional) |
   | `SMTP_*` | Copy from Railway (optional) |
   | `CORS_ORIGIN` | `https://punkstudios.vercel.app` (comma-separate for multiple origins) |
   | `FRONTEND_URL` | `https://punkstudios.vercel.app` (password-reset links) |

4. **MongoDB Atlas allow-list:** Atlas blocks unknown outbound IPs. Render
   egress IPs are not fixed per-service, so either:
   - allow `0.0.0.0/0` in Atlas Network Access (common with free Atlas; the
     URI credential is the real gate), or
   - upgrade Atlas and add Render's static outbound IPs (paid feature).
   Railway had the same constraint — if it already says `0.0.0.0/0`, nothing
   to do.

5. Apply. First deploy runs `npm ci` then `npm start`, and Render calls
   `GET /api/v1/health` to confirm the service is live.

## 2. Point the frontend at Render

1. Render dashboard → `punk-api` → copy the service URL, e.g.
   `https://punk-api.onrender.com`.
2. Vercel (or wherever the storefront lives) → Environment Variables:
   `VITE_API_URL=https://punk-api.onrender.com/api/v1`
3. Redeploy the frontend (Vite bakes env vars in at build time).
4. Sanity checks from your browser or curl:
   - `GET https://punk-api.onrender.com/api/v1/health` →
     `{"success":true,"message":"API is up",...}`
   - Log in on the site — JWT cookies flow cross-site because they're already
     `Secure; SameSite=None` in production (`backend/src/constants.js`).

## 3. Cut over, then decommission Railway

1. Verify storefront checkout + login work against Render.
2. In Railway, stop the API service (or delete the project) once you're
   confident. Keep nothing pinned to Railway — nothing in the repo does.
3. Optional cleanup in the repo: delete `backend/railway.json` once you no
   longer want it around.

---

## Notes & gotchas

- **Free tier spin-down.** The free plan sleeps after ~15 min idle; the next
  request takes ~30–60s to wake the service. Upgrade to a paid plan for
  always-on. If you stay on free, a free uptime pinger hitting `/api/v1/health`
  every 5–10 min keeps it warm.
- **`PORT` is injected** by Render automatically; `backend/index.js` already
  reads it.
- **`NODE_VERSION` is pinned** to 20.18.1 in `render.yaml`; bump it there, not
  in the dashboard.
- **Cookies:** production already forces `Secure; SameSite=None`, which is
  required for the Vercel → Render cross-site setup. Only if you later serve
  both from one domain, set `COOKIE_SAMESITE=lax`.
- **Webhooks (Razorpay):** update the webhook URL in the Razorpay dashboard
  from the Railway URL to `https://<your-service>.onrender.com/api/v1/payments/webhook`.
- **Root directory:** the blueprint sets `rootDir: backend`, so Render only
  watches/rebuilds for changes under `backend/` — frontend pushes won't
  trigger backend deploys.
