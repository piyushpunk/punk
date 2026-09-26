/**
 * End-to-end smoke test for the whole API.
 *
 * Boots the REAL Express app against an in-memory MongoDB replica set
 * (mongodb-memory-server) so REAL multi-document transactions are exercised:
 * the checkout transaction, atomic stock decrements, concurrent oversell
 * protection, cookie auth, and every route group.
 *
 *   node scripts/smoke-test.mjs
 *
 * Exits 0 when every check passes; prints FAILED lines and exits 1 otherwise.
 * Requires `mongodb-memory-server` — install with:
 *   npm i -D mongodb-memory-server
 */
import assert from "node:assert/strict";
process.env.NODE_ENV = "test";
process.env.ACCESS_TOKEN_SECRET = "test-access-secret";
process.env.REFRESH_TOKEN_SECRET = "test-refresh-secret";

// dotenv must not override the values above if a .env exists — load it first.
try {
  await import("dotenv/config");
} catch { /* no .env present is fine */ }

const { MongoMemoryReplSet } = await import("mongodb-memory-server");

const mem = await MongoMemoryReplSet.create({
  replSet: { count: 1, storageEngine: "wiredTiger" }, // replica set = transactions supported
});
const uri = mem.getUri("void-studios-test");
process.env.MONGODB_URI = uri;

// Boot the real app + models AFTER the in-memory DB is up.
const mongoose = (await import("mongoose")).default;
await mongoose.connect(uri, { dbName: "void-studios-test" });

const { app } = await import("../src/app.js");
const { User } = await import("../src/models/user.model.js");
const { Product } = await import("../src/models/product.model.js");

const server = app.listen(0); // random free port
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

// Activation links are emitted into the console when SMTP is unconfigured
// (NODE_ENV=test → mail suppressed path logs the full text). Capture them so
// the auth suite can complete the register → verify → login flow.
const capturedVerifyTokens = [];
{
  const origLog = console.log.bind(console);
  console.log = (...args) => {
    const line = args.join(" ");
    const m = line.match(/verify-email\?token=([a-f0-9]+)/);
    if (m) capturedVerifyTokens.push(m[1]);
    origLog(...args);
  };
}

// ─── Tiny fetch helpers (cookie-jar aware) ──────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

async function call(method, path, { body, cookies, expect } = {}) {
  const headers = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  const jar = cookies;
  if (jar) headers.cookie = jar;

  const res = await fetch(base + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let json = null;
  try {
    json = await res.json();
  } catch { /* non-json */ }

  if (expect !== undefined) {
    const ok = res.status === expect;
    if (ok) passed += 1;
    else {
      failed += 1;
      const line = `FAILED ${method} ${path} → expected ${expect}, got ${res.status}: ${JSON.stringify(json)}`;
      failures.push(line);
      console.log(line);
    }
  }
  return { status: res.status, body: json, headers: res.headers };
}

function collectCookies(res) {
  const raw = res.headers.getSetCookie?.() || [];
  return raw.map((c) => c.split(";")[0]).join("; ");
}

// ─── 1. Health + 404 ─────────────────────────────────────────────────────────
await call("GET", "/api/v1/health", { expect: 200 });
await call("GET", "/api/v1/nope", { expect: 404 });

// ─── 2. Auth ─────────────────────────────────────────────────────────────────
// Register no longer logs the user in — it issues an activation email and the
// account stays locked until /auth/verify-email?token=… is used.
const regRes = await call("POST", "/api/v1/auth/register", {
  body: { name: "Test User", email: "user@test.com", password: "password123" },
  expect: 201,
});
assert.ok(regRes.body.message.includes("Account created"), "register returns activation message");
passed += 1;

// Unverified login must be blocked with 403 + EMAIL_NOT_VERIFIED code.
const unverifiedLogin = await call("POST", "/api/v1/auth/login", {
  body: { email: "user@test.com", password: "password123" },
  expect: 403,
});
assert.equal(unverifiedLogin.body.code, "EMAIL_NOT_VERIFIED", "login blocked before activation");
passed += 1;

// Resend keeps the same no-leak envelope.
await call("POST", "/api/v1/auth/resend-verification", {
  body: { email: "user@test.com" },
  expect: 200,
});

// Activate using the token captured from the suppressed-mail log output.
const verifyToken = capturedVerifyTokens.at(-1);
assert.ok(verifyToken, "activation token captured from mail output");
const verifyRes = await call("GET", `/api/v1/auth/verify-email?token=${verifyToken}`, { expect: 200 });
assert.equal(verifyRes.body.message, "Account activated — you can log in now", "verify-email activates");
passed += 1;

// Token is single-use — replay must fail.
await call("GET", `/api/v1/auth/verify-email?token=${verifyToken}`, { expect: 400 });
passed += 1;

await call("POST", "/api/v1/auth/register", {
  body: { name: "Dup", email: "user@test.com", password: "password123" },
  expect: 409,
});

await call("POST", "/api/v1/auth/register", {
  body: { name: "X", email: "bad", password: "short" },
  expect: 422,
});

// Activated account can log in and get cookies.
const loginRes = await call("POST", "/api/v1/auth/login", {
  body: { email: "user@test.com", password: "password123" },
  expect: 200,
});
let userCookies = collectCookies(loginRes);
assert.ok(userCookies.includes("accessToken"), "login sets access cookie");
passed += 1;

await call("POST", "/api/v1/auth/login", {
  body: { email: "user@test.com", password: "wrong-password" },
  expect: 401,
});

// ─── Admin user (promote directly through the model) ─────────────────────────
// isEmailVerified: true — model-created users bypass the register flow, so
// without this the activation gate would lock the admin out of the suite.
const adminUser = await User.create({
  name: "Admin",
  email: "admin@test.com",
  password: "adminpass123",
  role: "admin",
  isEmailVerified: true,
});
const adminLogin = await call("POST", "/api/v1/auth/login", {
  body: { email: "admin@test.com", password: "adminpass123" },
  expect: 200,
});
const adminCookies = collectCookies(adminLogin);

// ─── 3. Profile + addresses ──────────────────────────────────────────────────
const meRes = await call("GET", "/api/v1/users/me", { cookies: userCookies, expect: 200 });
assert.equal(meRes.body.data.user.email, "user@test.com");
passed += 1;

await call("PATCH", "/api/v1/users/me", {
  cookies: userCookies,
  body: { name: "Updated Name", phone: "9876543210" },
  expect: 200,
});

const addrRes = await call("POST", "/api/v1/users/me/addresses", {
  cookies: userCookies,
  body: { line1: "12 MG Road", city: "Bengaluru", state: "Karnataka", pincode: "560001", isDefault: true },
  expect: 201,
});
const addressId = addrRes.body.data.addressId;
assert.ok(addressId, "address created");
passed += 1;

await call("POST", "/api/v1/users/me/addresses", {
  cookies: userCookies,
  body: { line1: "x", city: "c", state: "s", pincode: "12" },
  expect: 422, // bad pincode
});

await call("PATCH", "/api/v1/users/me/password", {
  cookies: userCookies,
  body: { oldPassword: "wrong", newPassword: "newpassword123" },
  expect: 401,
});

await call("PATCH", "/api/v1/users/me/password", {
  cookies: userCookies,
  body: { oldPassword: "password123", newPassword: "newpassword123" },
  expect: 200,
});

// changePassword revokes sessions — log back in for the rest of the suite.
const reloginRes = await call("POST", "/api/v1/auth/login", {
  body: { email: "user@test.com", password: "newpassword123" },
  expect: 200,
});
userCookies = collectCookies(reloginRes);

// ─── 4. Catalog: categories, brands, products (admin) ────────────────────────
await call("GET", "/api/v1/categories", { expect: 200 });

await call("POST", "/api/v1/categories", {
  cookies: adminCookies,
  body: { name: "Men" },
  expect: 201,
});
await call("POST", "/api/v1/categories", { cookies: userCookies, body: { name: "Nope" }, expect: 403 });

const menCat = (await call("GET", "/api/v1/categories")).body.data.tree[0];
const catId = menCat._id;

const kidRes = await call("POST", "/api/v1/categories", {
  cookies: adminCookies,
  body: { name: "Shirts", parentCategory: catId },
  expect: 201,
});
const kidCatId = kidRes.body.data.category._id;

const tree = (await call("GET", "/api/v1/categories")).body.data.tree;
assert.equal(tree[0].children.length, 1, "tree nests children");
passed += 1;

await call("POST", "/api/v1/brands", { cookies: adminCookies, body: { name: "Void Studios" }, expect: 201 });
const brandId = (await call("GET", "/api/v1/brands")).body.data.brands[0]._id;

const prodRes = await call("POST", "/api/v1/products", {
  cookies: adminCookies,
  body: {
    name: "Oxford Shirt",
    description: "Slim fit cotton oxford",
    category: kidCatId,
    brand: brandId,
    basePrice: 1499,
    variants: [
      { size: "M", color: "Navy", stock: 5 },
      { size: "L", color: "Navy", stock: 2 },
      { size: "XL", color: "Navy", stock: 1 },
    ],
  },
  expect: 201,
});
const productId = prodRes.body.data.product._id;
assert.ok(prodRes.body.data.product.variants.every((v) => v.sku), "skus auto-generated");
passed += 1;

const skus = prodRes.body.data.product.variants.map((v) => ({ sku: v.sku, size: v.size }));
const skuM = skus.find((s) => s.size === "M").sku;
const skuL = skus.find((s) => s.size === "L").sku;

const slug = prodRes.body.data.product.slug;
await call("GET", `/api/v1/products/${slug}`, { expect: 200 });
await call("GET", "/api/v1/products?category=shirts&size=M&sort=price-asc", { expect: 200 });
await call("GET", `/api/v1/products/${productId}/related`, { expect: 200 });

// Search filter hits
const searchRes = await call("GET", "/api/v1/products?search=oxford");
assert.equal(searchRes.body.data.products.length, 1);
passed += 1;

// Variant replacement keeps stock on matching SKUs
await call("PATCH", `/api/v1/products/${productId}`, {
  cookies: adminCookies,
  body: {
    basePrice: 1599,
    variants: [
      { sku: skuM, size: "M", color: "Navy", stock: 7 },
      { sku: skuL, size: "L", color: "Navy", stock: 2 },
    ],
  },
  expect: 200,
});
const afterUpdate = await Product.findById(productId);
assert.equal(afterUpdate.variants.length, 2, "variant not in payload was dropped (XL)");
assert.equal(afterUpdate.findVariant(skuM).stock, 7, "variant stock kept on update");
assert.equal(afterUpdate.findVariant(skuL).stock, 2, "kept variant preserves stock");
passed += 1;

// ─── 5. Cart ─────────────────────────────────────────────────────────────────
await call("GET", "/api/v1/cart", { cookies: userCookies, expect: 200 });
await call("POST", "/api/v1/cart/items", {
  cookies: userCookies,
  body: { productId, sku: skuM, quantity: 2 },
  expect: 201,
});
await call("POST", "/api/v1/cart/items", {
  cookies: userCookies,
  body: { productId, sku: skuM, quantity: 99 },
  expect: 409, // over stock
});
await call("PATCH", `/api/v1/cart/items/${skuM}`, {
  cookies: userCookies,
  body: { quantity: 3 },
  expect: 200,
});
const cartView = await call("GET", "/api/v1/cart", { cookies: userCookies });
assert.equal(cartView.body.data.cart[0].quantity, 3);
assert.equal(cartView.body.data.totals.subtotal, 4797); // 3 × 1599
passed += 1;

// ─── 6. Wishlist ─────────────────────────────────────────────────────────────
await call("POST", `/api/v1/wishlist/${productId}`, { cookies: userCookies, expect: 200 });
const wl = await call("GET", "/api/v1/wishlist", { cookies: userCookies });
assert.equal(wl.body.data.wishlist.length, 1);
passed += 1;
await call("DELETE", `/api/v1/wishlist/${productId}`, { cookies: userCookies, expect: 200 });

// ─── 7. Coupons ──────────────────────────────────────────────────────────────
await call("POST", "/api/v1/coupons", {
  cookies: adminCookies,
  body: {
    code: "SAVE100",
    discountType: "flat",
    discountValue: 100,
    minOrderValue: 500,
    expiryDate: "2099-01-01T00:00:00.000Z",
    usageLimit: 2,
  },
  expect: 201,
});
const valRes = await call("POST", "/api/v1/coupons/validate", {
  cookies: userCookies,
  body: { code: "SAVE100" },
  expect: 200,
});
assert.equal(valRes.body.data.discount, 100);
passed += 1;

await call("POST", "/api/v1/coupons/validate", {
  cookies: userCookies,
  body: { code: "SAVE100", cartTotal: 100 },
  expect: 400, // below minOrderValue
});

// ─── 8. Checkout (transaction) + stock decrement ─────────────────────────────
const stockBefore = (await Product.findById(productId)).findVariant(skuM).stock; // 7
const checkoutRes = await call("POST", "/api/v1/orders/checkout", {
  cookies: userCookies,
  body: { addressId, couponCode: "SAVE100" },
  expect: 201,
});
const order = checkoutRes.body.data.order;
assert.equal(order.currentStatus, "pending_payment");
assert.equal(order.subtotal, 4797);
assert.equal(order.discount, 100);
assert.equal(order.total, 4697); // free shipping ≥ 999
passed += 1;

const stockAfter = (await Product.findById(productId)).findVariant(skuM).stock;
assert.equal(stockAfter, stockBefore - 3, "stock decremented atomically");
passed += 1;

const cartAfterCheckout = await call("GET", "/api/v1/cart", { cookies: userCookies });
assert.equal(cartAfterCheckout.body.data.cart.length, 0, "cart cleared after checkout");
passed += 1;

await call("GET", "/api/v1/orders/me", { cookies: userCookies, expect: 200 });
await call("GET", `/api/v1/orders/${order._id}`, { cookies: userCookies, expect: 200 });

// Other user cannot read this order — this one activates properly through
// the email flow (token captured from the suppressed-mail log).
const user2RegCookiesBefore = capturedVerifyTokens.length;
await call("POST", "/api/v1/auth/register", {
  body: { name: "Second", email: "user2@test.com", password: "password123" },
  expect: 201,
});
await call("GET", `/api/v1/auth/verify-email?token=${capturedVerifyTokens.at(-1)}`, { expect: 200 });
const user2Login = await call("POST", "/api/v1/auth/login", {
  body: { email: "user2@test.com", password: "password123" },
  expect: 200,
});
const user2Cookies = collectCookies(user2Login);
await call("GET", `/api/v1/orders/${order._id}`, { cookies: user2Cookies, expect: 403 });

// Admin order flows
await call("GET", "/api/v1/orders/admin/all", { cookies: adminCookies, expect: 200 });
await call("PATCH", `/api/v1/orders/admin/${order._id}/status`, {
  cookies: adminCookies,
  body: { status: "processing" },
  expect: 400, // illegal: pending_payment → processing
});
await call("PATCH", `/api/v1/orders/admin/${order._id}/status`, {
  cookies: adminCookies,
  body: { status: "confirmed", note: "Payment received (manual)" },
  expect: 200,
});
await call("PATCH", `/api/v1/orders/admin/${order._id}/status`, {
  cookies: adminCookies,
  body: { status: "processing" },
  expect: 200,
});

// ─── 9. Concurrent oversell protection (the crown jewel) ─────────────────────
// skuL has stock 2. Two users race to buy 2 units each — exactly one wins.
await User.create({ name: "Third", email: "user3@test.com", password: "password123", isEmailVerified: true });
await call("POST", "/api/v1/users/me/addresses", {
  cookies: user2Cookies,
  body: { line1: "9 Park St", city: "Mumbai", state: "MH", pincode: "400001" },
  expect: 201,
});
const addr2 = (
  await call("GET", "/api/v1/users/me", { cookies: user2Cookies })
).body.data.user.addresses[0]._id;

await call("POST", "/api/v1/cart/items", {
  cookies: user2Cookies,
  body: { productId, sku: skuL, quantity: 2 },
  expect: 201,
});
await call("POST", "/api/v1/cart/items", {
  cookies: user2Cookies,
  body: { productId, sku: skuM, quantity: 1 },
  expect: 201,
});
// Give user3 the same race setup
const u3Login = await call("POST", "/api/v1/auth/login", {
  body: { email: "user3@test.com", password: "password123" },
  expect: 200,
});
const user3Cookies = collectCookies(u3Login);
await call("POST", "/api/v1/users/me/addresses", {
  cookies: user3Cookies,
  body: { line1: "1 Beach Rd", city: "Goa", state: "GA", pincode: "403001" },
  expect: 201,
});
const addr3 = (
  await call("GET", "/api/v1/users/me", { cookies: user3Cookies })
).body.data.user.addresses[0]._id;
await call("POST", "/api/v1/cart/items", {
  cookies: user3Cookies,
  body: { productId, sku: skuL, quantity: 2 },
  expect: 201,
});

// Remove the skuM line from user2's cart so the race is purely skuL.
const u2CartView = await call("GET", "/api/v1/cart", { cookies: user2Cookies });
const skuMLine = u2CartView.body.data.cart.find((it) => it.sku === skuM);
if (skuMLine) {
  await call("DELETE", `/api/v1/cart/items/${skuM}`, { cookies: user2Cookies, expect: 200 });
}

const [raceA, raceB] = await Promise.all([
  call("POST", "/api/v1/orders/checkout", { cookies: user2Cookies, body: { addressId: addr2 } }),
  call("POST", "/api/v1/orders/checkout", { cookies: user3Cookies, body: { addressId: addr3 } }),
]);

const statuses = [raceA.status, raceB.status].sort();
assert.deepEqual(statuses, [201, 409], `exactly one checkout wins the last stock (got ${statuses})`);
passed += 1;

const finalStock = (await Product.findById(productId)).findVariant(skuL).stock;
assert.equal(finalStock, 0, "stock never goes negative");
passed += 1;

const loser = raceA.status === 409 ? raceA : raceB;
const winner = raceA.status === 201 ? raceA : raceB;
assert.ok(loser.body.message.toLowerCase().includes("stock"), "loser gets a stock error");
assert.ok(winner.body.data.order.currentStatus === "pending_payment");
passed += 1;

// ─── 10. Cancel + restock ────────────────────────────────────────────────────
const winnerCookies = raceA.status === 201 ? user2Cookies : user3Cookies;
const cancellable = winner.body.data.order._id;
await call("POST", `/api/v1/orders/${cancellable}/cancel`, { cookies: winnerCookies, expect: 200 });
await call("POST", `/api/v1/orders/${cancellable}/cancel`, { cookies: winnerCookies, expect: 400 }); // already cancelled
const afterCancel = (await Product.findById(productId)).findVariant(skuL).stock;
assert.equal(afterCancel, 2, "cancel restocks");
passed += 1;

// Delivered order gates reviews
await call("POST", `/api/v1/reviews/${productId}`, {
  cookies: userCookies,
  body: { rating: 5, comment: "Great shirt" },
  expect: 201, // review allowed regardless (verifiedPurchase just stays false)
});
const reviews = await call("GET", `/api/v1/reviews/product/${productId}`);
assert.equal(reviews.body.data.reviews.length, 1);
passed += 1;
const productAfterReview = await Product.findById(productId);
assert.equal(productAfterReview.avgRating, 5);
assert.equal(productAfterReview.numReviews, 1);
passed += 1;

await call("PATCH", "/api/v1/coupons/000000000000000000000000/expire", { cookies: adminCookies, expect: 404 });

// ─── 11. Admin users + inventory ─────────────────────────────────────────────
await call("GET", "/api/v1/users?search=test", { cookies: adminCookies, expect: 200 });

// Self-ban is rejected by the controller guard.
await call("PATCH", `/api/v1/users/${adminUser._id}/ban`, {
  cookies: adminCookies,
  body: { isBanned: true },
  expect: 400,
});

// Ban + unban a regular user.
const user3Id = (await User.findOne({ email: "user3@test.com" }))._id.toString();
await call("PATCH", `/api/v1/users/${user3Id}/ban`, {
  cookies: adminCookies,
  body: { isBanned: true },
  expect: 200,
});
await call("PATCH", `/api/v1/users/${user3Id}/ban`, {
  cookies: adminCookies,
  body: { isBanned: false },
  expect: 200,
});
await call("POST", "/api/v1/admin/inventory/adjust", {
  cookies: adminCookies,
  body: { productId, sku: skuM, quantityChange: 5 },
  expect: 200,
});
await call("GET", `/api/v1/admin/inventory/${productId}`, { cookies: adminCookies, expect: 200 });

// ─── 12. Refresh rotation + logout ───────────────────────────────────────────
const refreshRes = await call("POST", "/api/v1/auth/refresh", { cookies: userCookies, expect: 200 });
const newCookies = collectCookies(refreshRes);
assert.ok(newCookies.includes("accessToken"), "refresh rotates cookies");
passed += 1;

// Old refresh token must now be dead (rotation)
const reuse = await call("POST", "/api/v1/auth/refresh", { cookies: userCookies, expect: 401 });
assert.ok(reuse.body.message.toLowerCase().includes("expired or used"));
passed += 1;

await call("POST", "/api/v1/auth/logout", { cookies: newCookies, expect: 200 });

// ─── 13. Forgot/reset password round-trip (dev token shortcut) ───────────────
const forgot = await call("POST", "/api/v1/auth/forgot-password", {
  body: { email: "user@test.com" },
  expect: 200,
});
const resetToken = forgot.body.data?.resetToken;
assert.ok(resetToken, "dev exposes reset token");
passed += 1;
await call("POST", "/api/v1/auth/reset-password", {
  body: { token: resetToken, newPassword: "brandnew123" },
  expect: 200,
});
await call("POST", "/api/v1/auth/login", {
  body: { email: "user@test.com", password: "brandnew123" },
  expect: 200,
});

// ─── 14. Product soft delete hides from catalog but keeps order history ──────
await call("DELETE", `/api/v1/products/${productId}`, { cookies: adminCookies, expect: 200 });
await call("GET", `/api/v1/products/${slug}`, { expect: 404 });
const ordersStillReadable = await call("GET", `/api/v1/orders/${order._id}`, {
  cookies: userCookies,
  expect: 200,
});
assert.equal(ordersStillReadable.body.data.order.items[0].name, "Oxford Shirt");
passed += 1;

// ─── Wrap up ─────────────────────────────────────────────────────────────────
console.log(`\n──────────────────────────────────────────`);
console.log(`PASSED: ${passed} checks`);
if (failed > 0) {
  console.log(`FAILED: ${failed} checks`);
  process.exitCode = 1;
} else {
  console.log("✅ ALL CHECKS PASSED");
}

server.close();
await mongoose.disconnect();
await mem.stop();
