import PrivacyPolicy from '../content/privacy-policy.md?raw'
import { useStore } from '../context/StoreContext'
import { useSeo } from '../lib/seo'

// Minimal markdown rendering for the policy document: H1/H2/H3, italics
// (the last-updated line), bullet lists, bold text and inline links.
// Keeps the doc as the single source of truth (docs/privacy-policy.md) so
// editing the policy never requires touching this component.
function renderInline(text) {
  const parts = []
  // split on **bold** and [text](url) and *italic* — simple, ordered
  const regex = /(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))|(\*[^*]+\*)/g
  let last = 0
  let m
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const token = m[0]
    if (token.startsWith('**')) {
      parts.push(<strong key={m.index}>{token.slice(2, -2)}</strong>)
    } else if (token.startsWith('[')) {
      const label = token.slice(1, token.indexOf(']'))
      const href = token.slice(token.indexOf(']') + 2, -1)
      parts.push(
        <a key={m.index} href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
          {label}
        </a>,
      )
    } else {
      parts.push(<em key={m.index}>{token.slice(1, -1)}</em>)
    }
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export function MarkdownBlocks({ md }) {
  const lines = md.split('\n')
  const out = []
  let listItems = []

  const flushList = (key) => {
    if (listItems.length) {
      out.push(
        <ul key={`ul-${key}`} className="my-4 list-disc space-y-2 pl-6 text-[14px] leading-relaxed text-ink-soft">
          {listItems.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>,
      )
      listItems = []
    }
  }

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd()
    if (/^- /.test(line.trim())) {
      listItems.push(line.trim().slice(2))
      return
    }
    flushList(idx)
    if (!line.trim() || line.trim() === '---') return
    if (line.startsWith('# ')) return // docs' H1 is duplicated by the page's own <h1>
    if (line.startsWith('## ')) {
      out.push(
        <h2 key={idx} className="mt-12 border-t border-line-soft pt-8 text-xl font-semibold tracking-tight text-ink first:mt-0 first:border-0 first:pt-0 sm:text-2xl">
          {line.slice(3)}
        </h2>,
      )
    } else if (line.startsWith('### ')) {
      out.push(
        <h3 key={idx} className="mt-8 text-[15px] font-semibold uppercase tracking-[0.14em] text-ink">
          {line.slice(4)}
        </h3>,
      )
    } else {
      out.push(
        <p key={idx} className="mt-4 text-[14px] leading-relaxed text-ink-soft">
          {renderInline(line)}
        </p>,
      )
    }
  })
  flushList('end')
  return <>{out}</>
}

export default function PrivacyPolicyPage() {
  useSeo({
    title: 'Privacy Policy',
    description: 'How AKUMA collects, uses and protects your personal data — accounts, orders, cookies and your rights under India’s DPDP Act.',
    path: '/privacy',
  })
  const { toast } = useStore()
  // The policy body contains [PLACEHOLDER: …] tags the owner fills in —
  // surface a reminder strip so unfinished placeholders are never shipped silently.
  const hasPlaceholders = /\[PLACEHOLDER[^\]]*\]/.test(PrivacyPolicy)

  return (
    <div className="bg-bg-primary">
      <div className="ak-shell max-w-3xl py-12 sm:py-16">
        {hasPlaceholders && (
          <div className="mb-8 border border-accent/40 bg-accent/5 p-4 text-[12px] leading-relaxed text-accent">
            Draft notice: this policy still contains [PLACEHOLDER] tags (legal name, address,
            contact details, payment gateway). Fill them in before going live with payments.
          </div>
        )}
        <h1 className="font-wordmark text-4xl leading-none tracking-[-0.01em] text-ink sm:text-5xl">
          Privacy Policy
        </h1>
        <div className="mt-6">
          <MarkdownBlocks md={PrivacyPolicy} />
        </div>
      </div>
    </div>
  )
}
