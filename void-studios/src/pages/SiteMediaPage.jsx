import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../context/StoreContext'
import SiteMediaManager from '../components/SiteMediaManager'
import { useSeo } from '../lib/seo'

// ==================================================================
// /admin/site-media — dedicated owner area for managing the fixed
// storefront imagery (hero, campaign, editorial, menu tiles). Same
// guard chain as /admin; the API re-checks the role server-side on
// every mutation, so these screens are UX, not security.
// ==================================================================
export default function SiteMediaPage() {
  useSeo({ title: 'Site Media — Admin', path: '/admin/site-media', noindex: true })
  const { user, apiLive, boot } = useStore()
  const isAdmin = user?.role === 'admin'
  const [retrying, setRetrying] = useState(false)

  if (apiLive === false) {
    return (
      <div className="bg-bg-primary">
        <div className="ak-shell flex flex-col items-center py-24 text-center">
          <h1 className="ak-section-title">Site Media</h1>
          <p className="mt-2 max-w-md text-sm text-ink-soft">
            Media management needs the backend API — which didn&apos;t respond just now.
            The hosted server may be waking up (free tier sleeps when idle).
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              disabled={retrying}
              onClick={async () => {
                setRetrying(true)
                await boot() // waits for the wake-up, no page reload needed
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
          <h1 className="ak-section-title">Site Media</h1>
          <p className="mt-2 text-sm text-ink-soft">Sign in with an admin account to manage site media.</p>
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

  return (
    <div className="bg-bg-primary">
      <div className="ak-shell py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent">Admin</p>
            <h1 className="ak-section-title mt-1">Site Media</h1>
          </div>
          <div className="flex gap-3">
            <Link to="/admin" className="ak-btn-outline">Product Dashboard →</Link>
            <Link to="/" className="ak-btn-outline">View Store</Link>
          </div>
        </div>

        <div className="mt-8">
          <SiteMediaManager />
        </div>
      </div>
    </div>
  )
}
