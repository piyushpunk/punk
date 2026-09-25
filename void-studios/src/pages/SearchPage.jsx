import { useSearchParams, Link } from 'react-router-dom'
import ProductGrid from '../components/ProductGrid'
import { useStore } from '../context/StoreContext'
import { useSeo } from '../lib/seo'

export default function SearchPage() {
  useSeo({ title: 'Search', path: '/search', noindex: true })
  const [params] = useSearchParams()
  const { catalog, apiLive } = useStore()
  const q = (params.get('q') ?? '').trim()
  const term = q.toLowerCase()

  const results = term
    ? catalog.filter((p) =>
        `${p.name} ${p.category} ${p.subcategory} ${p.description}`.toLowerCase().includes(term),
      )
    : []

  return (
    <div className="bg-bg-primary">
      <div className="ak-shell py-10 sm:py-14">
        <h1 className="ak-section-title">
          {q ? `Search: “${q}”` : 'Search'}
        </h1>
        <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-ink-soft">
          {q ? `${results.length} ${results.length === 1 ? 'result' : 'results'}` : 'Type in the search bar above to look for pieces.'}
        </p>

        <div className="mt-10">
          {apiLive === null && results.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-wordmark text-2xl uppercase text-ink/25">Loading…</p>
            </div>
          ) : results.length ? (
            <ProductGrid products={results} />
          ) : (
            <div className="py-16 text-center">
              <p className="text-sm text-ink-soft">
                {q ? 'Nothing matched. Try "hoodie", "tee", "jeans"…' : ''}
              </p>
              <Link to="/new-arrivals" className="ak-btn-dark mt-6">Browse New Arrivals</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
