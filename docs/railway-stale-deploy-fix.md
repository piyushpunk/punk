# Railway stale deploy — forgot-password email not sending

## Symptom

- "Forgot password" on the live site says "link sent" but **no email ever arrives**.
- Uploads may also 500 (`EACCES`) — same root cause.

## Diagnosis (one curl)

```bash
curl -s https://punk-production-7266.up.railway.app/api/v1/health
```

Current live output:

```json
{ "commit": "7b27270", "bootedAt": "2026-09-23T12:30:21.567Z" }
```

`7b27270` is **6 commits behind** `main` (which is at `551488e`+). The missing
commits include:

- `1bbdabb` — SMTP diagnostics: `/health` shows `smtp.configured`,
  `smtp.host`, `smtp.user`, `smtp.from` (masked). Without this commit there is
  **no way to see from the outside whether the SMTP env vars even reached the
  process**.
- `2726fba` — fixes the 500 `EACCES` on uploads.

Note the live `/health` has **no `smtp` field at all** — it's the old code.
That is why we can't yet tell whether SMTP vars are set on the service.

## Why forgot-password silently "succeeds"

The endpoint always answers 200 with "link sent" (by design — it never leaks
whether the email is registered). The mail itself is only sent when:

1. `SMTP_HOST` and `SMTP_USER` are set on the **deployed service**, AND
2. `SMTP_PASS` is valid, AND
3. the deploy is fresh enough to have the working mailer.

The old deployed code logs `📧 [email] SMTP not configured — suppressed mail`
to **server logs only**; the user never sees why. Until the rebuild lands we
are blind.

## Fix — force a genuine rebuild on Railway

A "Success" deploy that serves old code usually means the deployment is
pinned to a stale build (or the domain points at an old deployment).

Do this in the Railway dashboard (service: the backend API):

1. **Check the deployment list** (Deployments tab). Find the deployment that
   is actually serving traffic. If its commit is `7b27270`, it's stale.
2. **Delete/pin-fix**: if an older deployment is pinned (three-dot menu →
   "Pin deployment"), unpin it so the domain serves the latest.
3. **Check the watch paths / root directory**: the service must watch
   `backend/` and build from `backend/` (Railway settings → "Root Directory"
   or `railway.json` which sets `npm ci --omit=dev` + `npm start`).
4. **Trigger a redeploy of the latest commit**: Deployments → Deploy (or
   three-dot on the latest failed/successful one → "Redeploy"). If Railway
   caches, use **"Clear build cache & deploy"** (three-dot menu on the
   deploy button).
5. While you're in **Variables**, verify these exist on THIS service (not
   another one):
   - `MONGODB_URI`
   - `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`
   - `CORS_ORIGIN=https://punkstudios.vercel.app`
   - `FRONTEND_URL=https://punkstudios.vercel.app` ← password-reset links
     point here; if missing, reset links default to localhost and are useless
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
     (Gmail: `smtp.gmail.com`, port 587, user = full gmail address,
     pass = 16-char App Password — normal passwords are rejected)
6. Redeploy, then re-run the health curl above. You should see:
   - a **new commit hash** (`551488e`+), and
   - a `smtp` block like `{ "configured": true, "host": "smtp.gmail.com",
     "user": "ak***@gmail.com", ... }`.

## Verify email actually sends

```bash
curl -s -X POST https://punk-production-7266.up.railway.app/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"<a real registered email>"}'
```

Then check the inbox (and spam). Railway logs will show either
`📧 Email sent to ...` or a precise failure (`auth`, `timeout`, `535`, ...).

## If Railway still refuses to rebuild

`docs/render-migration.md` documents a full migration path to Render
(`backend/render.yaml` blueprint, env var table, Atlas IP notes). Render
deploys from the repo root with clear build logs and no stale-deploy history.
