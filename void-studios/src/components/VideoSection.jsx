import { useRef, useState } from 'react'
import ProductImage from './ProductImage'

// Campaign section. With a `banner` it shows the still artwork; with an
// mp4 `src` it becomes a playable video (poster shows until play).
export default function VideoSection({ src, poster, banner, heading }) {
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  const toggle = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play()
      setPlaying(true)
    } else {
      v.pause()
      setPlaying(false)
    }
  }

  return (
    <section className="bg-bg-primary py-16 sm:py-20">
      <div className="ak-shell">
        {heading && <h2 className="ak-section-title mb-8 text-center">{heading}</h2>}
        <div className="relative aspect-video overflow-hidden border border-line-soft bg-bg-secondary">
          {src ? (
            <video
              ref={videoRef}
              src={src}
              poster={poster}
              className="h-full w-full object-cover"
              loop
              muted
              playsInline
              onClick={toggle}
            />
          ) : banner ? (
            <ProductImage src={banner} alt={heading || 'AKUMA campaign'} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3">
              <span className="font-wordmark text-4xl uppercase tracking-wide text-ink/15">AKUMA</span>
              <span className="text-[12px] uppercase tracking-[0.3em] text-ink-soft/60">Campaign film coming soon</span>
            </div>
          )}

          {src && !playing && (
            <button
              type="button"
              onClick={toggle}
              aria-label="Play video"
              className="absolute inset-0 flex items-center justify-center bg-ink/20 transition-colors hover:bg-ink/30"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-bg-primary text-bg-primary">
                ▶
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
