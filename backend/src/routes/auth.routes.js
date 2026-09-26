import { Router } from "express";
import {
  registerUser,
  verifyEmail,
  resendVerification,
  loginUser,
  logoutUser,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerificationSchema,
} from "../validators/index.js";

const router = Router();

router.route("/register").post(validate(registerSchema), registerUser);
router.route("/verify-email").get(verifyEmail);
router.route("/resend-verification").post(validate(resendVerificationSchema), resendVerification);
router.route("/login").post(validate(loginSchema), loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh").post(refreshAccessToken);
router.route("/forgot-password").post(validate(forgotPasswordSchema), forgotPassword);
router.route("/reset-password").post(validate(resetPasswordSchema), resetPassword);

export default router;
