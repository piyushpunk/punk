import mongoose from "mongoose";

/**
 * SiteMedia — admin-uploaded imagery for fixed storefront slots
 * (hero banner, campaign banner, editorial split, mega-menu tiles).
 *
 * One document per slot `key`; `url` points at Cloudinary. A missing
 * document means "no override" — the storefront falls back to the
 * built-in default from content.js. The allow-list of legal keys lives
 * in validators/index.js (SITE_MEDIA_KEYS) and is mirrored by the UI.
 */
const siteMediaSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

export const SiteMedia = mongoose.model("SiteMedia", siteMediaSchema);
