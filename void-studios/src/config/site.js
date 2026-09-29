// ==================================================================
// Canonical site origin — THE one place that declares the store's
// primary domain. Everything SEO-related derives from here:
// canonical tags, JSON-LD schema, the sitemap generator and the
// deploy aliases.
//
// ⚠️ If you ever switch domains (e.g. to a purchased akuma.in),
// change ONLY the line below, then also update these three literal
// copies (kept as literals on purpose — they ship as static files):
//   1. void-studios/index.html          (canonical + og:url + JSON-LD defaults)
//   2. void-studios/public/robots.txt   (Sitemap: line)
//   3. void-studios/src/content/privacy-policy.md (legal contact text)
// Then rebuild + deploy; Google re-consolidates automatically.
// ==================================================================
export const SITE_ORIGIN = 'https://akuma-store.vercel.app'
