import { Link } from 'react-router-dom'
import ProductImage from './ProductImage'
import { HeartIcon, BagIcon } from './Icons'
import { useStore } from '../context/StoreContext'
import { productHref } from '../lib/adapter'

const fmt = (n) => `₹${n.toLocaleString('en-IN')}`

// Shared product tile used on home, category grids, wishlist and search.
export default function ProductCard({ product }) {
  const { wishlist, toggleWishlist, addToCart, toast } = useStore()
  const wished = wishlist.includes(product.id)
  const onSale = product.salePrice != null
  const discount = onSale ? Math.round((1 - product.salePrice / product.price) * 100) : 0

  const quickAdd = () => {
    addToCart(product.id, product.sizes[Math.min(1, product.sizes.length - 1)], product.colors[0], 1)
    toast(`${product.name} added to bag`)
  }

  return (
    <div className="group relative flex flex-col">
      <div className="relative overflow-hidden bg-bg-primary">
        <Link to={productHref(product)} aria-label={product.name}>
          <div className="aspect-[4/5] w-full">
            <ProductImage
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-0"
            />
            <ProductImage
              src={product.images[1] ?? product.images[0]}
              alt={`${product.name} — alternate`}
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            />
          </div>
        </Link>

        {/* badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {onSale && (
            <span className="bg-accent px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-bg-primary">
              Sale −{discount}%
            </span>
          )}
          {!product.inStock && (
            <span className="bg-olive px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-bg-primary">
              Sold Out
            </span>
          )}
        </div>

        {/* wishlist heart */}
        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
          aria-pressed={wished}
          className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center bg-bg-primary/90 transition-transform hover:scale-110 ${
            wished ? 'text-accent' : 'text-ink'
          }`}
        >
          <HeartIcon size={17} filled={wished} />
        </button>

        {/* quick add — slides up on hover (always visible on touch: no hover needed via focus-within fallback) */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-200 group-hover:translate-y-0">
          <button
            type="button"
            onClick={quickAdd}
            disabled={!product.inStock}
            className="flex w-full items-center justify-center gap-2 bg-olive py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-bg-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            <BagIcon size={15} />
            {product.inStock ? 'Quick Add — M' : 'Sold Out'}
          </button>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 pt-3">
        <div>
          <Link
            to={productHref(product)}
            className="text-[13px] font-medium tracking-wide text-ink hover:underline hover:decoration-accent hover:underline-offset-4"
          >
            {product.name}
          </Link>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-ink-soft">
            {product.subcategory}
          </p>
        </div>
        <div className="shrink-0 text-right text-[13px]">
          {onSale ? (
            <>
              {/* Gold-as-text only passes AA on cream (4.59:1), so the sale
                  price always gets a cream chip regardless of section bg. */}
              <span className="bg-bg-primary px-1.5 py-0.5 font-semibold text-accent">{fmt(product.salePrice)}</span>{' '}
              <span className="text-[11px] text-ink-soft line-through">{fmt(product.price)}</span>
            </>
          ) : (
            <span className="font-medium">{fmt(product.price)}</span>
          )}
        </div>
      </div>
    </div>
  )
}
