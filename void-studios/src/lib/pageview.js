// ==================================================================
// First-party pageview tracking — a tiny GA4 stand-in.
//
// Google Analytics is wired in index.html but was never given a real
// measurement ID, so visitor counts were invisible to the owner. This
// module records every route change in the store's own database and
// feeds the /admin/traffic panel. No cookies, no PII, no third
// parties — just path + referrer + an anonymous localStorage id.
//
// Deliberately fire-and-forget: tracking must NEVER break the store,
// so every failure path is silently swallowed.
// ==================================================================

const VISITOR_KEY = 'akuma_vid'

/** Stable per-browser random id (localStorage, no cookies). */
function visitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) {
      id = 'v-' + crypto.randomUUID().replace(/-/g, '').slice(0, 24)
      localStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    return 'v-anon' // private mode with storage blocked — still counted
  }
}

/**
 * Fire a pageview for the given route. Used by App's location-effect —
 * one event per navigation, not per re-render.
 */
export function trackPageView(path) {
  if (!path || !path.startsWith('/')) return
  // The backend admin surface should not pollute the storefront's
  // traffic numbers with the owner's own sessions.
  if (path.startsWith('/admin')) return

  const body = {
    path,
    visitor: visitorId(),
    ref: document.referrer && document.referrer !== location.origin + path ? document.referrer : '',
  }

  const base = import.meta.env.VITE_API_URL || '/api/v1'
  // plain fetch — no wake-retry churn for a fire-and-forget event
  fetch(`${base.replace(/\/+$/, '')}/pageviews`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {})
}
