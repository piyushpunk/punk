# ── AKUMA API — backend health/data provenance ───────────────
# Backend: Render (https://punk-59vj.onrender.com) — blueprint in backend/render.yaml
# Frontend: Vercel (https://punkstudios.vercel.app) — deploy.mjs / Vercel dashboard
# Cron: Render Cron Job for scheduled tasks (owner-managed in Render dashboard)
#
# This file records the live infrastructure as of Sep 2026 (Railway retired).

FRONTEND=https://punkstudios.vercel.app
API=https://punk-59vj.onrender.com
API_HEALTH=https://punk-59vj.onrender.com/api/v1/health

# Rewrites: /api/v1/* → API (configured in void-studios/vercel.json AND deploy.mjs)
# Keep both in sync — vercel.json is read by Vercel dashboard deploys,
# deploy.mjs re-declares rewrites for inline-file API deploys.

# Render env vars that must stay set on the service (dashboard, sync:false):
#   MONGODB_URI, ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET,
#   CLOUDINARY_*, RAZORPAY_* (optional), SMTP_* (verified configured),
#   CORS_ORIGIN=https://punkstudios.vercel.app,
#   FRONTEND_URL=https://punkstudios.vercel.app

# Verify any time:
#   curl https://punk-59vj.onrender.com/api/v1/health
# → {"commit":"<git sha>","smtp":{"configured":true,...},"frontendUrl":"..."}
