import RefundPolicy from '../content/refund-policy.md?raw'
import { MarkdownBlocks } from './PrivacyPolicyPage'
import { useSeo } from '../lib/seo'

// /refund — renders src/content/refund-policy.md. Same markdown renderer as
// the privacy/terms pages; edit the markdown, page follows.
export default function RefundPolicyPage() {
  useSeo({
    title: 'Return & Exchange Policy',
    description: 'AKUMA returns, size exchanges (₹199 fee, 3-day window) and refunds for defective items — timelines and eligibility explained.',
    path: '/refund',
  })
  return (
    <div className="bg-bg-primary">
      <div className="ak-shell max-w-3xl py-12 sm:py-16">
        <h1 className="font-wordmark text-4xl leading-none tracking-[-0.01em] text-ink sm:text-5xl">
          Return &amp; Exchange Policy
        </h1>
        <div className="mt-6">
          <MarkdownBlocks md={RefundPolicy} />
        </div>
      </div>
    </div>
  )
}
