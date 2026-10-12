import { Router } from "express";
import {
  trackPageView,
  getTrafficSummary,
} from "../controllers/pageView.controller.js";
import { verifyJWT, verifyAdmin } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { pageViewSchema, trafficQuerySchema } from "../validators/index.js";

const router = Router();

// ─── Public — storefront fires this on every route change ───────────────────
// Traffic is already a heavy-ish write surface meaning it drags bots too;
// it lives under the global 300/min limiter like everything else.
router.route("/").post(validate(pageViewSchema), trackPageView);

// ─── Admin — the /admin/traffic panel reads this ─────────────────────────────
router
  .route("/traffic")
  .get(verifyJWT, verifyAdmin, validate(trafficQuerySchema), getTrafficSummary);

export default router;
