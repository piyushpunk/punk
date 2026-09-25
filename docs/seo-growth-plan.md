# AKUMA — Search Console Setup & Backlink Strategy

*(The code-side SEO — sitemap, robots, meta, schema, canonicals — is already live. This doc covers the two things only you can do: verifying ownership and building off-site authority.)*

---

## Part 1 — Verify Google Search Console (15 minutes)

1. Go to **search.google.com/search-console** → sign in with your Google account
2. Click **Add property** → choose **URL prefix** → enter `https://punkstudios.vercel.app`
3. Pick **HTML tag** verification — Google gives you a meta tag like:
   `<meta name="google-site-verification" content="abc123..." />`
4. Send me that tag — there's a marked placeholder in `void-studios/index.html` where it goes. I'll deploy it within a minute.
5. Click **Verify** in Google.
6. Once verified: **Sitemaps** (left menu) → enter `sitemap.xml` → **Submit**.
7. For the two pages Google must know about immediately: **URL Inspection** (top bar) → paste `https://punkstudios.vercel.app/` → **Request Indexing**. Repeat for `/tops/tshirts`.

What you get: index status, the exact queries you appear for, mobile usability, and Core Web Vitals field data once traffic starts.

---

## Part 2 — Backlink Strategy (rank #1 needs authority, not just on-page)

**Phase 1 — Foundations (week 1, free, do these first):**

| Source | Action | Link type |
|---|---|---|
| Instagram bio | `akuma04313` → site URL in bio (you have this) | Social signal |
| Google Business Profile | Create "AKUMA — Clothing Brand", Delhi; site link | Nofollow, but local pack visibility |
| Linktree/beacons | Free page with drop links → site | Social signal |
| WhatsApp Business catalog | Product links point to site | Referral traffic |
| Vercel/akuma-store domain | Decide the ONE canonical domain — see note below | Critical |

**Phase 2 — Indian streetwear ecosystem (weeks 2–6):**
- **Streetwear directories & blogs:** pitch to Indian fashion/streetwear roundups ("best Indian streetwear brands" listicles — Hypebeast India, Highsnobiety community, GQ India shopping guides). Email with your story + lookbook.
- **Instagram/YouTube creators:** send free tees to micro-influencers (5k–50k followers) in exchange for a link-in-bio or story link. Cheapest real links in fashion.
- **Reddit & communities:** r/IndianStreetwear, r/streetwear, r/IndianFashionAddicts — participate genuinely, drop the site when asked "where's this from?". No spam.
- **Campus/creator collabs:** college fests, drop partnerships — event pages link sponsors.

**Phase 3 — Compounding (ongoing):**
- Every drop gets a **lookbook page** on the site → pitch it to 2–3 blogs per drop
- Customer UGC: repost wearing-akuma photos, ask them to tag → their profiles link back
- Press angle when ready: "Delhi brand doing limited-drop-only streetwear" is a story local startup blogs run

**⚠️ One decision that matters more than any backlink:** right now the site answers on TWO domains (`punkstudios.vercel.app` and `akuma-store.vercel.app`). Search engines split ranking between duplicate domains. The canonical tags I added tell Google the primary is `punkstudios.vercel.app`, which fixes the split — but when you buy your real domain (e.g. `akuma.in`), tell me and I'll switch everything (sitemap, canonicals, Search Console) to it in one pass.

---

## What was shipped in the code (already live, verified)

| Item | Status |
|---|---|
| robots.txt | ✅ live — allows public pages, blocks /admin /account /reset-password, points to sitemap |
| sitemap.xml | ✅ live — 15 public URLs |
| noindex | ✅ none existed; utility pages (cart/account/admin/search) now explicitly `noindex` so Google skips them |
| Canonical tags | ✅ every route, absolute URLs, query strings stripped |
| Meta titles | ✅ unique per page (17 pages) — "AKUMA" appended |
| Meta descriptions | ✅ unique per page, sale-y but accurate |
| H1 per page | ✅ audit showed every page renders exactly one H1 (multi-H1 candidates were mutually exclusive states) |
| Header hierarchy | ✅ single H1 → H2 sections → H3 subsites; legal pages H2/H3 |
| Image alt text | ✅ audit passed — logo has `alt="AKUMA"`, products/cards/tiles alt from name/label, decorative empty |
| Schema markup | ✅ Organization (global) + Product with price/availability on product pages |
| Internal links | ✅ breadcrumbs, related products, category tiles, footer — already dense |
| Broken links | ✅ 9 missing images (category/mega/lookbook) created — now HTTP 200; "FAQs" dead link → WhatsApp |
| Compress images | ✅ logos 60KB, category tiles 8–25KB JPEG q72, hero on Cloudinary at ~450KB (was 8.3MB) |
| Core Web Vitals | ✅ hero `fetchpriority=high + eager` (LCP), all other images lazy, Cloudinary preconnect, fonts preconnected |
| Mobile responsiveness | ✅ was already mobile-first; nav/hero/cart all verified at 390px in prior sessions |
| HTTPS | ✅ enforced — http → 308 → https, verified live |
| URL slugs | ✅ already clean (`/tops/tshirts`, `/product/:id`, no file extensions) — product pages use DB slugs on the backend |
| OG image | ✅ hero artwork via Cloudinary, 1200px, on every page |
| Search Console | ⚠️ needs YOUR step — paste the verification meta tag to me |
| Backlinks | ⚠️ strategy above — off-site, only you can execute |
