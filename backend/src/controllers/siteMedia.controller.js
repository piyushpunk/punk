import { SiteMedia } from "../models/siteMedia.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";
import { SITE_MEDIA_KEYS } from "../validators/index.js";
import mongoose from "mongoose";

/**
 * GET /site-media            → { media: { key: url, … } }
 * GET /site-media/:key       → { key, url }
 *
 * Public. The storefront merges this map over its built-in defaults;
 * absent keys simply fall through to those defaults.
 */
const getSiteMedia = asyncHandler(async (req, res) => {
  // Single-key form (used by the admin form after an upload).
  if (req.validatedParams?.key) {
    const doc = await SiteMedia.findOne({ key: req.validatedParams.key }).lean();
    if (!doc) throw new ApiError(404, "No custom image set for this slot");
    return res
      .status(200)
      .json(new ApiResponse(200, { key: doc.key, url: doc.url }));
  }

  const docs = await SiteMedia.find().lean();
  const media = {};
  for (const d of docs) media[d.key] = d.url;
  return res.status(200).json(new ApiResponse(200, { media }));
});

const extractPublicId = (url) => {
  const match = url?.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
  return match ? match[1] : null;
};

const destroyBestEffort = async (url) => {
  try {
    const publicId = extractPublicId(url);
    if (publicId) await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("[cloudinary] destroy failed:", err?.message || err);
  }
};

/**
 * POST /site-media/:key — multipart (field `image`).
 * Uploads to Cloudinary and upserts the slot. Replaces any previous
 * custom image for the slot (old asset is destroyed best-effort).
 */
const upsertSiteMedia = asyncHandler(async (req, res) => {
  const { key } = req.validatedParams;
  if (!SITE_MEDIA_KEYS.includes(key)) {
    throw new ApiError(400, `Unknown media slot "${key}"`);
  }

  const file = req.file;
  if (!file?.buffer?.length) {
    throw new ApiError(400, "No image provided (field name: `image`)");
  }

  const result = await uploadOnCloudinary(file);
  if (!result) throw new ApiError(502, "Image upload to Cloudinary failed");

  const previous = await SiteMedia.findOne({ key });

  if (previous) {
    const oldUrl = previous.url;
    previous.url = result.secure_url;
    previous.updatedBy = req.user?._id || null;
    await previous.save();
    // Cleanup AFTER the new url is durably saved, so a destroy failure
    // can never leave the slot pointing at a deleted asset.
    destroyBestEffort(oldUrl);
    return res
      .status(200)
      .json(new ApiResponse(200, { key, url: previous.url }, "Image updated"));
  }

  await SiteMedia.create({
    key,
    url: result.secure_url,
    updatedBy: req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)
      ? req.user._id
      : null,
  });
  return res
    .status(201)
    .json(new ApiResponse(201, { key, url: result.secure_url }, "Image uploaded"));
});

/**
 * DELETE /site-media/:key — removes the override so the slot falls back
 * to the built-in default. Cloudinary asset destroyed best-effort.
 */
const deleteSiteMedia = asyncHandler(async (req, res) => {
  const { key } = req.validatedParams;
  if (!SITE_MEDIA_KEYS.includes(key)) {
    throw new ApiError(400, `Unknown media slot "${key}"`);
  }

  const doc = await SiteMedia.findOne({ key });
  if (!doc) throw new ApiError(404, "No custom image set for this slot");

  const url = doc.url;
  await doc.deleteOne();
  destroyBestEffort(url);

  return res
    .status(200)
    .json(new ApiResponse(200, { key, url: null }, "Reset to default image"));
});

export { getSiteMedia, upsertSiteMedia, deleteSiteMedia };
