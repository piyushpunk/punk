import rateLimit from "express-rate-limit";

/**
 * Rate limiters — protect the API from brute force and mail-bombing abuse.
 *
 * All limiters key on IP (behind Railway/Render's proxy, `express-rate-limit`
 * v7+ reads X-Forwarded-For correctly when trust proxy is set in app.js).
 * Limits are per-window; a 429 with Retry-After is returned when exceeded.
 *
 * NODE_ENV !== 'production' multiplies every limit by 20 so the smoke suite
 * (which fires hundreds of requests from one IP) still passes while prod
 * keeps the real ceilings.
 */
const MULT = process.env.NODE_ENV === "production" ? 1 : 20;

const jsonHandler = (_req, res) => {
  res.status(429).json({
    success: false,
    message: "Too many requests — slow down and try again shortly.",
    data: null,
  });
};

/**
 * Global API limiter — generous ceiling against floods, far above any real
 * browsing pattern (a product grid page makes ~2-3 calls).
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300 * MULT,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonHandler,
});

/**
 * Auth limiter — login/register/refresh. Tight enough to make password
 * guessing impractical (60 attempts/hour/IP ≈ 1/minute sustained) without
 * touching normal users.
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60 * MULT,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonHandler,
});

/**
 * Email limiter — forgot-password, resend-verification, register (which
 * sends mail). Strictest tier: each request can trigger an outbound email,
 * so this is the mail-bombing guard. 5 per hour per IP; genuine users who
 * mistype an email once or twice are nowhere near this.
 */
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5 * MULT,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many email requests — try again in an hour.",
      data: null,
    });
  },
});

/**
 * Cart/write limiter — mutation endpoints cart/wishlist/order. Blocks
 * scripted spam while allowing a fast human shopper (burst 30/min).
 */
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30 * MULT,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: jsonHandler,
});
