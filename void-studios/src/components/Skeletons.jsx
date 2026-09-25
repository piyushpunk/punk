// ==================================================================
// Skeleton loaders — block-shaped placeholders shown while the API
// catalog loads, so pages settle into position instead of snapping
// in from a bare "Loading…" line.
//
// Shapes mirror the real components they stand in for:
//   SkeletonCard   → ProductCard (image tile + title + price)
//   SkeletonGrid   → ProductGrid (n cards, same column classes)
//   SkeletonProduct → ProductPage (gallery + buy panel)
// The shimmer lives in index.css (.ak-skeleton) — one palette tweak
// covers every skeleton site.
// ==================================================================

/** One pulsing block. size=cover fills its container, size=line is a text bar. */
export function SkeletonBlock({ className = '', size = 'line' }) {
  return (
    <div
      aria-hidden="true"
      className={`ak-skeleton ${size === 'cover' ? 'h-full w-full' : 'h-3 w-full'} ${className}`}
    />
  )
}

/** Matches ProductCard: 4:5 image tile, hover bar, title line, price line. */
export function SkeletonCard() {
  return (
    <div className="flex flex-col" aria-hidden="true">
      <div className="relative overflow-hidden bg-white">
        <div className="aspect-[4/5] w-full">
          <SkeletonBlock size="cover" />
        </div>
      </div>
      <div className="flex items-start justify-between gap-3 pt-3">
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-3.5 w-3/4" />
          <SkeletonBlock className="h-2.5 w-1/2" />
        </div>
        <SkeletonBlock className="h-3.5 w-12 shrink-0" />
      </div>
    </div>
  )
}

const COLUMN_CLASSES = {
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
}

/** Matches ProductGrid's responsive columns so the swap is seamless. */
export function SkeletonGrid({ count = 8, columns = 4 }) {
  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-2 md:gap-x-6 ${COLUMN_CLASSES[columns] ?? COLUMN_CLASSES[4]}`}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

/** Matches ProductPage: gallery left, buy panel right, related strip below. */
export function SkeletonProduct() {
  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-14" aria-hidden="true">
      {/* gallery */}
      <div>
        <div className="relative aspect-[4/5] bg-white">
          <SkeletonBlock size="cover" />
        </div>
        <div className="mt-3 flex gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="aspect-[4/5] w-20 bg-white">
              <SkeletonBlock size="cover" />
            </div>
          ))}
        </div>
      </div>
      {/* info + buy panel */}
      <div className="space-y-6">
        <SkeletonBlock className="h-6 w-2/3" />
        <SkeletonBlock className="h-5 w-24" />
        <div className="space-y-2 pt-2">
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-3 w-11/12" />
          <SkeletonBlock className="h-3 w-4/5" />
        </div>
        <div className="flex gap-2 pt-2">
          {['XS', 'S', 'M', 'L', 'XL'].map((s) => (
            <SkeletonBlock key={s} className="h-11 w-12" />
          ))}
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <SkeletonBlock key={i} className="h-11 w-20" />
          ))}
        </div>
        <div className="flex gap-3 pt-2">
          <SkeletonBlock className="h-12 flex-1" />
          <SkeletonBlock className="h-12 w-14" />
        </div>
      </div>
    </div>
  )
}
