// Multi-column info band (GENRAGE-style) — quick reassurance links.
const COLS = [
  { title: 'Easy 7-Day Exchange', copy: 'Size not right? Exchange within a week, no questions.' },
  { title: 'Talk to Us', copy: 'DM on Instagram or WhatsApp — a human replies, not a bot.' },
]

export default function InfoColumns() {
  return (
    <section className="border-y border-line-soft bg-bg-primary">
      <div className="ak-shell grid gap-8 py-12 sm:grid-cols-3">
        {COLS.map((c) => (
          <div key={c.title} className="text-center sm:text-left">
            <h3 className="text-[13px] font-bold uppercase tracking-[0.2em]">{c.title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{c.copy}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
