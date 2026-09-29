import { Link } from 'react-router-dom'
import ProductImage from './ProductImage'
import { useStore } from '../context/StoreContext'
import { BagIcon, HeartIcon } from './Icons'
import { productHref } from '../lib/adapter'

const fmt = (n) => `₹${n.toLocaleString('en-IN')}`

// Single-product spotlight (GENRAGE-style featured product section).
// The product is resolved by Home (catalog-aware) and passed in.
export default function FeaturedProduct({ product }) {
  const { addToCart, toggleWishlist, wishlist, toast, setCartOpen } = useStore()
  if (!product) return null

  const onSale = product.salePrice != null
  const wished = wishlist.includes(product.id)

  const quickBuy = () => {
    addToCart(product.id, product.sizes[Math.min(1, product.sizes.length - 1)], product.colors[0], 1)
    toast(`${product.name} added to bag`)
    setCartOpen(true)
  }

  return (
    <section className="bg-bg-alt py-16 sm:py-20">
      <div className="ak-shell">
        <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.3em] text-ink-soft">
          Piece of the drop
        </p>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Link to={productHref(product)} className="block">
            <div className="aspect-[4/5] bg-bg-primary">
              <ProductImage src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
            </div>
          </Link>

          <div>
            <h2 className="text-xl font-medium tracking-wide sm:text-2xl">{product.name}</h2>
            <div className="mt-3 flex items-baseline gap-3">
              {/* Gold text fails AA on this tan section (3.35:1), so the sale
                  price sits on a cream chip — highlight family, compliant. */}
              <span className={onSale ? 'bg-bg-primary px-2 py-0.5 font-semibold text-accent' : 'font-semibold text-lg'}>
                <span className="text-lg">{fmt(onSale ? product.salePrice : product.price)}</span>
              </span>
              {onSale && <span className="text-sm text-ink-soft line-through">{fmt(product.price)}</span>}
            </div>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-soft">{product.description}</p>

            <div className="mt-7 flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <span key={s} className="border border-line-soft px-3.5 py-2 text-[11px] tracking-wide">{s}</span>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={quickBuy} disabled={!product.inStock} className="ak-btn-dark flex-1 disabled:opacity-40">
                <BagIcon size={16} />
                {product.inStock ? 'Add to Bag' : 'Sold Out'}
              </button>
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-pressed={wished}
                className="ak-btn-outline sm:w-14 sm:px-0"
                aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <HeartIcon size={16} filled={wished} className={wished ? 'text-accent' : ''} />
                <span className="sm:hidden">{wished ? 'Saved' : 'Save'}</span>
              </button>
            </div>

            <Link to={productHref(product)} className="mt-4 inline-block text-[11px] uppercase tracking-[0.2em] text-ink-soft underline underline-offset-4 hover:text-ink">
              Full details
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
