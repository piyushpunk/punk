import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, Navigate } from 'react-router-dom'
import ProductImage from '../components/ProductImage'
import ProductCard from '../components/ProductCard'
import { SkeletonProduct, SkeletonBlock } from '../components/Skeletons'
import { useStore } from '../context/StoreContext'
import { useSeo } from '../lib/seo'
import { HeartIcon, BagIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/Icons'

const fmt = (n) => `₹${n.toLocaleString('en-IN')}`

export default function ProductPage() {
  const { productId } = useParams()
  const { catalog, apiLive, addToCart, toggleWishlist, wishlist, toast, setCartOpen } = useStore()
  const product = catalog.find((p) => p.id === productId)

  const [size, setSize] = useState(null)
  const [color, setColor] = useState(null)
  const [activeImg, setActiveImg] = useState(0)
  const [error, setError] = useState('')

  // reset selections when navigating between products
  useEffect(() => {
    setSize(null)
    setColor(null)
    setActiveImg(0)
    setError('')
  }, [productId])

  const related = useMemo(
    () =>
      product
        ? catalog.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4)
        : [],
    [catalog, product],
  )

  // Product schema (price/availability) + per-product title/description/canonical
  const productSchema = useMemo(() => {
    if (!product) return null
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      image: product.images?.[0] ? [product.images[0]] : undefined,
      description: product.description ?? `${product.name} — AKUMA streetwear`,
      brand: { '@type': 'Brand', name: 'AKUMA' },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'INR',
        price: product.salePrice ?? product.price,
        availability: product.inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        url: `https://punkstudios.vercel.app/product/${product.id}`,
      },
    }
  }, [product])
  useSeo({
    title: product ? product.name : 'Product',
    description: product
      ? `${product.name} — ₹${(product.salePrice ?? product.price).toLocaleString('en-IN')}. Heavyweight AKUMA streetwear. Limited drops, no restocks.`
      : 'AKUMA product',
    path: product ? `/product/${product.id}` : '',
    schema: productSchema,
  })

  // While the API catalog is still loading, a direct visit to /product/:id
  // would look like a 404 — hold the page's shape with skeletons instead.
  if (!product && apiLive === null) {
    return (
      <div className="bg-bg-primary">
        <div className="ak-shell py-8">
          {/* breadcrumb placeholder keeps the header rhythm */}
          <div className="mb-6">
            <SkeletonBlock className="h-3 w-40" />
          </div>
          <SkeletonProduct />
        </div>
      </div>
    )
  }
  if (!product) return <Navigate to="/404" replace />

  const wished = wishlist.includes(product.id)
  const onSale = product.salePrice != null
  const discount = onSale ? Math.round((1 - product.salePrice / product.price) * 100) : 0
  const hasSwipe = product.images.length > 1

  const prevImg = () => setActiveImg((i) => (i - 1 + product.images.length) % product.images.length)
  const nextImg = () => setActiveImg((i) => (i + 1) % product.images.length)

  // Price follows the picked variant when the merchant set a per-variant
  // priceOverride; otherwise the base/sale price applies.
  const selectedVariant = product.variants?.find(
    (v) => String(v.size) === String(size) && (!color || v.color === color),
  )
  const displayPrice = selectedVariant?.priceOverride ?? (onSale ? product.salePrice : product.price)

  const handleAdd = () => {
    if (!product.inStock) return
    if (!size) return setError('Select a size first.')
    if (!color) return setError('Select a colour first.')
    setError('')
    addToCart(product.id, size, color, 1)
    toast(`${product.name} added to bag`)
    setCartOpen(true)
  }

  return (
    <div className="bg-bg-primary">
      <div className="ak-shell py-8">
        {/* breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-[10px] uppercase tracking-[0.2em] text-ink-soft">
          <Link to="/" className="hover:underline">Home</Link>
          <span className="mx-2">/</span>
          <Link to={`/${product.category}`} className="hover:underline">{product.category}</Link>
          <span className="mx-2">/</span>
          <span className="text-ink">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          {/* gallery */}
          <div>
            <div className="relative aspect-[4/5] bg-white">
              <ProductImage
                key={activeImg}
                src={product.images[activeImg]}
                alt={product.name}
                className="h-full w-full object-cover"
              />

              {hasSwipe && (
                <>
                  <button
                    type="button"
                    onClick={prevImg}
                    aria-label="Previous image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm backdrop-blur-sm transition-colors hover:bg-white disabled:pointer-events-none disabled:opacity-0"
                    disabled={activeImg === 0}
                  >
                    <ChevronLeftIcon size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={nextImg}
                    aria-label="Next image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm backdrop-blur-sm transition-colors hover:bg-white disabled:pointer-events-none disabled:opacity-0"
                    disabled={activeImg === product.images.length - 1}
                  >
                    <ChevronRightIcon size={18} />
                  </button>
                </>
              )}
            </div>
            <div className="mt-3 flex gap-3">
              {product.images.map((src, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  aria-label={`View image ${i + 1}`}
                  className={`aspect-[4/5] w-20 bg-white border transition-colors ${
                    activeImg === i ? 'border-ink' : 'border-line-soft hover:border-ink-soft'
                  }`}
                >
                  <ProductImage src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            {/* invisible counter keeps gallery height stable while swiping */}
            <p className="sr-only" aria-live="polite">
              Image {activeImg + 1} of {product.images.length}
            </p>
          </div>

          {/* info + buy panel */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-xl font-medium tracking-wide sm:text-2xl">{product.name}</h1>
              {onSale && (
                <span className="mt-1 shrink-0 bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                  −{discount}%
                </span>
              )}
            </div>

            <div className="mt-3 flex items-baseline gap-3">
              <span className={`text-lg font-semibold ${onSale ? 'text-accent' : ''}`}>
                {fmt(displayPrice)}
              </span>
              {onSale && displayPrice !== product.price && (
                <span className="text-sm text-ink-soft line-through">{fmt(product.price)}</span>
              )}
            </div>
            {onSale && selectedVariant?.priceOverride != null && selectedVariant.priceOverride > product.salePrice && (
              <p className="mt-1 text-[12px] text-ink-soft">
                Other variants from {fmt(product.salePrice)}
              </p>
            )}

            <p className="mt-5 text-sm leading-relaxed text-ink-soft">{product.description}</p>

            {/* size selector */}
            <fieldset className="mt-8">
              <legend className="ak-label">Size</legend>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    aria-pressed={size === s}
                    className={`min-w-12 border px-3 py-2.5 text-[12px] tracking-wide transition-colors ${
                      size === s
                        ? 'border-ink bg-ink text-bg-primary'
                        : 'border-line-soft hover:border-ink'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* color selector */}
            <fieldset className="mt-6">
              <legend className="ak-label">Colour</legend>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-pressed={color === c}
                    className={`border px-4 py-2.5 text-[12px] tracking-wide transition-colors ${
                      color === c
                        ? 'border-ink bg-ink text-bg-primary'
                        : 'border-line-soft hover:border-ink'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </fieldset>

            {error && <p className="mt-4 text-[12px] font-medium text-accent">{error}</p>}

            {/* actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleAdd}
                disabled={!product.inStock}
                className="ak-btn-dark flex-1 disabled:cursor-not-allowed disabled:opacity-40"
              >
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
                <HeartIcon size={17} filled={wished} className={wished ? 'text-accent' : ''} />
                <span className="sm:hidden">{wished ? 'Saved' : 'Save'}</span>
              </button>
            </div>

            {/* care + meta */}
            <div className="mt-8 space-y-2 border-t border-line-soft pt-6 text-[12px] leading-relaxed text-ink-soft">
              <p><span className="font-semibold uppercase tracking-[0.18em] text-ink">Care —</span> {product.care}</p>
              <p><span className="font-semibold uppercase tracking-[0.18em] text-ink">Availability —</span> {product.inStock ? 'In stock, ships in 2–4 days' : 'Currently sold out'}</p>
            </div>
          </div>
        </div>

        {/* related */}
        {related.length > 0 && (
          <section className="mt-20">
            <h2 className="ak-section-title mb-8">You May Also Like</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 lg:grid-cols-4">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
