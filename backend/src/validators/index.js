import { z } from "zod";
import {
  UserRole,
  OrderStatus,
  CouponType,
  InventoryChangeType,
} from "../constants.js";

// ─── Primitives ──────────────────────────────────────────────────────────────
const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Must be a valid id");

const variantSchema = z.object({
  size: z.string().trim().min(1, "size is required"),
  color: z.string().trim().min(1, "color is required"),
  stock: z.coerce.number().int().min(0).default(0),
  priceOverride: z.coerce.number().min(0).nullish().default(null),
  sku: z.string().trim().optional(), // auto-generated when omitted
});

// ─── Auth ────────────────────────────────────────────────────────────────────
export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "name must be at least 2 characters"),
    email: z.string().trim().email("valid email is required"),
    password: z.string().min(8, "password must be at least 8 characters"),
    phone: z.string().trim().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email("valid email is required"),
    password: z.string().min(1, "password is required"),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().email("valid email is required"),
  }),
});

export const resendVerificationSchema = z.object({
  body: z.object({
    email: z.string().trim().email("valid email is required"),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(10, "reset token is required"),
    newPassword: z.string().min(8, "new password must be at least 8 characters"),
  }),
});

// ─── Users ───────────────────────────────────────────────────────────────────
export const updateProfileSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2).optional(),
      phone: z.string().trim().optional(),
      username: z.string().trim().min(3).optional(),
    })
    .strip(),
});

export const addAddressSchema = z.object({
  body: z.object({
    label: z.string().trim().optional(),
    line1: z.string().trim().min(4, "line1 is required"),
    line2: z.string().trim().optional(),
    city: z.string().trim().min(2, "city is required"),
    state: z.string().trim().min(2, "state is required"),
    pincode: z.string().trim().regex(/^\d{6}$/, "pincode must be 6 digits"),
    isDefault: z.boolean().optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: objectId }),
});

export const removeProductImageSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({ url: z.string().min(1, "image url is required") }),
});

export const slugParamSchema = z.object({
  params: z.object({ slug: z.string().trim().min(1) }),
});

export const productIdParamSchema = z.object({
  params: z.object({ productId: objectId }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(1, "old password is required"),
    newPassword: z.string().min(8, "new password must be at least 8 characters"),
  }),
});

export const adminListUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: z.string().trim().optional(),
    role: z.enum(UserRole).optional(),
  }),
});

export const banUserSchema = z.object({
  body: z.object({
    isBanned: z.boolean(),
  }),
});

// ─── Categories ──────────────────────────────────────────────────────────────
export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "name is required"),
    parentCategory: objectId.nullish(),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      name: z.string().trim().min(2).optional(),
      parentCategory: objectId.nullish(),
    })
    .strip(),
});

// ─── Brands ──────────────────────────────────────────────────────────────────
export const createBrandSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "name is required"),
    logoUrl: z.string().url("logoUrl must be a URL").optional(),
  }),
});

export const updateBrandSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      name: z.string().trim().min(2).optional(),
      logoUrl: z.string().url().optional(),
    })
    .strip(),
});

// ─── Products ────────────────────────────────────────────────────────────────
export const createProductSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "name is required"),
    description: z.string().trim().optional(),
    category: objectId,
    brand: objectId,
    basePrice: z.coerce.number().min(0, "basePrice must be >= 0"),
    variants: z.array(variantSchema).min(1, "at least one variant is required"),
    isFeatured: z.boolean().optional(),
    collections: z.array(z.string().trim().toLowerCase()).optional(),
  }),
});

export const updateProductSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .object({
      name: z.string().trim().min(2).optional(),
      description: z.string().trim().optional(),
      category: objectId.optional(),
      brand: objectId.optional(),
      basePrice: z.coerce.number().min(0).optional(),
      isFeatured: z.boolean().optional(),
      collections: z.array(z.string().trim().toLowerCase()).optional(),
      variants: z.array(variantSchema).min(1).optional(),
    })
    .strip(),
});

export const listProductsSchema = z.object({
  query: z.object({
    category: z.string().trim().optional(), // category slug
    brand: z.string().trim().optional(), // brand slug
    size: z.string().trim().optional(),
    color: z.string().trim().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    search: z.string().trim().optional(),
    sort: z
      .enum(["newest", "price-asc", "price-desc", "rating"])
      .optional()
      .default("newest"),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(60).optional(),
    featured: z.enum(["true", "false"]).optional(),
  }),
});

export const adjustStockSchema = z.object({
  body: z.object({
    productId: objectId,
    sku: z.string().trim().min(1, "sku is required"),
    quantityChange: z.coerce.number().int().refine((v) => v !== 0, "quantityChange cannot be 0"),
    changeType: z.enum(InventoryChangeType).optional().default("adjustment"),
  }),
});

export const skuParamSchema = z.object({
  params: z.object({ sku: z.string().trim().min(1) }),
});

export const paymentCreateSchema = z.object({
  body: z.object({ paymentId: objectId }),
});

// ─── Cart ────────────────────────────────────────────────────────────────────
export const addItemSchema = z.object({
  body: z.object({
    productId: objectId,
    sku: z.string().trim().min(1, "sku is required"),
    quantity: z.coerce.number().int().min(1).default(1),
  }),
});

export const updateItemSchema = z.object({
  params: z.object({ sku: z.string().trim().min(1) }),
  body: z.object({
    quantity: z.coerce.number().int().min(1),
  }),
});

// ─── Coupons ─────────────────────────────────────────────────────────────────
export const createCouponSchema = z.object({
  body: z.object({
    code: z.string().trim().min(3, "code is required").transform((v) => v.toUpperCase()),
    discountType: z.enum(CouponType),
    discountValue: z.coerce.number().min(1, "discountValue must be >= 1"),
    minOrderValue: z.coerce.number().min(0).optional(),
    expiryDate: z.coerce.date().refine((d) => d > new Date(), "expiryDate must be in the future"),
    usageLimit: z.coerce.number().int().min(0).optional(),
  }),
});

export const validateCouponSchema = z.object({
  body: z.object({
    code: z.string().trim().min(1, "code is required").transform((v) => v.toUpperCase()),
    cartTotal: z.coerce.number().min(0).optional(),
  }),
});

// ─── Orders ──────────────────────────────────────────────────────────────────
export const checkoutSchema = z.object({
  body: z.object({
    addressId: objectId,
    couponCode: z.string().trim().optional().transform((v) => (v ? v.toUpperCase() : v)),
  }),
});

export const updateStatusSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    status: z.enum(OrderStatus),
    note: z.string().trim().optional(),
  }),
});

export const adminListOrdersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(OrderStatus).optional(),
    user: objectId.optional(),
  }),
});

// ─── Payments ────────────────────────────────────────────────────────────────
export const verifyPaymentSchema = z.object({
  body: z.object({
    razorpayOrderId: z.string().min(5, "razorpayOrderId is required"),
    razorpayPaymentId: z.string().min(5, "razorpayPaymentId is required"),
    razorpaySignature: z.string().min(10, "razorpaySignature is required"),
  }),
});

export const orderParamSchema = z.object({
  body: z.object({
    orderId: objectId,
  }),
});

// ─── Reviews ─────────────────────────────────────────────────────────────────
export const reviewSchema = z.object({
  body: z.object({
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(2000).optional(),
  }),
});

export const reviewUpdateSchema = z.object({
  body: z
    .object({
      rating: z.coerce.number().int().min(1).max(5).optional(),
      comment: z.string().trim().max(2000).optional(),
    })
    .strip(),
});
