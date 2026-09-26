import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";
import {
  apiLimiter,
  authLimiter,
  emailLimiter,
  writeLimiter,
} from "./middlewares/rateLimiter.middleware.js";

const app = express();

// Railway/Render terminate TLS in front of the app — trust the proxy chain so
// express-rate-limit keys on the real client IP from X-Forwarded-For, not the
// proxy IP (which would rate-limit everyone as one user).
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // allow product images cross-origin
  })
);

app.use(
  cors({
    // Comma-separated allow-list in production (e.g. the Vercel frontend);
    // unset/true in dev so curl, Postman and mobile clients all work.
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
      : true,
    credentials: true, // JWT cookies
  })
);

app.use(express.json({
  limit: "16kb",
  // Razorpay signs the RAW body — capture it on every json request (cheap),
  // so the webhook controller can verify the HMAC over the exact bytes sent.
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Tiny health endpoint for uptime checks — also exposes the deployed commit
// and boot time, so a stale deploy is detectable with a single curl.
import { attachHealthMeta } from "./utils/healthMeta.js";
attachHealthMeta(app);

// ─── API v1 routers (rate-limited) ──────────────────────────────────────────────────────────
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import categoryRouter from "./routes/category.routes.js";
import brandRouter from "./routes/brand.routes.js";
import productRouter from "./routes/product.routes.js";
import cartRouter from "./routes/cart.routes.js";
import wishlistRouter from "./routes/wishlist.routes.js";
import couponRouter from "./routes/coupon.routes.js";
import orderRouter from "./routes/order.routes.js";
import paymentRouter from "./routes/payment.routes.js";
import reviewRouter from "./routes/review.routes.js";
import inventoryRouter from "./routes/inventory.routes.js";

// Global flood guard first — every /api/v1 call counts against 300/min.
app.use("/api/v1", apiLimiter);

// Email-sending endpoints: strictest tier (mail-bombing guard). Mounted on
// the router path BEFORE authRouter so they win over the auth limiter.
app.use("/api/v1/auth/register", emailLimiter);
app.use("/api/v1/auth/forgot-password", emailLimiter);
app.use("/api/v1/auth/resend-verification", emailLimiter);

// Brute-force guard on the whole auth surface (login included).
app.use("/api/v1/auth", authLimiter);

// Scripted-spam guard on shopper write endpoints.
app.use(["/api/v1/cart", "/api/v1/wishlist", "/api/v1/orders", "/api/v1/reviews"], writeLimiter);

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/categories", categoryRouter);
app.use("/api/v1/brands", brandRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/cart", cartRouter);
app.use("/api/v1/wishlist", wishlistRouter);
app.use("/api/v1/coupons", couponRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/admin/inventory", inventoryRouter);

// 404 for unknown API routes — a JSON response, not an HTML error page.
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found", data: null });
});

// Global error handler must be registered LAST.
app.use(errorHandler);

export { app };
