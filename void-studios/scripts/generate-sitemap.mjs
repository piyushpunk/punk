// ==================================================================
// Sitemap generator — runs BEFORE `vite build`.
//
// The static part (home, categories, policies) is hand-maintained;
// product URLs are fetched from the live API so every product added
// via /admin shows up here automatically on the next deploy. If the
// API is unreachable (cold start / offline build), we still write the
// static sitemap — products just reappear on the following deploy.
// ==================================================================
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const OUT = join(ROOT, 'public', 'sitemap.xml')
const BASE = 'https://punkstudios.vercel.app'
const API =
  process.env.VITE_API_URL ||
  process.env.SITEMAP_API_URL ||
  'https://punk-59vj.onrender.com/api/v1'

const today = new Date().toISOString().slice(0, 10)

const STATIC_PATHS = [
  { loc: '/', priority: '1.0' },
  { loc: '/new-arrivals', priority: '0.9' },
  { loc: '/tops', priority: '0.8' },
  { loc: '/tops/tshirts', priority: '0.7' },
  { loc: '/tops/hoodies', priority: '0.7' },
  { loc: '/tops/full-sleeve', priority: '0.7' },
  { loc: '/tops/tank-tops', priority: '0.7' },
  { loc: '/bottoms', priority: '0.8' },
  { loc: '/bottoms/pants', priority: '0.7' },
  { loc: '/bottoms/jeans', priority: '0.7' },
  { loc: '/bottoms/shorts', priority: '0.7' },
  { loc: '/accessories', priority: '0.8' },
  { loc: '/basics', priority: '0.8' },
  { loc: '/sale', priority: '0.8' },
  { loc: '/privacy', priority: '0.3' },
  { loc: '/terms', priority: '0.3' },
  { loc: '/refund', priority: '0.3' },
]

async function fetchProductSlugs() {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20_000)
  try {
    const res = await fetch(`${API}/products?limit=60&sort=newest`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    const products = json?.data?.products || []
    return products
      .filter((p) => p.slug && !p.isDeleted)
      .map((p) => ({ loc: `/product/${p.slug}`, priority: '0.9', lastmod: (p.updatedAt || p.createdAt || '').slice(0, 10) || today }))
  } finally {
    clearTimeout(timer)
  }
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

let productUrls = []
try {
  productUrls = await fetchProductSlugs()
  console.log(`[sitemap] ${productUrls.length} product URL(s) fetched from the API`)
} catch (err) {
  console.warn(`[sitemap] API unreachable (${err.message}) — writing static-only sitemap`)
}

const urls = [...STATIC_PATHS.map((u) => ({ ...u, lastmod: today })), ...productUrls]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) =>
      `  <url><loc>${BASE}${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.priority}</priority></url>`
  )
  .join('\n')}
</urlset>
`

writeFileSync(OUT, xml)
console.log(`[sitemap] wrote ${urls.length} URL(s) → public/sitemap.xml`)
