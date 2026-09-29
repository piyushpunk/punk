import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import HeroSlideshow from '../components/HeroSlideshow'
import MarqueeStrip from '../components/MarqueeStrip'
import ProductCarousel from '../components/ProductCarousel'
import { ArrowLeftIcon, ArrowRightIcon } from '../components/Icons'
import ProductGrid from '../components/ProductGrid'
import VideoSection from '../components/VideoSection'
import EditorialSplit from '../components/EditorialSplit'
import FeaturedProduct from '../components/FeaturedProduct'
import InfoColumns from '../components/InfoColumns'
import { HOME_SECTIONS } from '../data/products'
import { FEATURED_PRODUCT_ID, resolveMedia } from '../content/content'
import { useStore } from '../context/StoreContext'

import { useSeo } from '../lib/seo'

// Editorial split copy — placeholder; swap when brand copy is final.
const EDITORIAL = {
  heading: 'From the Archive',
  copy: 'Every AKUMA drop starts in the archive — heavyweight fabrics, references that outlive trends, and details that only show themselves after the tenth wear. Limited batches, hand-finished in the studio.',
  // Cloudinary delivery: f_auto picks WebP/AVIF per browser, q_auto tunes quality.
  img: 'https://res.cloudinary.com/mak8wmjn/image/upload/f_auto,q_auto,w_1400/v1790493830/archive.webp',
}

// Small collections strip mirroring GENRAGE's collection-list section.
// Horizontally swipeable (touch snap + desktop arrows) with auto-advance.
// Loading shows pulsing skeleton tiles — while the PAGE is actually loading,
// never as an entrance animation (owner: "animation not in opening, only in
// loading"). Tiles swap in instantly once the window fires `load`.
function CollectionList() {
  const trackRef = useRef(null)
  const pausedRef = useRef(false)
  const resumeRef = useRef(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (document.readyState === 'complete') {
      setLoaded(true)
      return
    }
    const done = () => setLoaded(true)
    window.addEventListener('load', done, { once: true })
    return () => window.removeEventListener('load', done)
  }, [])

  const tiles = [
    { label: 'Hoodies', to: '/tops/hoodies' },
    { label: 'T-Shirts', to: '/tops/tshirts' },
    { label: 'Jackets', to: '/tops/jackets' },
    { label: 'Pants', to: '/bottoms/pants' },
    { label: 'Accessories', to: '/accessories' },
  ]

  const stepSize = () => {
    const track = trackRef.current
    const card = track?.querySelector('[data-tile]')
    return card ? card.offsetWidth + 16 : 296
  }

  // interactions pause the auto-swipe; it resumes 4s after the last one
  const pauseAuto = () => {
    pausedRef.current = true
    clearTimeout(resumeRef.current)
    resumeRef.current = setTimeout(() => (pausedRef.current = false), 4000)
  }

  const scrollByTiles = (dir) => {
    const track = trackRef.current
    if (!track) return
    pauseAuto()
    track.scrollBy({ left: dir * stepSize() * 2, behavior: 'smooth' })
  }

  // auto-swipe: one tile every 3.5s, wrapping to the start. Paused while
  // hovered/touched (via pausedRef), when the tab is hidden, and entirely
  // for prefers-reduced-motion users.
  useEffect(() => {
    if (!loaded) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => {
      const track = trackRef.current
      if (!track || pausedRef.current || document.hidden) return
      const max = track.scrollWidth - track.clientWidth
      if (max <= 0) return
      if (track.scrollLeft >= max - 4) track.scrollTo({ left: 0, behavior: 'smooth' })
      else track.scrollBy({ left: stepSize(), behavior: 'smooth' })
    }, 3500)
    return () => {
      clearInterval(id)
      clearTimeout(resumeRef.current)
    }
  }, [loaded])

  const skeletonCls = 'aspect-square w-[62vw] flex-shrink-0 animate-pulse bg-bg-secondary sm:w-[38vw] lg:w-[23%]'

  return (
    <section className="bg-bg-primary py-14 sm:py-16">
      <div className="ak-shell">
        <div className="relative">
        {loaded ? (
          <div
            ref={trackRef}
            onMouseEnter={() => {
              pausedRef.current = true
              clearTimeout(resumeRef.current)
            }}
            onMouseLeave={() => {
              clearTimeout(resumeRef.current)
              resumeRef.current = setTimeout(() => (pausedRef.current = false), 1200)
            }}
            onTouchStart={pauseAuto}
            className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0"
          >
            {tiles.map((t) => (
              <Link
                key={t.to}
                data-tile
                to={t.to}
                className="group relative w-[62vw] flex-shrink-0 snap-start overflow-hidden bg-bg-secondary sm:w-[38vw] lg:w-[23%]"
              >
                <div className="aspect-square border border-line-soft" />
                <span className="absolute inset-0 flex items-center justify-center font-wordmark text-lg uppercase tracking-wide text-ink transition-transform duration-300 group-hover:scale-110 sm:text-2xl">
                  {t.label}
                </span>
                <span className="absolute bottom-3 left-1/2 h-px w-0 -translate-x-1/2 bg-accent transition-all duration-300 group-hover:w-1/2" />
              </Link>
            ))}
          </div>
        ) : (
          /* loading skeleton — same geometry so nothing shifts on swap */
          <div className="-mx-4 flex gap-4 overflow-hidden px-4 sm:mx-0 sm:px-0" aria-hidden="true">
            {tiles.map((t, i) => (
              <div key={i} className={skeletonCls} />
            ))}
          </div>
        )}

        {/* overlay arrows — one per side, vertically centered on the strip.
            Hidden on touch devices: they swipe the strip natively. */}
        <button
          type="button"
          onClick={() => scrollByTiles(-1)}
          aria-label="Scroll collections back"
          className="absolute left-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line-soft bg-bg-primary/90 shadow-sm backdrop-blur-sm transition-colors hover:bg-bg-primary sm:flex"
        >
          <ArrowLeftIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => scrollByTiles(1)}
          aria-label="Scroll collections forward"
          className="absolute right-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-line-soft bg-bg-primary/90 shadow-sm backdrop-blur-sm transition-colors hover:bg-bg-primary sm:flex"
        >
          <ArrowRightIcon size={16} />
        </button>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  useSeo({
    title: 'Bold Streetwear. Limited Drops. No Restocks.',
    description:
      'AKUMA is an Indian streetwear label — heavyweight tees, limited drops, no restocks. Shop the latest drop before it sells out.',
    path: '/',
  })
  const { catalog, apiLive, siteMedia } = useStore()

  const featured = catalog.filter((p) => p.collections?.includes('top-picks'))
  const justDropped =
    apiLive === false
      ? HOME_SECTIONS.newArrivals // curated mock section
      : catalog
          .filter((p) => p.collections?.includes('new-arrivals') || p.collections?.includes('top-picks'))
          .slice(0, 8)
  const featuredProduct = catalog.find((p) => p.id === FEATURED_PRODUCT_ID) || catalog[0]

  return (
    <>
      {/* 1 — hero slideshow (animation treatment TBD by owner) */}
      <HeroSlideshow />

      {/* 2 — scrolling marquee */}
      <MarqueeStrip preset="primary" />

      {/* 3 — collection list strip (category showcase removed by owner) */}
      <CollectionList />

      {/* 5 — campaign banner (still artwork until campaign film) */}
      <VideoSection
        heading="The Campaign"
        banner={resolveMedia(siteMedia, 'campaign')}
      />

      {/* 6 — featured collection carousel: Just Dropped */}
      <section className="bg-bg-secondary py-16 sm:py-20">
        <div className="ak-shell">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="ak-section-title">Just Dropped</h2>
            <Link to="/new-arrivals" className="text-[12px] font-bold uppercase tracking-[0.2em] underline-offset-4 hover:underline hover:decoration-accent">
              View All
            </Link>
          </div>
          <ProductCarousel products={justDropped} />
        </div>
      </section>

      {/* 7 — editorial split (image is admin-overridable via Site Media) */}
      <EditorialSplit {...EDITORIAL} img={resolveMedia(siteMedia, 'editorial')} flip />

      {/* 8 — featured collection carousel: Top Picks */}
      <section className="bg-bg-primary py-16 sm:py-20">
        <div className="ak-shell">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="ak-section-title">Top Picks</h2>
            <Link to="/tops" className="text-[12px] font-bold uppercase tracking-[0.2em] underline-offset-4 hover:underline hover:decoration-accent">
              View All
            </Link>
          </div>
          <ProductCarousel products={featured} />
        </div>
      </section>

      {/* 9 — second marquee, reversed, dark like the top strip */}
      <MarqueeStrip preset="secondary" />

      {/* 10 — featured product spotlight */}
      <FeaturedProduct product={featuredProduct} />

      {/* 11 — info columns */}
      <InfoColumns />
    </>
  )
}
