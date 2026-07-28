import Link from 'next/link';

import {
  REFUND_POLICY_LAST_UPDATED,
  REFUND_POLICY_SECTIONS,
} from '@/lib/refund-policy-content';

export default function RefundPolicyContent() {
  return (
    <article className="mx-auto max-w-[720px] px-6 py-16">
      <p className="text-sm font-medium text-teal-700 dark:text-teal-400">Legal</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
        Refund &amp; cancellation policy
      </h1>
      <p className="mt-3 text-sm text-[var(--text-muted)]">
        Last updated: {REFUND_POLICY_LAST_UPDATED}
      </p>

      <div className="mt-10 space-y-10">
        {REFUND_POLICY_SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {section.title}
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-5 text-sm text-[var(--text-secondary)]">
        <p>
          Need help with billing?{' '}
          <Link href="/#contact" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            Contact us
          </Link>{' '}
          or review your plan from{' '}
          <Link href="/login" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
            Sign in
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
