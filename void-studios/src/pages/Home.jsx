import HeroSlideshow from '../components/HeroSlideshow'
import MarqueeStrip from '../components/MarqueeStrip'
import CategoryShowcase from '../components/CategoryShowcase'
import ProductCarousel from '../components/ProductCarousel'
import ProductGrid from '../components/ProductGrid'
import VideoSection from '../components/VideoSection'
import EditorialSplit from '../components/EditorialSplit'
import FeaturedProduct from '../components/FeaturedProduct'
import InfoColumns from '../components/InfoColumns'
import { HOME_SECTIONS } from '../data/products'
import { FEATURED_PRODUCT_ID } from '../content/content'
import { useStore } from '../context/StoreContext'
import { Link } from 'react-router-dom'

import { useSeo } from '../lib/seo'

// Editorial split copy — placeholder; swap when brand copy is final.
const EDITORIAL = {
  heading: 'From the Archive',
  copy: 'Every AKUMA drop starts in the archive — heavyweight fabrics, references that outlive trends, and details that only show themselves after the tenth wear. Limited batches, hand-finished in the studio.',
  img: '/assets/lookbook/look-2.jpg',
}

// Small collections strip mirroring GENRAGE's collection-list section.
function CollectionList() {
  const tiles = [
    { label: 'Hoodies', to: '/tops/hoodies' },
    { label: 'T-Shirts', to: '/tops/tshirts' },
    { label: 'Jackets', to: '/tops/jackets' },
  ]
  return (
    <section className="bg-bg-primary py-14 sm:py-16">
      <div className="ak-shell grid grid-cols-3 gap-4 md:gap-6">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to} className="group relative overflow-hidden bg-bg-secondary">
            <div className="aspect-square" />
            <span className="absolute inset-0 flex items-center justify-center font-wordmark text-lg uppercase tracking-wide text-ink/70 transition-transform duration-300 group-hover:scale-110 sm:text-2xl">
              {t.label}
            </span>
            <span className="absolute bottom-3 left-1/2 h-px w-0 -translate-x-1/2 bg-accent transition-all duration-300 group-hover:w-1/2" />
          </Link>
        ))}
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
  const { catalog, apiLive } = useStore()

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

      {/* 3 — category showcase (scroll-reveal stagger) */}
      <CategoryShowcase />

      {/* 4 — collection list strip */}
      <CollectionList />

      {/* 5 — featured collection carousel: Just Dropped */}
      <section className="bg-bg-secondary py-16 sm:py-20">
        <div className="ak-shell">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="ak-section-title">Just Dropped</h2>
            <Link to="/new-arrivals" className="text-[11px] font-semibold uppercase tracking-[0.2em] underline-offset-4 hover:underline hover:decoration-accent">
              View All
            </Link>
          </div>
          <ProductCarousel products={justDropped} />
        </div>
      </section>

      {/* 6 — video section (placeholder until campaign film) */}
      <VideoSection heading="The Campaign" />

      {/* 7 — editorial split */}
      <EditorialSplit {...EDITORIAL} flip />

      {/* 8 — featured collection carousel: Top Picks */}
      <section className="bg-bg-primary py-16 sm:py-20">
        <div className="ak-shell">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="ak-section-title">Top Picks</h2>
            <Link to="/tops" className="text-[11px] font-semibold uppercase tracking-[0.2em] underline-offset-4 hover:underline hover:decoration-accent">
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
