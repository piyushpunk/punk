import { useCallback, useEffect, useState } from 'react'
import { useStore } from '../context/StoreContext'
import { api } from '../lib/api'

// ==================================================================
// AdminOrders — store-wide order management table. Lives on /orders
// below the customer's own history (admins only). The API re-checks
// the admin role server-side on every call; this is UX, not security.
// ==================================================================

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const NEXT_STATUSES = {
  pending_payment: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
}

const STATUS_FILTERS = [
  '',
  'pending_payment',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]

export default function AdminOrders() {
  const { toast, apiLive } = useStore()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [statusBusyId, setStatusBusyId] = useState(null)

  const loadOrders = useCallback(
    async (status = statusFilter) => {
      setLoading(true)
      setError(null)
      try {
        const data = await api.adminAllOrders(status ? { status, limit: 100 } : { limit: 100 })
        setOrders(data.orders || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [statusFilter],
  )

  // Load once the API is reachable (also re-fires when it comes back
  // after a cold start while this component is already mounted).
  useEffect(() => {
    if (apiLive) loadOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiLive])

  const changeStatus = async (order, next) => {
    setStatusBusyId(order._id)
    try {
      await api.adminUpdateOrderStatus(order._id, next)
      setOrders((prev) =>
        prev.map((o) => (o._id === order._id ? { ...o, currentStatus: next } : o)),
      )
      toast(`Order ${order.orderNumber} → ${next}`)
    } catch (err) {
      toast(err.message)
    } finally {
      setStatusBusyId(null)
    }
  }

  return (
    <div className="mt-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">Admin</p>
          <h2 className="mt-1 text-lg font-semibold uppercase tracking-[0.14em]">All Customer Orders</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s || 'all'}
              type="button"
              onClick={() => { setStatusFilter(s); loadOrders(s) }}
              disabled={loading}
              className={`border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                statusFilter === s
                  ? 'border-ink bg-olive text-bg-primary'
                  : 'border-line-soft bg-bg-primary text-ink-soft hover:border-ink hover:text-ink'
              }`}
            >
              {s ? s.replace('_', ' ') : 'All'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-4 border border-accent bg-accent/10 px-4 py-3 text-sm text-accent">{error}</p>
      )}

      <div className="mt-4 overflow-x-auto border border-line-soft bg-bg-primary">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-line-soft text-[10px] uppercase tracking-[0.18em] text-ink-soft">
              <th className="px-4 py-3 font-semibold">Order</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Items</th>
              <th className="px-4 py-3 font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Payment</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Advance</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o._id} className="border-b border-line-soft/60 align-top">
                <td className="px-4 py-4">
                  <p className="font-mono text-[12px] font-semibold">{o.orderNumber}</p>
                  <p className="mt-1 text-[11px] text-ink-soft">
                    {new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <p className="text-[13px] font-medium">{o.user?.name || '—'}</p>
                  <p className="text-[11px] text-ink-soft">{o.user?.email || ''}</p>
                </td>
                <td className="px-4 py-4 text-[12px]">
                  {(o.items || []).map((it, i) => (
                    <p key={i} className={i ? 'mt-1 text-ink-soft' : ''}>
                      {it.quantity}× {it.name}
                      <span className="text-ink-soft"> · {it.size}{it.color ? ` / ${it.color}` : ''}</span>
                    </p>
                  ))}
                </td>
                <td className="px-4 py-4 font-semibold">{fmt(o.total)}</td>
                <td className="px-4 py-4">
                  <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${
                    o.payment?.status === 'captured' || o.payment?.status === 'authorized'
                      ? 'text-ink'
                      : o.payment?.status === 'failed'
                        ? 'text-accent'
                        : 'text-ink-soft'
                  }`}>
                    {o.payment?.status || 'unpaid'}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <span className="border border-line-soft px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
                    {o.currentStatus?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    {(NEXT_STATUSES[o.currentStatus] || []).map((next) => (
                      <button
                        key={next}
                        type="button"
                        onClick={() => changeStatus(o, next)}
                        disabled={statusBusyId === o._id}
                        className={`border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors disabled:opacity-50 ${
                          next === 'cancelled' || next === 'refunded'
                            ? 'border-line-soft text-accent hover:border-accent'
                            : 'border-ink text-ink hover:bg-olive hover:text-bg-primary'
                        }`}
                      >
                        {next.replace('_', ' ')}
                      </button>
                    ))}
                    {!(NEXT_STATUSES[o.currentStatus] || []).length && (
                      <span className="text-[11px] text-ink-soft">final</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !error && orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-soft">
                  No orders {statusFilter ? `with status “${statusFilter.replace('_', ' ')}”` : 'yet'}.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-ink-soft">Loading orders…</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
