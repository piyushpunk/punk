import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useStore } from '../context/StoreContext'

// ==================================================================
// ProductReviews — real customer reviews for the product page.
// Backend contract: GET /reviews/product/:productId (public, paginated,
// one review per user per product, verifiedPurchase computed server-
// side from delivered orders). Writing requires sign-in; the form
// doubles as the edit flow because the API upserts.
// ==================================================================

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function Stars({ value, size = 14, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true"
          className={n <= value ? 'fill-accent' : 'fill-line-soft'}>
          <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      ))}
    </span>
  )
}

function StarPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className="p-0.5 transition-transform hover:scale-110"
        >
          <svg width={22} height={22} viewBox="0 0 20 20" aria-hidden="true"
            className={n <= value ? 'fill-accent' : 'fill-line-soft'}>
            <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

export default function ProductReviews({ productId, productName }) {
  const { user, toast } = useStore()
  const [data, setData] = useState(null) // { reviews, total, avgRating? }
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [rating, setMyRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const d = await api.productReviews(productId, { limit: 20 })
      setData(d)
      const mine = user ? (d.reviews || []).find((r) => r.user?._id === user.id) : null
      if (mine) {
        setMyRating(mine.rating)
        setComment(mine.comment || '')
      }
    } catch {
      // Backend asleep (502 even after retries) or route missing on the
      // stale deployment — hide the section quietly instead of erroring.
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [productId, user])

  useEffect(() => {
    load()
  }, [load])

  const submit = async (e) => {
    e.preventDefault()
    if (!rating) {
      setFormError('Pick a star rating first.')
      return
    }
    setBusy(true)
    setFormError(null)
    try {
      await api.addReview(productId, { rating, comment: comment.trim() })
      toast('Review posted — thank you!')
      await load()
    } catch (err) {
      if (err.status === 401) {
        setFormError('Please sign in to review.')
      } else {
        setFormError(err.message || 'Could not save your review.')
      }
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id) => {
    setBusy(true)
    try {
      await api.deleteReview(id)
      setMyRating(0)
      setComment('')
      toast('Review deleted')
      await load()
    } catch (err) {
      setFormError(err.message || 'Could not delete the review.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <section className="mt-20 border-t border-line-soft pt-10">
        <h2 className="ak-section-title">Reviews</h2>
        <div className="mt-6 animate-pulse space-y-3">
          <div className="h-4 w-40 bg-bg-secondary" />
          <div className="h-4 w-64 bg-bg-secondary" />
        </div>
      </section>
    )
  }

  // Quietly absent when the API can't answer (cold start / old backend).
  if (loadError) return null

  const reviews = data?.reviews || []
  const total = data?.total || 0
  const avg = total
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0

  return (
    <section className="mt-20 border-t border-line-soft pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="ak-section-title">Reviews</h2>
        {total > 0 && (
          <p className="flex items-center gap-2 text-sm text-ink-soft">
            <Stars value={Math.round(avg)} />
            <span className="font-semibold text-ink">{avg}</span> · {total} review{total > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* ── list ── */}
      {total > 0 ? (
        <ul className="mt-8 grid gap-x-10 gap-y-8 lg:grid-cols-2">
          {reviews.map((r) => {
            const mine = user && r.user?._id === user.id
            return (
              <li key={r._id} className="border-b border-line-soft pb-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="text-sm font-semibold text-ink">{r.user?.name || 'Customer'}</span>
                    {r.verifiedPurchase && (
                      <span className="border border-olive px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-olive">
                        Verified purchase
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-ink-soft">{fmtDate(r.createdAt)}</span>
                </div>
                {r.comment && <p className="mt-2 text-sm leading-relaxed text-ink-soft">{r.comment}</p>}
                <div className="mt-2 flex gap-4 text-[11px] uppercase tracking-[0.16em] text-ink-soft">
                  {mine && <button type="button" disabled={busy} onClick={() => { setMyRating(r.rating); setComment(r.comment || ''); document.getElementById('review-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }} className="hover:text-ink">Edit</button>}
                  {mine && <button type="button" disabled={busy} onClick={() => remove(r._id)} className="hover:text-accent">Delete</button>}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-ink-soft">
          No reviews yet — be the first to rate {productName || 'this piece'}.
        </p>
      )}

      {/* ── write / edit ── */}
      <form id="review-form" onSubmit={submit} className="mt-10 max-w-xl border border-line-soft bg-bg-primary p-6">
        <h3 className="text-sm font-bold uppercase tracking-[0.2em]">
          {rating && reviews.some((r) => r.user?._id === user?.id) ? 'Update your review' : 'Write a review'}
        </h3>

        {!user ? (
          <p className="mt-3 text-sm text-ink-soft">
            <Link to="/login" className="font-semibold text-ink underline underline-offset-4">Sign in</Link>
            {' '}to leave a review — only customers with a delivered order get the “Verified purchase” badge.
          </p>
        ) : (
          <>
            <div className="mt-4">
              <StarPicker value={rating} onChange={setMyRating} />
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="How's the fabric, fit, print? (optional)"
              className="mt-4 w-full border border-line-soft bg-bg-primary px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none"
            />
            {formError && <p className="mt-3 text-[12px] font-medium text-accent">{formError}</p>}
            <button type="submit" disabled={busy} className="ak-btn-dark mt-4 w-full disabled:opacity-40">
              {busy ? 'Saving…' : 'Post review'}
            </button>
          </>
        )}
      </form>
    </section>
  )
}
