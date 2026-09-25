import { MARQUEE_PRIMARY, MARQUEE_SECONDARY } from '../content/content'

// Infinite CSS marquee — content rendered twice; the track translates
// -50% so the loop is seamless. Preset names pick the copy from content.js.
export default function MarqueeStrip({ preset = 'primary', dark = true, className = '' }) {
  const items = preset === 'secondary' ? MARQUEE_SECONDARY : MARQUEE_PRIMARY
  const row = [...items, ...items]

  return (
    <div
      className={`overflow-hidden border-y py-3.5 ${dark ? 'border-ink bg-ink text-bg-primary' : 'border-line-soft bg-bg-secondary text-ink'} ${className}`}
    >
      <div className="ak-marquee flex w-max items-center gap-10 whitespace-nowrap">
        {row.map((item, i) => (
          <span key={i} className="flex items-center gap-10 text-[12px] font-bold uppercase tracking-[0.3em]">
            {item}
            <span aria-hidden="true" className={dark ? 'text-bg-primary/40' : 'text-ink/30'}>✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}
