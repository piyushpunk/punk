import { Router } from "express";
import {
  getSiteMedia,
  upsertSiteMedia,
  deleteSiteMedia,
} from "../controllers/siteMedia.controller.js";
import { verifyJWT, verifyAdmin } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { siteMediaKeyParamSchema } from "../validators/index.js";

const router = Router();

// ─── Public — the storefront reads overrides at boot ─────────────────────────
router.route("/").get(getSiteMedia);
router.route("/:key").get(validate(siteMediaKeyParamSchema), getSiteMedia);

// ─── Admin — upload/replace (multipart, field name: `image`) or reset ────────
router
  .route("/:key")
  .post(verifyJWT, verifyAdmin, upload.single("image"), validate(siteMediaKeyParamSchema), upsertSiteMedia)
  .delete(verifyJWT, verifyAdmin, validate(siteMediaKeyParamSchema), deleteSiteMedia);

export default router;
