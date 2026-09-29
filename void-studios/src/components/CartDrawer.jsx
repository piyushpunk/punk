import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import ProductImage from './ProductImage'
import { CloseIcon, PlusIcon, MinusIcon, TrashIcon, BagIcon } from './Icons'
import { productHref } from '../lib/adapter'

const fmt = (n) => `₹${n.toLocaleString('en-IN')}`

// Slide-out mini cart — condensed line items, links to the full /cart page.
// Cart mutations hit the backend in API mode, so per-line busy states and
// error toasts are handled here (async), unlike the old sync mock version.
export default function CartDrawer() {
  const { cartOpen, setCartOpen, cartLines, cartSubtotal, updateQty, removeLine, toast } = useStore()
  const [busyLine, setBusyLine] = useState(null)

  // lock scroll while open
  useEffect(() => {
    document.body.style.overflow = cartOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [cartOpen])

  if (!cartOpen) return null

  const lineKey = (l) => `${l.productId}-${l.size}-${l.color}`

  const runLine = async (l, action) => {
    setBusyLine(lineKey(l))
    try {
      await action()
    } catch (err) {
      toast(err.message || 'Something went wrong — try again')
    } finally {
      setBusyLine(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[75]">
      <div className="absolute inset-0 bg-ink/45" onClick={() => setCartOpen(false)} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-bg-primary shadow-2xl">
        <div className="flex items-center justify-between border-b border-line-soft px-6 py-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.24em]">Your Bag ({cartLines.length})</p>
          <button type="button" onClick={() => setCartOpen(false)} aria-label="Close bag" className="p-1 hover:opacity-60">
            <CloseIcon />
          </button>
        </div>

        {cartLines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <BagIcon size={44} className="text-ink-soft/50" />
            <p className="text-sm text-ink-soft">Your bag is empty.</p>
            <Link to="/new-arrivals" onClick={() => setCartOpen(false)} className="ak-btn-dark">
              Shop New Arrivals
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-line-soft overflow-y-auto px-6">
              {cartLines.map((l) => (
                <li key={lineKey(l)} className="flex gap-4 py-4">
                  <Link to={productHref(l)} onClick={() => setCartOpen(false)} className="w-20 shrink-0">
                    <div className="aspect-[4/5] bg-bg-primary">
                      <ProductImage src={l.product.images[0]} alt={l.product.name} className="h-full w-full object-cover" />
                    </div>
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-medium">{l.product.name}</p>
                        <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-ink-soft">
                          {l.color} / Size {l.size}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => runLine(l, () => removeLine(l.productId, l.size, l.color))}
                        disabled={busyLine === lineKey(l)}
                        aria-label={`Remove ${l.product.name}`}
                        className="p-1 text-ink-soft hover:text-accent disabled:opacity-40"
                      >
                        <TrashIcon size={15} />
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <div className="flex items-center border border-line-soft">
                        <button
                          type="button"
                          onClick={() => runLine(l, () => updateQty(l.productId, l.size, l.color, l.qty - 1))}
                          disabled={busyLine === lineKey(l)}
                          aria-label="Decrease quantity"
                          className="p-1.5 hover:bg-bg-secondary disabled:opacity-40"
                        >
                          <MinusIcon size={13} />
                        </button>
                        <span className="w-8 text-center text-xs">{l.qty}</span>
                        <button
                          type="button"
                          onClick={() => runLine(l, () => updateQty(l.productId, l.size, l.color, l.qty + 1))}
                          disabled={busyLine === lineKey(l)}
                          aria-label="Increase quantity"
                          className="p-1.5 hover:bg-bg-secondary disabled:opacity-40"
                        >
                          <PlusIcon size={13} />
                        </button>
                      </div>
                      <p className="text-[13px] font-medium">{fmt((l.price ?? l.product.salePrice ?? l.product.price) * l.qty)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-line-soft px-6 py-5">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Subtotal</span>
                <span>{fmt(cartSubtotal)}</span>
              </div>
              <Link to="/cart" onClick={() => setCartOpen(false)} className="ak-btn-dark mt-4 w-full">
                View Bag
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
