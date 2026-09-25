import { Link } from 'react-router-dom'

import { useSeo } from '../lib/seo'

export default function NotFoundPage() {
  useSeo({ title: 'Page Not Found', path: '/404', noindex: true })
  return (
    <div className="bg-bg-primary">
      <div className="ak-shell flex flex-col items-center py-28 text-center">
        <p className="font-wordmark text-7xl tracking-[-0.01em] text-ink/15">404</p>
        <h1 className="ak-section-title mt-4">Page not found</h1>
        <p className="mt-2 text-sm text-ink-soft">The piece you're after may have sold out with the drop.</p>
        <Link to="/" className="ak-btn-dark mt-8">Back to Home</Link>
      </div>
    </div>
  )
}
