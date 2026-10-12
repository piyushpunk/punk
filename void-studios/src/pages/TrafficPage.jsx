import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import { api } from '../lib/api'
import { useSeo } from '../lib/seo'

// ==================================================================
// /admin/traffic — owner-facing visitor counts from the store's own
// database (no Google Analytics). Shows views + unique visitors per
// day for a selectable window, top pages, and where visitors came
// from. Same guard chain as /admin/site-media; the API re-checks
// admin server-side.
// ==================================================================

const WINDOWS = [7, 14, 30, 90]
const nf = new Intl.NumberFormat('en-IN')

export default function TrafficPage() {
  useSeo({ title: 'Traffic — Admin', path: '/admin/traffic', noindex: true })
  const { user, apiLive, boot } = useStore()
  const isAdmin = user?.role === 'admin'

  const [days, setDays] = useState(14)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    setLoading(true)
    setError(null)
    api.traffic(days)
      .then((data) => { if (!cancelled) setSummary(data) })
      .catch((err) => { if (!cancelled) setError(err.message || 'Traffic data unavailable') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [days, isAdmin])

  if (apiLive === false) {
    return (
      <div className="bg-bg-primary">
        <div className="ak-shell flex flex-col items-center py-24 text-center">
          <h1 className="ak-section-title">Traffic</h1>
          <p className="mt-2 max-w-md text-sm text-ink-soft">
            Traffic data needs the backend API — which didn&apos;t respond just now.
            The hosted server may be waking up (free tier sleeps when idle).
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={retrying}
              onClick={async () => {
                setRetrying(true)
                await boot()
                setRetrying(false)
              }}
              className="ak-btn-dark disabled:opacity-60"
            >
              {retrying ? 'Connecting… (can take ~1 min)' : 'Retry connection'}
            </button>
            <Link to="/" className="ak-btn-outline">Back to Store</Link>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="bg-bg-primary">
        <div className="ak-shell flex flex-col items-center py-24 text-center">
          <h1 className="ak-section-title">Traffic</h1>
          <p className="mt-2 text-sm text-ink-soft">Sign in with an admin account to see visitor traffic.</p>
          <div className="mt-8 flex gap-3">
            <Link to="/login" className="ak-btn-dark">Log In</Link>
            <Link to="/" className="ak-btn-outline">Back to Store</Link>
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="bg-bg-primary">
        <div className="ak-shell flex flex-col items-center py-24 text-center">
          <h1 className="ak-section-title">Admin access required</h1>
          <p className="mt-2 max-w-md text-sm text-ink-soft">
            You&apos;re signed in as <span className="font-medium text-ink">{user.email}</span>, which
            isn&apos;t an admin account. Ask a store owner to promote your role.
          </p>
          <Link to="/account" className="ak-btn-outline mt-8">Back to Account</Link>
        </div>
      </div>
    )
  }

  const totals = summary?.totals || { views: 0, visitors: 0 }
  const daily = summary?.daily || []
  const maxDaily = Math.max(1, ...daily.map((d) => d.views))
  const topPaths = summary?.topPaths || []
  const topReferrers = summary?.topReferrers || []

  return (
    <div className="bg-bg-primary">
      <div className="ak-shell py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">Admin</p>
            <h1 className="ak-section-title mt-1">Traffic</h1>
            <p className="mt-1 max-w-2xl text-sm text-ink-soft">
              Visitor counts recorded by the store itself — every page a shopper opens,
              no Google Analytics. Counts start from when tracking went live.
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/admin" className="ak-btn-outline">Product Dashboard →</Link>
            <Link to="/admin/site-media" className="ak-btn-outline hidden sm:block">Site Media →</Link>
            <Link to="/" className="ak-btn-outline">View Store</Link>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft">Window</span>
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setDays(w)}
              className={`px-3 py-1.5 text-[11px] uppercase tracking-wide transition-colors ${
                days === w
                  ? 'bg-ink text-bg-primary'
                  : 'border border-line-soft text-ink-soft hover:border-ink hover:text-ink'
              }`}
            >
              {w}d
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-6 border border-accent bg-accent/10 px-4 py-3 text-sm text-accent">{error}</p>
        )}

        {loading && !summary ? (
          <div className="mt-8 space-y-3">
            <div className="h-16 w-full max-w-xs bg-bg-secondary" />
            <div className="h-40 w-full bg-bg-secondary" />
          </div>
        ) : summary ? (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="border border-ink p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft">Page views</p>
                <p className="mt-2 text-4xl font-semibold">{nf.format(totals.views)}</p>
                <p className="mt-1 text-xs text-ink-soft">last {days} days</p>
              </div>
              <div className="border border-ink p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-soft">Unique visitors</p>
                <p className="mt-2 text-4xl font-semibold">{nf.format(totals.visitors)}</p>
                <p className="mt-1 text-xs text-ink-soft">per browser, last {days} days</p>
              </div>
            </div>

            {daily.length > 0 && (
              <section className="mt-10 border border-line-soft p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em]">Daily views</h2>
                <div className="mt-4 flex items-end gap-1.5 overflow-x-auto pb-2" style={{ height: 140 }}>
                  {daily.map((d) => (
                    <div key={d._id} className="group relative flex min-w-[14px] flex-1 flex-col items-center justify-end" style={{ height: '100%' }}>
                      <span className="pointer-events-none absolute -top-1 hidden whitespace-nowrap bg-ink px-1.5 py-0.5 text-[10px] text-bg-primary group-hover:block">
                        {d._id}: {d.views} views · {d.unique} visitors
                      </span>
                      <div
                        className="w-full bg-olive transition-colors group-hover:bg-accent"
                        style={{ height: `${Math.max(4, (d.views / maxDaily) * 100)}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-ink-soft">
                  <span>{daily[0]?._id}</span>
                  <span>{daily[daily.length - 1]?._id}</span>
                </div>
              </section>
            )}

            <div className="mt-10 grid gap-8 lg:grid-cols-2">
              <section className="border border-line-soft p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em]">Top pages</h2>
                {topPaths.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-soft">Nothing recorded yet in this window.</p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {topPaths.map((p) => (
                      <li key={p._id} className="flex items-baseline justify-between gap-4 text-sm">
                        <span className="truncate font-mono text-xs">{p._id}</span>
                        <span className="shrink-0 tabular-nums">{nf.format(p.views)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="border border-line-soft p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em]">Traffic sources</h2>
                {topReferrers.length === 0 ? (
                  <p className="mt-3 text-sm text-ink-soft">Nothing recorded yet in this window.</p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {topReferrers.map((r) => (
                      <li key={r.host} className="flex items-baseline justify-between gap-4 text-sm">
                        <span className="truncate">{r.host}</span>
                        <span className="shrink-0 tabular-nums">{nf.format(r.views)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-3 text-xs text-ink-soft">&quot;direct&quot; = typed the address, bookmark, or app link.</p>
              </section>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
