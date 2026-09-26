import { Link } from 'react-router-dom'
import ProductImage from './ProductImage'

// Editorial "media + text" split (GENRAGE architecture). `flip` swaps sides.
export default function EditorialSplit({ heading, copy, cta, to = '/new-arrivals', img, flip = false }) {
  return (
    <section className="bg-bg-secondary py-16 sm:py-20">
      <div className={`ak-shell grid items-center gap-10 lg:grid-cols-2 lg:gap-16`}>
        <div className={flip ? 'lg:order-2' : ''}>
          <div className="aspect-[4/3] overflow-hidden border border-line-soft bg-bg-primary">
            <ProductImage src={img} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
        <div className={flip ? 'lg:order-1' : ''}>
          <h2 className="ak-section-title">{heading}</h2>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-soft">{copy}</p>
          {cta && (
            <Link to={to} className="ak-btn-outline mt-8">{cta}</Link>
          )}
        </div>
      </div>
    </section>
  )
}
