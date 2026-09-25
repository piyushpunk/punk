import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { useSeo } from '../lib/seo'
import ProductImage from '../components/ProductImage'
import { BagIcon, TrashIcon, PlusIcon, MinusIcon } from '../components/Icons'
import { PROMO_CODES, FREE_SHIPPING_THRESHOLD, SHIPPING_FLAT_RATE } from '../content/content'

const fmt = (n) => `₹${n.toLocaleString('en-IN')}`

export default function CartPage() {
  useSeo({ title: 'Your Bag', path: '/cart', noindex: true })
  const { cartLines, cartSubtotal, updateQty, removeLine, clearCart } = useStore()
  const [promoInput, setPromoInput] = useState('')
  const [promo, setPromo] = useState(null) // { code, pct }
  const [promoError, setPromoError] = useState('')

  const discount = promo ? Math.round((cartSubtotal * promo.pct) / 100) : 0
  const shipping = cartSubtotal === 0 || cartSubtotal - discount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_RATE
  const total = cartSubtotal - discount + shipping

  const applyPromo = (e) => {
    e.preventDefault()
    const code = promoInput.trim().toUpperCase()
    if (PROMO_CODES[code]) {
      setPromo({ code, pct: PROMO_CODES[code] })
      setPromoError('')
    } else {
      setPromo(null)
      setPromoError('That code isn’t valid.')
    }
  }

  if (cartLines.length === 0) {
    return (
      <div className="bg-bg-primary">
        <div className="ak-shell flex flex-col items-center py-28 text-center">
          <BagIcon size={48} className="text-ink-soft/40" />
          <h1 className="ak-section-title mt-6">Your bag is empty</h1>
          <p className="mt-2 text-sm text-ink-soft">Once you add pieces, they'll live here.</p>
          <Link to="/new-arrivals" className="ak-btn-dark mt-8">Continue Shopping</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg-primary">
      <div className="ak-shell py-10 sm:py-14">
        <h1 className="ak-section-title">Your Bag ({cartLines.length})</h1>

        <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_360px]">
          {/* line items */}
          <ul className="divide-y divide-line-soft border-y border-line-soft">
            {cartLines.map((l) => (
              <li key={`${l.productId}-${l.size}-${l.color}`} className="flex gap-5 py-6">
                <Link to={`/product/${l.productId}`} className="w-24 shrink-0 sm:w-28">
                  <div className="aspect-[4/5] bg-white">
                    <ProductImage src={l.product.images[0]} alt={l.product.name} className="h-full w-full object-cover" />
                  </div>
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link to={`/product/${l.productId}`} className="text-sm font-medium hover:underline hover:underline-offset-4">
                        {l.product.name}
                      </Link>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                        {l.color} · Size {l.size}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(l.productId, l.size, l.color)}
                      aria-label={`Remove ${l.product.name}`}
                      className="p-1.5 text-ink-soft transition-colors hover:text-accent"
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <div className="flex items-center border border-line-soft">
                      <button type="button" onClick={() => updateQty(l.productId, l.size, l.color, l.qty - 1)} aria-label="Decrease quantity" className="p-2 hover:bg-bg-secondary">
                        <MinusIcon size={13} />
                      </button>
                      <span className="w-9 text-center text-xs font-medium">{l.qty}</span>
                      <button type="button" onClick={() => updateQty(l.productId, l.size, l.color, l.qty + 1)} aria-label="Increase quantity" className="p-2 hover:bg-bg-secondary">
                        <PlusIcon size={13} />
                      </button>
                    </div>
                    <p className="text-sm font-semibold">{fmt((l.product.salePrice ?? l.product.price) * l.qty)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* order summary */}
          <aside className="h-fit border border-line-soft bg-white p-6 lg:sticky lg:top-32">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.24em]">Order Summary</h2>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd>{fmt(cartSubtotal)}</dd>
              </div>
              {promo && (
                <div className="flex justify-between text-accent">
                  <dt>Discount ({promo.code})</dt>
                  <dd>−{fmt(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-soft">Shipping</dt>
                <dd>{shipping === 0 ? 'FREE' : fmt(shipping)}</dd>
              </div>
              <div className="flex justify-between text-ink-soft text-xs">
                <dt>Tax</dt>
                <dd>Calculated at checkout</dd>
              </div>
              <div className="flex justify-between border-t border-line-soft pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd>{fmt(total)}</dd>
              </div>
            </dl>

            {/* promo */}
            <form onSubmit={applyPromo} className="mt-6">
              <label htmlFor="promo" className="ak-label">Promo code</label>
              <div className="flex">
                <input
                  id="promo"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="e.g. AKUMA10"
                  className="ak-input"
                />
                <button type="submit" className="ak-btn-outline ml-2 shrink-0 px-4">Apply</button>
              </div>
              {promoError && <p className="mt-2 text-[11px] font-medium text-accent">{promoError}</p>}
            </form>

            <Link to="/checkout" className="ak-btn-dark mt-6 w-full">Proceed to Checkout</Link>
            <Link to="/new-arrivals" className="mt-3 block text-center text-[11px] uppercase tracking-[0.2em] text-ink-soft underline-offset-4 hover:underline">
              Continue Shopping
            </Link>
            <button
              type="button"
              onClick={clearCart}
              className="mt-4 block w-full text-center text-[10px] uppercase tracking-[0.18em] text-ink-soft/60 hover:text-accent"
            >
              Clear bag
            </button>
          </aside>
        </div>
      </div>
    </div>
  )
}
