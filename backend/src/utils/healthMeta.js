/**
 * Injects deploy visibility into /api/v1/health.
 *
 * Why: the deployed Railway service has twice shipped stale code while
 * "redeploys" looked green (merge landed, deploy didn't rebuild). Adding the
 * git commit + boot time to /health makes staleness detectable from a single
 * curl, instead of only noticing when an admin route 404s.
 *
 * Rendered in src/app.js; reads what env.js exposes (RENDER_GIT_COMMIT,
 * RAILWAY_GIT_COMMIT_SHA, or VERCEL_GIT_COMMIT_SHA — set by the platforms).
 */

/**
 * Adds `data.commit` and `data.bootedAt` to the health payload.
 * @param {import("express").Express} app
 */
export function attachHealthMeta(app) {
  const commit =
    process.env.RENDER_GIT_COMMIT ||
    process.env.RAILWAY_GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.COMMIT_SHA ||
    null;

  const bootedAt = new Date().toISOString();

  // Mail transport visibility: "activation/reset mail never arrives" is
  // undiagnosable from the outside. This shows which transport is active
  // and whether its vars actually reached the process (naming typos, vars
  // on the wrong service, stale deploy) without leaking any secret.
  const maskUser = (u) => (u ? u.replace(/^(.{2}).*?(@.*)$/, "$1***$2") : null);
  const smtp = {
    transport: process.env.BREVO_API_KEY ? "brevo-http" : "smtp",
    brevoConfigured: Boolean(process.env.BREVO_API_KEY),
    brevoSender: process.env.BREVO_SENDER_EMAIL || process.env.SMTP_FROM || null,
    configured: Boolean(
      process.env.BREVO_API_KEY || (process.env.SMTP_HOST && process.env.SMTP_USER)
    ),
    host: process.env.SMTP_HOST || null,
    port: process.env.BREVO_API_KEY ? 443 : Number(process.env.SMTP_PORT || 587),
    user: maskUser(process.env.SMTP_USER),
    from: process.env.BREVO_SENDER_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER || null,
  };

  app.get("/api/v1/health", (_req, res) => {
    res.json({
      success: true,
      message: "API is up",
      data: {
        commit: commit ? commit.slice(0, 7) : "unknown",
        bootedAt,
        smtp,
        frontendUrl: process.env.FRONTEND_URL || null,
      },
    });
  });
}
