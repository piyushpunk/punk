import { useEffect } from 'react'

// ─── AKUMA SEO runtime ──────────────────────────────────────────────────────
// Single source of truth for per-route <head> management. SPA crawlers that
// render JS (Google does) pick these up; the static defaults in index.html
// cover crawlers that don't render JS. One hook call per page:
//
//   useSeo({ title: 'Tops — AKUMA', description: '…', path: '/tops' })
//
// `noindex: true` marks utility pages (cart, account, search…) so Google
// doesn't waste crawl budget or rank shell pages. `schema` accepts JSON-LD
// objects, injected once per page render.

const ORIGIN = 'https://punkstudios.vercel.app'

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertJsonLd(id, data) {
  let el = document.getElementById(id)
  if (!el) {
    el = document.createElement('script')
    el.id = id
    el.type = 'application/ld+json'
    document.head.appendChild(el)
  }
  el.textContent = JSON.stringify(data)
}

export function useSeo({ title, description, path = '', noindex = false, schema = null }) {
  useEffect(() => {
    const fullTitle = title ? `${title} — AKUMA` : 'AKUMA — Bold Streetwear. Limited Drops. No Restocks.'

    document.title = fullTitle

    if (description) upsertMeta('name', 'description', description)

    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')

    // canonical — strips query strings/fragments, always https + trailing domain
    const canonicalUrl = `${ORIGIN}${path}`
    let link = document.head.querySelector('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = canonicalUrl

    // Open Graph
    upsertMeta('property', 'og:title', fullTitle)
    upsertMeta('property', 'og:description', description ?? fullTitle)
    upsertMeta('property', 'og:type', 'website')
    upsertMeta('property', 'og:url', canonicalUrl)
    upsertMeta('property', 'og:site_name', 'AKUMA')
    upsertMeta('property', 'og:image', 'https://res.cloudinary.com/mak8wmjn/image/upload/f_auto,q_auto,w_1200/v1790320789/ghwjf.webp')

    // Twitter
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', fullTitle)
    upsertMeta('name', 'twitter:description', description ?? fullTitle)
    upsertMeta('name', 'twitter:image', 'https://res.cloudinary.com/mak8wmjn/image/upload/f_auto,q_auto,w_1200/v1790320789/ghwjf.webp')

    // JSON-LD schema (per-page override or global Organization default)
    upsertJsonLd(
      'ak-schema',
      schema ?? {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'AKUMA',
        url: ORIGIN,
        logo: 'https://punkstudios.vercel.app/assets/brand/logo-black.png',
        email: 'akuma04313@gmail.com',
        telephone: '+91-9318407257',
        address: { '@type': 'PostalAddress', addressCountry: 'IN', addressRegion: 'Delhi' },
        sameAs: ['https://www.instagram.com/akuma04313/'],
      },
    )
  }, [title, description, path, noindex, schema])
}
