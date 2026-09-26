export const DB_NAME = "void-studios";

// ─── Enums (mirrored in zod validators — single source of truth) ─────────────
export const UserRole = ["customer", "admin"];

export const OrderStatus = [
  "pending_payment",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

export const PaymentStatus = [
  "created",
  "authorized",
  "captured",
  "failed",
  "refunded",
];

export const CouponType = ["flat", "percentage"];

export const InventoryChangeType = ["order", "restock", "adjustment"];

/**
 * Legal order-status transitions, enforced by Order.transitionTo().
 * Anything not listed here is rejected with 400.
 */
export const LEGAL_ORDER_TRANSITIONS = {
  pending_payment: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped"],
  shipped: ["delivered"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

// Customer can cancel only before the warehouse starts moving the order.
export const CUSTOMER_CANCELLABLE_STATUSES = ["pending_payment", "confirmed"];

// ─── Business rules ──────────────────────────────────────────────────────────
export const FREE_SHIPPING_THRESHOLD = 999; // in currency units, post-discount
export const SHIPPING_FEE = 49;

// ─── Auth cookies ────────────────────────────────────────────────────────────
// Production default is `sameSite: "none"` (+ secure, forced below) because the
// frontend (Vercel) and backend (Railway/Render) live on different sites —
// "strict"/"lax" cookies are never sent on cross-site fetches, which would
// silently break login. Set COOKIE_SAMESITE=lax if both share one site later.
const sameSite =
  process.env.COOKIE_SAMESITE ||
  (process.env.NODE_ENV === "production" ? "none" : "strict");

export const COOKIE_OPTIONS = {
  httpOnly: true,
  // Cross-site cookies REQUIRE Secure; localhost dev sends over http.
  secure: process.env.NODE_ENV === "production" || sameSite === "none",
  sameSite,
};

export const PASSWORD_RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

// Activation link lifetime — long enough for a slow inbox, short enough to
// be safe (a fresh link can be resent any time from the verify page).
export const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
