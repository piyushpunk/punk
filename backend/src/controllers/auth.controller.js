import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import {
  COOKIE_OPTIONS,
  PASSWORD_RESET_TOKEN_TTL_MS,
  EMAIL_VERIFICATION_TOKEN_TTL_MS,
} from "../constants.js";
import { sendEmail } from "../utils/email.js";
import { sha256, sanitizeUser } from "../utils/helpers.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

// Accounts created before this moment predate activation emails — the login
// grandfather clause (see loginUser) marks them verified on first login.
const EMAIL_ACTIVATION_SHIPPED_AT = new Date("2026-09-26T00:00:00.000Z");

/** Issues a token pair, persists the refresh token on the user, returns both. */
const generateAuthTokens = async (user) => {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  return { accessToken, refreshToken };
};

const setAuthCookies = (res, { accessToken, refreshToken }) =>
  res
    .cookie("accessToken", accessToken, COOKIE_OPTIONS)
    .cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

// ─── Activation email ────────────────────────────────────────────────────────
// Shared by register() and resendVerification(). Stores the hash, returns the
// raw token to the caller (which embeds it in the link).
const issueActivationEmail = async (user) => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  user.emailVerificationTokenHash = sha256(rawToken);
  user.emailVerificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);
  await user.save({ validateBeforeSave: false });

  const origin = process.env.FRONTEND_URL || "http://localhost:5173";
  const verifyUrl = `${origin}/verify-email?token=${rawToken}`;

  const mail = await sendEmail({
    to: user.email,
    subject: "Activate your AKUMA account",
    text:
      `Welcome to AKUMA, ${user.name}.\n\n` +
      `Confirm your email address to activate your account. ` +
      `This link expires in 24 hours:\n\n${verifyUrl}\n\n` +
      `If you didn't create an account, you can ignore this email.`,
    html:
      `<div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#ffffff;border:1px solid #e5e5e5">` +
      `<h1 style="margin:0 0 8px;font-size:22px;letter-spacing:2px;text-transform:uppercase;color:#141414">AKUMA</h1>` +
      `<p style="margin:0 0 24px;font-size:14px;color:#555">Welcome, ${user.name}. Confirm your email to activate your account — the link expires in <strong>24 hours</strong>.</p>` +
      `<a href="${verifyUrl}" style="display:inline-block;padding:12px 28px;background:#141414;color:#fff;text-decoration:none;font-size:13px;letter-spacing:1.5px;text-transform:uppercase">Activate account</a>` +
      `<p style="margin:24px 0 0;font-size:12px;color:#888;word-break:break-all">Or paste this link into your browser:<br>${verifyUrl}</p>` +
      `<p style="margin:16px 0 0;font-size:12px;color:#888">If you didn't create an account, you can safely ignore this email.</p>` +
      `</div>`,
  });

  return { mail, rawToken };
};

// ─── POST /auth/register ─────────────────────────────────────────────────────
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, "User with this email already exists");
  }

  const user = await User.create({ name, email, password, phone });

  // Activation email — account exists, but login stays blocked until the
  // emailed link is used. Mail failures never fail the signup: the user can
  // resend from the verify page.
  const { mail } = await issueActivationEmail(user);
  if (!mail.delivered) {
    console.error(
      `[auth] Activation email NOT delivered to ${user.email} (${mail.reason}). ` +
        "Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS to enable account activation."
    );
  }

  // No tokens on register — the session starts at activation/login, which is
  // the point of verifying the address.
  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { user: sanitizeUser(user), emailSent: mail.delivered },
        mail.delivered
          ? "Account created — check your email to activate it"
          : "Account created, but the activation email could not be sent — use Resend on the verify page"
      )
    );
});

// ─── GET /auth/verify-email?token=… ──────────────────────────────────────────
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) throw new ApiError(400, "Activation token is missing");

  const user = await User.findOne({
    emailVerificationTokenHash: sha256(token),
    emailVerificationExpires: { $gt: new Date() },
  }).select("+emailVerificationTokenHash +emailVerificationExpires");

  if (!user) {
    throw new ApiError(400, "Activation link is invalid or has expired — request a new one");
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, { email: user.email }, "Account activated — you can log in now"));
});

// ─── POST /auth/resend-verification ──────────────────────────────────────────
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  // Same envelope whether or not the account exists — never leak registrations.
  const genericResponse = new ApiResponse(
    200,
    {},
    "If that email is registered, a new activation link has been sent"
  );

  if (!user) return res.status(200).json(genericResponse);

  // Already verified → say so without sending anything.
  if (user.isEmailVerified) {
    genericResponse.message = "This account is already activated — you can log in";
    return res.status(200).json(genericResponse);
  }

  const { mail } = await issueActivationEmail(user);
  if (!mail.delivered) {
    console.error(`[auth] Resent activation email NOT delivered to ${user.email} (${mail.reason}).`);
    genericResponse.data = { delivered: false };
  } else {
    genericResponse.data = { delivered: true };
  }

  return res.status(200).json(genericResponse);
});

// ─── POST /auth/login ────────────────────────────────────────────────────────
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password +refreshToken"
  );
  if (!user || !(await user.isPasswordCorrect(password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Grandfather clause: accounts created before activation emails shipped
  // have no verification record. First successful login marks them verified
  // so they are never locked out by the new rule.
  if (
    !user.isEmailVerified &&
    !user.emailVerificationTokenHash &&
    user.createdAt &&
    user.createdAt < EMAIL_ACTIVATION_SHIPPED_AT
  ) {
    user.isEmailVerified = true;
    await user.save({ validateBeforeSave: false });
  }

  if (user.isBanned) {
    throw new ApiError(403, "This account has been banned");
  }

  // Unverified accounts may not sign in — a friendly 403 with a code the UI
  // turns into a "resend activation link" offer.
  if (!user.isEmailVerified) {
    const err = new ApiError(
      403,
      "Activate your account first — check your email for the link"
    );
    err.code = "EMAIL_NOT_VERIFIED";
    throw err;
  }

  const tokens = await generateAuthTokens(user);
  setAuthCookies(res, tokens);

  return res
    .status(200)
    .json(new ApiResponse(200, { user: sanitizeUser(user) }, "Login successful"));
});

// ─── POST /auth/logout ───────────────────────────────────────────────────────
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { new: true }
  );

  return res
    .status(200)
    .clearCookie("accessToken", COOKIE_OPTIONS)
    .clearCookie("refreshToken", COOKIE_OPTIONS)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

// ─── POST /auth/refresh ──────────────────────────────────────────────────────
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request — no refresh token");
  }

  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (_err) {
    throw new ApiError(401, "Refresh token is invalid or expired");
  }

  const user = await User.findById(decoded._id).select("+refreshToken");
  if (!user || !user.refreshToken) {
    throw new ApiError(401, "Invalid refresh token");
  }

  if (incomingRefreshToken !== user.refreshToken) {
    // Token reuse detected — treat as compromised and revoke.
    user.refreshToken = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(401, "Refresh token is expired or used");
  }

  const tokens = await generateAuthTokens(user);
  setAuthCookies(res, tokens);

  return res
    .status(200)
    .json(new ApiResponse(200, { user: sanitizeUser(user) }, "Access token refreshed"));
});

// ─── POST /auth/forgot-password ──────────────────────────────────────────────
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });

  // Always answer the same way — never leak whether an email is registered.
  const genericResponse = new ApiResponse(
    200,
    {},
    "If that email is registered, a password reset link has been sent"
  );

  if (!user) {
    return res.status(200).json(genericResponse);
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetTokenHash = sha256(rawToken);
  user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
  await user.save({ validateBeforeSave: false });

  const resetPath = `/reset-password?token=${rawToken}`;
  const origin = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetUrl = `${origin}${resetPath}`;

  const mail = await sendEmail({
    to: user.email,
    subject: "Reset your AKUMA password",
    text:
      `You requested a password reset. This link expires in 15 minutes.\n\n` +
      `${resetUrl}\n\n` +
      `If you didn't request this, you can ignore this email.`,
    html:
      `<div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#faf8f4;border:1px solid #e7e2d8">` +
      `<h1 style="margin:0 0 8px;font-size:22px;letter-spacing:2px;text-transform:uppercase;color:#141414">AKUMA</h1>` +
      `<p style="margin:0 0 24px;font-size:14px;color:#555">You requested a password reset. Click below to choose a new one — the link expires in <strong>15 minutes</strong>.</p>` +
      `<a href="${resetUrl}" style="display:inline-block;padding:12px 28px;background:#141414;color:#fff;text-decoration:none;font-size:13px;letter-spacing:1.5px;text-transform:uppercase">Reset password</a>` +
      `<p style="margin:24px 0 0;font-size:12px;color:#888;word-break:break-all">Or paste this link into your browser:<br>${resetUrl}</p>` +
      `<p style="margin:16px 0 0;font-size:12px;color:#888">If you didn't request this, you can safely ignore this email.</p>` +
      `</div>`,
  });

  if (!mail.delivered) {
    // Never leak the raw token as a fallback (account-takeover risk) — make
    // the misconfiguration loud instead so SMTP gets fixed in the dashboard.
    console.error(
      `[auth] Password-reset email NOT delivered (${mail.reason}). ` +
        "Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS to enable password resets."
    );
    // Non-production gets the token inline so the flow is testable without a
    // mail server. Production relies on the email only.
    if (process.env.NODE_ENV !== "production") {
      genericResponse.data = { resetToken: rawToken, delivered: false };
    } else {
      genericResponse.data = { delivered: false };
    }
  } else {
    genericResponse.data = { delivered: true };
  }

  return res.status(200).json(genericResponse);
});

// ─── POST /auth/reset-password ───────────────────────────────────────────────
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  const user = await User.findOne({
    passwordResetTokenHash: sha256(token),
    passwordResetExpires: { $gt: new Date() },
  }).select("+passwordResetTokenHash +passwordResetExpires");

  if (!user) {
    throw new ApiError(400, "Reset token is invalid or has expired");
  }

  user.password = newPassword; // re-hashed by the pre-save hook
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  user.refreshToken = undefined; // force re-login everywhere
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password has been reset successfully"));
});

export {
  registerUser,
  verifyEmail,
  resendVerification,
  loginUser,
  logoutUser,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
};
