// ==================================================================
// Backend → UI adapters. The storefront components consume the mock
// catalog shape; these mappers let real API documents flow through
// the exact same component contracts.
// ==================================================================

/**
 * Backend product → UI product.
 *   _id → id, basePrice/variants → price/salePrice/sizes/colors/inStock,
 *   variants kept raw (sku/stock) so cart lines can reference SKUs.
 * salePrice = cheapest variant override below basePrice (drives SALE badges).
 */
export function toUiProduct(p) {
  const variants = (p.variants || []).filter((v) => v.isActive !== false)
  const prices = variants.map((v) => v.priceOverride ?? p.basePrice)
  const minPrice = prices.length ? Math.min(...prices) : p.basePrice

  // The price a shopper can actually pay is the cheapest variant — the
  // backend always charges variant priceOverride. basePrice is only
  // meaningful when variants are discounted BELOW it (real sale).
  // - discount case: price = basePrice (struck through), salePrice = min
  // - otherwise: price = min variant price (basePrice never shown)
  const onRealSale = minPrice < p.basePrice

  return {
    id: p._id,
    slug: p.slug,
    name: p.name,
    // Parent-category routing contract: category = parent slug (tops/bottoms/…),
    // subcategory = leaf slug (hoodies/jeans/…). Accessories has no parent.
    category: p.category?.parentCategory?.slug ?? p.category?.slug ?? p.category ?? '',
    subcategory: p.category?.parentCategory ? p.category.slug : '',
    price: onRealSale ? p.basePrice : minPrice,
    salePrice: onRealSale ? minPrice : null,
    images: Array.isArray(p.images) ? p.images : [],
    sizes: [...new Set(variants.map((v) => String(v.size)))],
    colors: [...new Set(variants.map((v) => v.color).filter(Boolean))],
    description: p.description || '',
    care: p.care || '—',
    inStock: variants.some((v) => (v.stock ?? 0) > 0),
    collections: p.collections ?? [],
    variants,
  }
}

/** Backend sanitized user → UI user (Header/AccountPage contract). */
export const toUiUser = (u) =>
  u
    ? {
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone || '',
        addresses: u.addresses || [],
      }
    : null

/**
 * Backend cart items → UI cart lines.
 * size/color aren't stored on the backend cart (only sku) — resolve them
 * from the known catalog so the UI keeps showing "Navy / Size M".
 */
export function toUiCartLines(items = [], products = []) {
  return items.map((it) => {
    const product = products.find((p) => p.id === (it.product?._id || it.product))
    const variant = product?.variants?.find((v) => v.sku === it.sku)
    return {
      productId: it.product?._id || it.product,
      slug: product?.slug,
      sku: it.sku,
      size: variant?.size ?? '',
      color: variant?.color ?? '',
      qty: it.quantity,
      // Server-revalidated per-line price (variant priceOverride included).
      // This is what the backend charges — UI must display it, not basePrice.
      price: it.priceSnapshot,
    }
  })
}

/** Wishlist payloads are id arrays or populated docs — normalize to ids. */
export const toUiWishlistIds = (arr = []) =>
  arr.map((x) => (typeof x === 'object' && x !== null ? x._id : x))

/**
 * Canonical URL path for a product — the slug when available
 * (/product/thorn-spine), falling back to the Mongo id so cart/wishlist
 * lines (productId field) and old shared links keep working. Accepts a
 * UI product, a cart/wishlist line, or a bare id string.
 */
export const productHref = (p) => {
  const ident = p?.slug ?? p?.id ?? p?.productId ?? (typeof p === 'string' ? p : '')
  return `/product/${ident}`
}
