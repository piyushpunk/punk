// ==================================================================
// AKUMA — site-wide copy & configuration
// Edit brand text here; components read from this file.
// ==================================================================

export const BRAND = {
  name: 'AKUMA',
  tagline: 'Bold streetwear. Limited drops. No restocks.',
  footerBlurb:
    'AKUMA is a brand in the field of streetwear which we design, using a heavy fabric with a weight between 240 and 340 GSM, featuring trend-driven silhouettes and being released in limited editions. It is never produced on a large scale, always being done with intention.',
  copyright: '© 2026 AKUMA',
  madeIn: 'Made in India',
}

export const ANNOUNCEMENTS = [
  'NEW DROP LIVE NOW',
  'LIMITED UNITS — NO RESTOCKS',
]

export const TRUST_BADGES = ['SHIPS FAST', 'LIMITED DROPS', 'NO RESTOCKS']

// Scrolling marquee strips (GENRAGE-style architecture, AKUMA copy)
export const MARQUEE_PRIMARY = [
  'NO RESTOCKS',
  'NEW DROP LIVE NOW',
]
export const MARQUEE_SECONDARY = [
  'LIMITED UNITS PER DROP',
  '240–460 GSM HEAVYWEIGHT',
  'MADE IN INDIA',
  'AKUMA',
]

// Hero slideshow — placeholder media slots; swap srcs when campaign
// assets exist. Slide transition style is intentionally simple for now
// (owner will specify the final animation treatment later).
export const HERO_SLIDES = [
  // Static hero banner — single image on Cloudinary's CDN. The transform
  // (f_auto,q_auto,w_2560) delivers auto-format/quality at 2560px wide —
  // the 8MB source PNG ships as ~450KB. Swap src when new artwork drops.
  { type: 'image', src: 'https://res.cloudinary.com/mak8wmjn/image/upload/f_auto,q_auto,w_2560/v1790320789/ghwjf.webp', tagline: 'Drop 01 — Now Live', cta: 'Shop Now', to: '/new-arrivals' },
]

// Mock reviews — replace with real reviews once backend lands
export const REVIEWS = [
  { name: 'Arjun M.', location: 'Delhi', product: 'Shinigami Hoodie', rating: 5, text: 'The fleece is unreal — heavier than anything I own. Fits boxy exactly as shown.' },
  { name: 'Sana K.', location: 'Mumbai', product: 'Kanji Logo Tee', rating: 5, text: 'Wash it ten times, print still sits perfect. You can feel the quality immediately.' },
  { name: 'Rohit V.', location: 'Bengaluru', product: 'Ronin Cargo Pant', rating: 4, text: 'Wide leg done right. Sizing chart was accurate, shipping took two days.' },
  { name: 'Meher S.', location: 'Hyderabad', product: 'Kuro Straight Jean', rating: 5, text: 'The denim has real weight to it. Best jeans I have bought from an Indian brand.' },
  { name: 'Kabir N.', location: 'Pune', product: 'Oni Cap', rating: 5, text: 'Clean embroidery, no cheap details. Bought a second one for my brother.' },
]

// Single-product spotlight section
export const FEATURED_PRODUCT_ID = 'ak-004'

// Header nav — structure drives the desktop dropdowns and the mobile accordion.
export const NAV_LINKS = [
  { label: 'NEW ARRIVALS', to: '/new-arrivals' },
  {
    label: 'TOPS',
    children: [
      { label: 'T-SHIRTS', to: '/tops/tshirts' },
      { label: 'HOODIES', to: '/tops/hoodies' },
      // JACKETS hidden for now — re-add: { label: 'JACKETS', to: '/tops/jackets' },
      { label: 'FULL SLEEVE T-SHIRT', to: '/tops/full-sleeve' },
      { label: 'TANK TOPS', to: '/tops/tank-tops' },
    ],
    viewAll: '/tops',
    promo: { title: 'The Tee Edit', mediaKey: 'mega-tops' },
  },
  {
    label: 'BOTTOMS',
    children: [
      // PANTS & JEANS hidden for now — re-add:
      // { label: 'PANTS', to: '/bottoms/pants' },
      // { label: 'JEANS', to: '/bottoms/jeans' },
      { label: 'SHORTS', to: '/bottoms/shorts' },
    ],
    viewAll: '/bottoms',
    promo: { title: 'Denim & Cargos', mediaKey: 'mega-bottoms' },
  },
  { label: 'BASICS', to: '/basics' },
  { label: 'ACCESSORIES', to: '/accessories' },
  // CLEARANCE removed — it linked to the same /sale page as SALE (duplicate)
  { label: 'SALE', to: '/sale', pill: true },
]

export const FOOTER_LINKS = {
  shop: [
    { label: 'New Arrivals', to: '/new-arrivals' },
    { label: 'Tops', to: '/tops' },
    { label: 'Bottoms', to: '/bottoms' },
    { label: 'Accessories', to: '/accessories' },
    { label: 'Sale', to: '/sale' },
  ],
  support: [
    { label: 'Track Order', to: '/account' },
    { label: 'Returns & Exchange Policy', to: '/refund' },
    // FAQs page doesn't exist yet — WhatsApp is the live support channel,
    // and a dead footer link is worse than a direct line to the brand.
    { label: 'FAQs', href: 'https://wa.me/919318407257?text=' + encodeURIComponent('Hi AKUMA! I have a question.') },
    { label: 'Contact Us', href: 'mailto:akuma04313@gmail.com?subject=' + encodeURIComponent('Hi AKUMA — product question') },
    { label: 'Terms of Service', to: '/terms' },
    { label: 'Privacy Policy', to: '/privacy' },
  ],
  social: [
    { label: 'Instagram', href: 'https://www.instagram.com/akuma04313/' },
    {
      label: 'WhatsApp',
      // 91 = India country code; pre-filled first message opens the chat ready to send
      href: 'https://wa.me/919318407257?text=' + encodeURIComponent("Hi AKUMA! I have a question about a product."),
    },
  ],
}

export const PROMO_CODES = {
  AKUMA10: 10, // % off — mock validation lives in cart summary
}

export const FREE_SHIPPING_THRESHOLD = 0 // 0 = no free tier — flat ₹49 on every order (must match backend)
export const SHIPPING_FLAT_RATE = 49 // ₹ flat, charged whenever the bag has items (must match backend SHIPPING_FEE)

// ==================================================================
// Admin-managed site media — fixed image slots the owner can replace
// from Admin → Site Media without a code change (backend: SiteMedia
// collection, uploaded to Cloudinary). MUST stay in sync with
// SITE_MEDIA_KEYS in backend/src/validators/index.js.
// ==================================================================
export const SITE_MEDIA_DEFS = {
  hero: HERO_SLIDES[0]?.src || '',
  campaign:
    'https://res.cloudinary.com/mak8wmjn/image/upload/f_auto,q_auto,w_1600/v1790335057/Untitled79_20260925163950.webp',
  editorial:
    'https://res.cloudinary.com/mak8wmjn/image/upload/f_auto,q_auto,w_1400/v1790493830/archive.webp',
  'mega-tops': '/assets/mega/tees.jpg',
  'mega-bottoms': '/assets/mega/bottoms.jpg',
}

// Slot metadata for the admin manager UI (label + a hint about placement).
export const SITE_MEDIA_SLOTS = [
  { key: 'hero', label: 'Hero banner', hint: 'Full-width homepage banner (16:9 works best)' },
  { key: 'campaign', label: 'Campaign banner', hint: '“The Campaign” section on the homepage' },
  { key: 'editorial', label: 'Editorial — From the Archive', hint: 'Image beside the archive story' },
  { key: 'mega-tops', label: 'Menu tile — TOPS', hint: 'Promo tile in the TOPS dropdown' },
  { key: 'mega-bottoms', label: 'Menu tile — BOTTOMS', hint: 'Promo tile in the BOTTOMS dropdown' },
]

/** Admin override (siteMedia map from the API) wins; built-in default falls through. */
export function resolveMedia(media, key) {
  return media?.[key] || SITE_MEDIA_DEFS[key] || ''
}
