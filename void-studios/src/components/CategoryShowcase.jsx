import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductImage from './ProductImage'

// Category tiles that fade/slide up with a stagger when scrolled into view.
// IntersectionObserver + CSS transitions — no heavy libraries needed.
// `live: true` = the category is actually for sale; everything else shows a
// "Coming soon" state (still clickable so people can browse what's listed).
const TILES = [
  { label: 'Hoodies', to: '/tops/hoodies', img: '/assets/categories/hoodies.jpg', live: false },
  { label: 'T-Shirts', to: '/tops/tshirts', img: '/assets/categories/tshirts.jpg', live: true },
  { label: 'Jackets', to: '/tops/jackets', img: '/assets/categories/jackets.jpg', live: false },
  { label: 'Pants', to: '/bottoms/pants', img: '/assets/categories/pants.jpg', live: false },
  { label: 'Jeans', to: '/bottoms/jeans', img: '/assets/categories/jeans.jpg', live: false },
  { label: 'Accessories', to: '/accessories', img: '/assets/categories/accessories.jpg', live: false },
]

function Tile({ tile, index }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // stagger via transition-delay below
          setShown(true)
          obs.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <Link
      ref={ref}
      to={tile.to}
      style={{ transitionDelay: `${index * 90}ms` }}
      className={`group block transition-all duration-700 ease-out ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-bg-secondary">
        <ProductImage
          src={tile.img}
          alt={tile.label}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {!tile.live && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-primary/70 backdrop-blur-[1px]">
            <span className="border border-ink bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-ink">
              Coming soon
            </span>
          </div>
        )}
      </div>
      <p className="mt-2 text-center text-[12px] font-semibold uppercase tracking-[0.24em] group-hover:underline group-hover:decoration-accent group-hover:underline-offset-4">
        {tile.label}
      </p>
    </Link>
  )
}

export default function CategoryShowcase() {
  return (
    <section className="bg-bg-primary py-16 sm:py-20">
      <div className="ak-shell">
        <p className="mb-8 text-center text-[12px] font-semibold uppercase tracking-[0.3em] text-ink-soft">
          Shop by category
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 lg:gap-5">
          {TILES.map((tile, i) => (
            <Tile key={tile.to} tile={tile} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
