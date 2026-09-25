import { Link } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { useSeo } from '../lib/seo'
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FLAT_RATE } from '../content/content'

const fmt = (n) => `₹${n.toLocaleString('en-IN')}`

// Placeholder checkout — NO real payment flow. When the backend is ready,
// POST cartLines + a shipping address to the orders API here and route to
// a confirmation page with the real response.
export default function CheckoutPage() {
  useSeo({ title: 'Checkout', path: '/checkout', noindex: true })
  const { cartLines, cartSubtotal } = useStore()

  if (cartLines.length === 0) {
    return (
      <div className="ak-shell py-28 text-center">
        <h1 className="ak-section-title">Nothing to check out</h1>
        <Link to="/new-arrivals" className="ak-btn-dark mt-8">Shop New Arrivals</Link>
      </div>
    )
  }

  const shipping = cartSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_RATE

  return (
    <div className="bg-bg-primary">
      <div className="ak-shell py-14">
        <div className="mx-auto max-w-lg border border-line-soft bg-white p-8 text-center sm:p-10">
          <p className="font-wordmark text-3xl tracking-[-0.01em]">AKUMA</p>
          <h1 className="mt-4 text-lg font-medium">Checkout — Coming Soon</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Payments aren't wired up yet. Your bag ({cartLines.length} {cartLines.length === 1 ? 'item' : 'items'},{' '}
            {fmt(cartSubtotal + shipping)}) is saved and will be waiting.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link to="/cart" className="ak-btn-outline">Back to Bag</Link>
            <Link to="/new-arrivals" className="ak-btn-dark">Continue Shopping</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
