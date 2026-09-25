import { Link } from 'react-router-dom'
import { BRAND, FOOTER_LINKS } from '../content/content'
import { InstagramIcon, WhatsAppIcon } from './Icons'

// Dark charcoal footer — anchors the pastel page (--text-primary bg, --bg-primary text).
export default function Footer() {
  const socialIcons = { Instagram: InstagramIcon, WhatsApp: WhatsAppIcon }

  return (
    <footer className="bg-ink text-white">
      <div className="ak-shell grid gap-10 py-14 sm:grid-cols-3 lg:gap-8">
        {/* brand */}
        <div>
          <p className="font-wordmark text-2xl tracking-[-0.01em]">AKUMA</p>
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-white/80">
            {BRAND.footerBlurb}
          </p>
          <div className="mt-5 flex gap-3">
            {FOOTER_LINKS.social.map((s) => {
              const Icon = socialIcons[s.label]
              return (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center border border-white/30 transition-colors hover:border-white"
                >
                  <Icon size={16} />
                </a>
              )
            })}
          </div>
        </div>

        {/* shop */}
        <nav aria-label="Shop">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">Shop</p>
          <ul className="mt-4 space-y-2.5">
            {FOOTER_LINKS.shop.map((l) => (
              <li key={l.label}>
                <Link to={l.to} className="text-[13px] text-white/85 transition-colors hover:text-white hover:underline hover:underline-offset-4">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* support */}
        <nav aria-label="Support">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">Support</p>
          <ul className="mt-4 space-y-2.5">
            {FOOTER_LINKS.support.map((l) => {
              // entries with `href` are external (mailto:, social) — plain anchor;
              // everything else routes internally
              const classes = "text-[13px] text-white/85 transition-colors hover:text-white hover:underline hover:underline-offset-4"
              return (
                <li key={l.label}>
                  {l.href ? (
                    <a href={l.href} className={classes}>{l.label}</a>
                  ) : (
                    <Link to={l.to} className={classes}>{l.label}</Link>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

      </div>

      <div className="border-t border-white/15">
        <div className="ak-shell flex flex-col items-center justify-center gap-3 py-5 text-[10px] uppercase tracking-[0.22em] text-white/60 sm:flex-row">
          <p>{BRAND.copyright} · {BRAND.madeIn}</p>
        </div>
      </div>
    </footer>
  )
}
