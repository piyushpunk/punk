import { Link } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import ProductCard from '../components/ProductCard'
import { HeartIcon } from '../components/Icons'
import { useSeo } from '../lib/seo'

export default function WishlistPage() {
  useSeo({ title: 'Wishlist', path: '/wishlist', noindex: true })
  const { catalog, wishlist, addToCart, toast } = useStore()
  const products = wishlist.map((id) => catalog.find((p) => p.id === id)).filter(Boolean)

  const moveAllToBag = () => {
    products.forEach((p) => {
      if (p.inStock) addToCart(p.id, p.sizes[Math.min(1, p.sizes.length - 1)], p.colors[0], 1)
    })
    toast('Available items moved to bag')
  }

  return (
    <div className="bg-bg-primary">
      <div className="ak-shell py-10 sm:py-14">
        <div className="flex items-end justify-between">
          <h1 className="ak-section-title">Wishlist ({products.length})</h1>
          {products.length > 0 && (
            <button type="button" onClick={moveAllToBag} className="text-[11px] font-semibold uppercase tracking-[0.2em] underline-offset-4 hover:underline hover:decoration-accent">
              Move All to Bag
            </button>
          )}
        </div>

        {products.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <HeartIcon size={48} className="text-ink-soft/40" />
            <p className="mt-6 text-sm text-ink-soft">Nothing saved yet. Tap the heart on any piece to save it.</p>
            <Link to="/new-arrivals" className="ak-btn-dark mt-8">Start Shopping</Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
