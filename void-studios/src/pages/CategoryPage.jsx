import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import ProductGrid from '../components/ProductGrid'
import { useStore } from '../context/StoreContext'
import { useSeo } from '../lib/seo'


// Single reusable listing page — every category, subcategory and
// collection route renders this with a different filter. No duplication.
const SUBCATEGORY_LABELS = {
  tshirts: 'T-Shirts',
  hoodies: 'Hoodies',
  jackets: 'Jackets',
  'full-sleeve': 'Full Sleeve T-Shirts',
  'tank-tops': 'Tank Tops',
  pants: 'Pants',
  jeans: 'Jeans',
  shorts: 'Shorts',
}

const CATEGORY_TITLES = { tops: 'Tops', bottoms: 'Bottoms', accessories: 'Accessories' }

export default function CategoryPage({ mode, id, apiLive }) {
  const { subcategory } = useParams()
  const { catalog } = useStore()

  const { title, crumbs, products } = useMemo(() => {
    if (mode === 'collection') {
      const titles = { 'new-arrivals': 'New Arrivals', sale: 'Sale', basics: 'Basics' }
      return {
        title: titles[id],
        crumbs: [{ label: 'Home', to: '/' }, { label: titles[id] }],
        products:
          id === 'sale'
            ? catalog.filter((p) => p.salePrice != null)
            : catalog.filter((p) => p.collections?.includes(id)),
      }
    }
    if (mode === 'subcategory') {
      const label = SUBCATEGORY_LABELS[subcategory] ?? subcategory
      return {
        title: label,
        crumbs: [
          { label: 'Home', to: '/' },
          { label: CATEGORY_TITLES[id], to: `/${id}` },
          { label },
        ],
        products: catalog.filter((p) => p.category === id && p.subcategory === subcategory),
      }
    }
    // category parent page
    return {
      title: CATEGORY_TITLES[id],
      crumbs: [{ label: 'Home', to: '/' }, { label: CATEGORY_TITLES[id] }],
      products: catalog.filter((p) => p.category === id),
    }
  }, [mode, id, subcategory, catalog])

  // Per-route meta + canonical so each category ranks on its own URL
  const seoPath =
    mode === 'subcategory' ? `/${id}/${subcategory}` : mode === 'collection' ? `/${id}` : `/${id}`
  useSeo({
    title,
    description: `Shop ${title?.toLowerCase()} from AKUMA — heavyweight streetwear, limited drops, no restocks. Free shipping above ₹5,000.`,
    path: seoPath,
  })

  return (
    <div className="bg-bg-primary">
      {/* page head */}
      <div className="border-b border-line-soft bg-bg-secondary py-10 sm:py-14">
        <div className="ak-shell">
          <nav aria-label="Breadcrumb" className="text-[10px] uppercase tracking-[0.2em] text-ink-soft">
            {crumbs.map((c, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-2">/</span>}
                {c.to ? (
                  <Link to={c.to} className="hover:underline hover:underline-offset-4">{c.label}</Link>
                ) : (
                  <span className="text-ink">{c.label}</span>
                )}
              </span>
            ))}
          </nav>
          <h1 className="ak-section-title mt-3">{title}</h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-ink-soft">
            {products.length} {products.length === 1 ? 'piece' : 'pieces'}
          </p>
        </div>
      </div>

      <div className="ak-shell py-12">
        {/* API still loading its first page — don't flash the empty state */}
        {apiLive === null && products.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-wordmark text-2xl uppercase text-ink/25">Loading…</p>
          </div>
        ) : products.length ? (
          <ProductGrid products={products} />
        ) : (
          <div className="py-20 text-center">
            <p className="font-wordmark text-2xl uppercase text-ink/25">Nothing here yet</p>
            <p className="mt-2 text-sm text-ink-soft">This drop hasn't landed. Check back soon.</p>
            <Link to="/new-arrivals" className="ak-btn-dark mt-6">Shop New Arrivals</Link>
          </div>
        )}
      </div>
    </div>
  )
}
