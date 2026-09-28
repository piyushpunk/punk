import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { useSeo } from '../lib/seo'
import { api } from '../lib/api'
import AdminOrders from '../components/AdminOrders'

const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`

const STATUS_STEPS = ['confirmed', 'processing', 'shipped', 'delivered']

const statusLabel = (s) => (s || '').replace(/_/g, ' ').toUpperCase()

// ── 48-hour post-delivery exchange window ───────────────────────────────────
const EXCHANGE_WINDOW_MS = 48 * 60 * 60 * 1000
const EXCHANGE_WHATSAPP = 'https://wa.me/919318407257'

function ExchangeWindowCard({ order }) {
  const [now, setNow] = useState(() => Date.now())

  // Keep the countdown honest while the page is open.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  if (order.currentStatus !== 'delivered') return null
  const deliveredAt = order.statusTimeline?.find((t) => t.status === 'delivered')?.timestamp
  if (!deliveredAt) return null

  const msLeft = new Date(deliveredAt).getTime() + EXCHANGE_WINDOW_MS - now
  const expired = msLeft <= 0

  let timeLeft = ''
  if (!expired) {
    const d = Math.floor(msLeft / 86400000)
    const h = Math.floor((msLeft % 86400000) / 3600000)
    const m = Math.floor((msLeft % 3600000) / 60000)
    timeLeft = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  const itemsLabel = (order.items || [])
    .map((it) => `${it.name} (${it.size})`)
    .join(', ')
  const waLink = `${EXCHANGE_WHATSAPP}?text=${encodeURIComponent(
    `Hi AKUMA! I'd like to request an exchange for order ${order.orderNumber} — ${itemsLabel}.`,
  )}`

  return (
    <div className={`border p-6 ${expired ? 'border-line-soft bg-bg-primary' : 'border-olive bg-olive/5'}`}>
      <p className="text-[12px] font-semibold uppercase tracking-[0.24em]">Exchange window</p>
      {expired ? (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            The 48-hour exchange window for this order has closed. If something&apos;s wrong
            with the piece, message us anyway — we&apos;ll make it right.
          </p>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-[12px] text-accent underline underline-offset-4"
          >
            Contact support →
          </a>
        </>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            Size not right? Request an exchange within{' '}
            <span className="font-semibold text-ink">{timeLeft}</span> of delivery — no
            questions asked.
          </p>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="ak-btn-dark mt-4 inline-block"
          >
            Request Exchange on WhatsApp
          </a>
        </>
      )}
    </div>
  )
}

// Timeline entries newest-last; the timeline shows the customer journey in order.
function StatusTimeline({ order }) {
  const timeline = order.statusTimeline || []
  const currentIdx = STATUS_STEPS.indexOf(order.currentStatus)
  const dead = ['cancelled', 'refunded'].includes(order.currentStatus)

  return (
    <div>
      {!dead && (
        <ol className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em]">
          {STATUS_STEPS.map((step, i) => {
            const reached = currentIdx >= i && currentIdx !== -1
            return (
              <li key={step} className="flex items-center gap-2">
                <span
                  className={`border px-2.5 py-1.5 ${
                    reached ? 'border-olive bg-olive text-bg-primary' : 'border-line-soft text-ink-soft'
                  }`}
                >
                  {step}
                </span>
                {i < STATUS_STEPS.length - 1 && (
                  <span aria-hidden="true" className={reached && currentIdx > i ? 'text-accent' : 'text-line-soft'}>
                    →
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      )}

      <ul className="mt-6 space-y-3">
        {timeline.map((t, i) => (
          <li key={i} className="border-l-2 border-line-soft pl-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em]">
              {statusLabel(t.status)}
              <span className="ml-3 font-normal normal-case tracking-normal text-ink-soft">
                {new Date(t.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </p>
            {t.note && <p className="mt-0.5 text-[13px] text-ink-soft">{t.note}</p>}
            {t.trackingNumber && (
              <p className="mt-1 text-[13px]">
                Tracking: <span className="font-semibold">{t.trackingNumber}</span>
                {t.trackingUrl && (
                  <>
                    {' — '}
                    <a href={t.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-4">
                      track package
                    </a>
                  </>
                )}
              </p>
            )}
          </li>
        ))}
      </ul>

      {order.trackingNumber && (
        <div className="mt-6 border border-line-soft bg-bg-primary p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft">Courier tracking</p>
          <p className="mt-2 text-sm font-semibold">{order.trackingNumber}</p>
          {order.trackingUrl && (
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-[12px] text-accent underline underline-offset-4"
            >
              Track on courier site →
            </a>
          )}
        </div>
      )}
    </div>
  )
}

// ── /orders — list every order the signed-in customer has placed ────────────
export default function OrdersPage() {
  useSeo({ title: 'My Orders', path: '/orders', noindex: true })
  const { user, boot, apiLive } = useStore()
  const [orders, setOrders] = useState(null) // null = loading
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    let alive = true
    const load = async () => {
      try {
        const data = await api.myOrders()
        if (alive) setOrders(data.orders || [])
      } catch (err) {
        if (alive) setError(err.message || 'Could not load your orders.')
      }
    }
    load()
    return () => {
      alive = false
    }
  }, [user])

  if (!user) {
    return (
      <div className="bg-bg-primary">
        <div className="ak-shell flex flex-col items-center py-24 text-center">
          <h1 className="ak-section-title">Orders</h1>
          <p className="mt-2 text-sm text-ink-soft">Sign in to see what you ordered and where it is.</p>
          <Link to="/login" className="ak-btn-dark mt-8">Log In</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg-primary">
      <div className="ak-shell py-12">
        <div className="flex items-center justify-between gap-4">
          <h1 className="ak-section-title">My Orders</h1>
          <Link to="/account" className="text-[11px] uppercase tracking-[0.2em] text-ink-soft underline underline-offset-4">
            Account
          </Link>
        </div>

        {error && (
          <div className="mt-8 max-w-xl">
            <p className="border border-accent bg-accent/10 px-4 py-3 text-sm text-accent">{error}</p>
            <button type="button" onClick={() => boot()} className="ak-btn-outline mt-4">Retry</button>
          </div>
        )}

        {orders === null && !error && (
          <p className="mt-8 text-sm text-ink-soft">{apiLive === false ? 'Storefront is in offline mode — no order history available.' : 'Loading your orders…'}</p>
        )}

        {orders?.length === 0 && (
          <div className="mt-10 max-w-xl">
            <p className="text-sm text-ink-soft">No orders yet — your history will appear here after your first drop.</p>
            <Link to="/new-arrivals" className="ak-btn-dark mt-6">Shop New Arrivals</Link>
          </div>
        )}

        {orders?.length > 0 && (
          <ul className="mt-8 max-w-3xl space-y-4">
            {orders.map((o) => (
              <li key={o._id}>
                <Link
                  to={`/orders/${o._id}`}
                  className="block border border-line-soft bg-bg-primary p-5 transition-colors hover:border-ink sm:p-6"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold tracking-wide">{o.orderNumber}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
                      {statusLabel(o.currentStatus)}
                    </p>
                  </div>
                  <p className="mt-1 text-[12px] text-ink-soft">
                    {new Date(o.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })} ·{' '}
                    {o.items.map((it) => `${it.name} × ${it.quantity}`).join(', ')}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm font-semibold">{fmt(o.total)}</p>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-ink-soft">Details →</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Store-wide order management (admins) sits under personal history */}
        {user?.role === 'admin' && <AdminOrders />}
      </div>
    </div>
  )
}

// ── /orders/:id — one order: items, address, totals, status timeline ────────
export function OrderDetailPage() {
  useSeo({ title: 'Order Details', path: '/orders', noindex: true })
  const { id } = useParams()
  const { user, boot } = useStore()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  const load = async () => {
    try {
      const data = await api.myOrder(id)
      setOrder(data.order)
      setError(null)
    } catch (err) {
      setError(err.message || 'Could not load this order.')
    }
  }

  useEffect(() => {
    if (!user) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user])

  if (!user) {
    return (
      <div className="bg-bg-primary">
        <div className="ak-shell flex flex-col items-center py-24 text-center">
          <h1 className="ak-section-title">Order</h1>
          <p className="mt-2 text-sm text-ink-soft">Sign in to view this order.</p>
          <Link to="/login" className="ak-btn-dark mt-8">Log In</Link>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-bg-primary">
        <div className="ak-shell py-20">
          <p className="mx-auto max-w-lg border border-accent bg-accent/10 px-4 py-3 text-sm text-accent">{error}</p>
          <div className="mx-auto mt-6 flex max-w-lg gap-3">
            <button type="button" onClick={load} className="ak-btn-outline">Retry</button>
            <Link to="/orders" className="ak-btn-dark">Back to Orders</Link>
          </div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="bg-bg-primary">
        <div className="ak-shell py-20 text-center text-sm text-ink-soft">Loading order…</div>
      </div>
    )
  }

  const canCancel = ['pending_payment', 'confirmed'].includes(order.currentStatus)

  return (
    <div className="bg-bg-primary">
      <div className="ak-shell py-12">
        <Link to="/orders" className="text-[11px] uppercase tracking-[0.2em] text-ink-soft underline underline-offset-4">
          ← All orders
        </Link>
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="ak-section-title">{order.orderNumber}</h1>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            {statusLabel(order.currentStatus)}
          </p>
        </div>
        <p className="mt-1 text-[12px] text-ink-soft">
          Placed {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>

        <div className="mt-8 grid gap-10 lg:grid-cols-[3fr_2fr]">
          <div>
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.24em]">Items</h2>
            <ul className="mt-4 space-y-4">
              {order.items.map((it, i) => (
                <li key={i} className="flex gap-4 border border-line-soft bg-bg-primary p-4">
                  <div className="aspect-square w-20 shrink-0 overflow-hidden bg-bg-secondary">
                    {it.image ? (
                      <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center font-wordmark text-xs text-ink/25">AKUMA</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold tracking-wide">{it.name}</p>
                    <p className="mt-0.5 text-[12px] uppercase tracking-[0.14em] text-ink-soft">
                      {it.size}{it.color ? ` / ${it.color}` : ''} · Qty {it.quantity} · {it.sku}
                    </p>
                    <p className="mt-2 text-sm font-semibold">{fmt(it.priceAtOrder * it.quantity)}</p>
                  </div>
                </li>
              ))}
            </ul>

            <h2 className="mt-10 text-[12px] font-semibold uppercase tracking-[0.24em]">Order progress</h2>
            <div className="mt-4">
              <StatusTimeline order={order} />
            </div>
          </div>

          <aside className="h-fit space-y-6">
            <ExchangeWindowCard order={order} />

            <div className="border border-line-soft bg-bg-primary p-6">
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.24em]">Summary</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{fmt(order.subtotal)}</dd></div>
                {order.discount > 0 && (
                  <div className="flex justify-between"><dt className="text-ink-soft">Discount</dt><dd>−{fmt(order.discount)}</dd></div>
                )}
                <div className="flex justify-between"><dt className="text-ink-soft">Shipping</dt><dd>{order.shippingFee === 0 ? 'FREE' : fmt(order.shippingFee)}</dd></div>
                <div className="flex justify-between border-t border-line-soft pt-3 text-base font-semibold"><dt>Total</dt><dd>{fmt(order.total)}</dd></div>
              </dl>
              {order.payment && (
                <p className="mt-4 text-[12px] text-ink-soft">
                  Payment: {order.payment.status === 'captured' || order.payment.status === 'authorized' ? 'Paid' : statusLabel(order.payment.status)}
                  {order.payment.razorpayPaymentId ? ` · ${order.payment.razorpayPaymentId}` : ''}
                </p>
              )}
            </div>

            <div className="border border-line-soft bg-bg-primary p-6">
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.24em]">Shipping to</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                {order.shippingAddress.line1}
                {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode}
              </p>
            </div>

            {canCancel && (
              <button
                type="button"
                disabled={cancelling}
                onClick={async () => {
                  if (!window.confirm(`Cancel order ${order.orderNumber}? This can't be undone.`)) return
                  setCancelling(true)
                  try {
                    await api.cancelMyOrder(id)
                    await load()
                  } catch (err) {
                    window.alert(err.message || 'Could not cancel the order.')
                  } finally {
                    setCancelling(false)
                  }
                }}
                className="w-full border border-accent px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent transition-colors hover:bg-accent hover:text-bg-primary disabled:opacity-60"
              >
                {cancelling ? 'Cancelling…' : 'Cancel this order'}
              </button>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
