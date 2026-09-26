import { useState } from 'react'

// Renders the product image; when the file is missing (placeholder era),
// shows a designed skeleton slot so grids look intentional, not broken.
export default function ProductImage({ src, alt, className = '', priority = false }) {
  const [failed, setFailed] = useState(false)

  if (failed || !src) {
    // Sizing comes from the caller's className only — hardcoding h-full w-full
    // here overrode fixed-size thumbs (e.g. h-12 in the admin table), which
    // blew the placeholder up to full width and crushed adjacent table columns.
    // Hairline border keeps white placeholders visible on the white canvas.
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 border border-line-soft bg-bg-secondary text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <span className="font-wordmark text-3xl uppercase tracking-wide text-ink/15">
          AKUMA
        </span>
        <span className="text-[9px] uppercase tracking-[0.3em] text-ink-soft/60">
          Image coming soon
        </span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      // `priority` = above-the-fold LCP image (hero): eager + fetchpriority=high.
      // Lazy-loading the hero was delaying the largest paint on every page.
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding={priority ? 'sync' : 'async'}
      onError={() => setFailed(true)}
      className={className}
    />
  )
}
