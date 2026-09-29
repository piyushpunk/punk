import { Link } from 'react-router-dom'
import { HERO_SLIDES, resolveMedia } from '../content/content'
import ProductImage from './ProductImage'
import { useStore } from '../context/StoreContext'

// Static hero banner — single full-width image (no carousel: no autoplay,
// no dots, no arrows). Artwork comes from the admin Site Media override
// when set, otherwise the built-in default in content.js.
export default function HeroSlideshow() {
  const { siteMedia } = useStore()
  const slide = HERO_SLIDES[0]
  if (!slide) return null

  return (
    <section className="relative">
      {/* Phones: box matches the artwork's 16:9 ratio so the WHOLE image is
          visible (object-cover into a tall portrait box zooms into a ~30%
          slice and the art becomes unreadable). Tablets/desktop keep the
          tall immersive hero. */}
      <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-bg-secondary md:aspect-auto md:h-[calc(100svh-6rem)] md:min-h-[540px]">
        {/* --- static media layer (absolute so it never competes with the
            overlay content for flex space — in-flow images squeeze the
            layout and shove the text sideways) --- */}
        <div className="absolute inset-0">
          <ProductImage src={resolveMedia(siteMedia, 'hero')} alt="AKUMA" priority className="h-full w-full object-cover" />
        </div>

        {/* --- overlay content: tagline chip and wordmark removed by owner
            request — the artwork speaks for itself. An invisible spacer
            reserves the wordmark's old slot (same clamp-sized box) so the
            CTA keeps the exact below-center spot it had when the wordmark
            sat above it. The sr-only H1 keeps the homepage's SEO heading
            intact. --- */}
        <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
          <h1 className="sr-only">AKUMA — Bold Streetwear</h1>
          <div aria-hidden="true" className="invisible select-none font-wordmark text-[clamp(2.5rem,8.5vw,6.5rem)] leading-[0.9] tracking-[-0.01em]">AKUMA</div>
          <Link to={slide.to} className="ak-btn-dark mt-2">{slide.cta}</Link>
        </div>
      </div>
    </section>
  )
}
