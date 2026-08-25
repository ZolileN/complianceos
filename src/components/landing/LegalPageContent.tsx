import type { ReactNode } from 'react';
import Link from 'next/link';

export type LegalSection = {
  title: string;
  paragraphs: readonly string[];
};

type LegalPageContentProps = {
  tag: string;
  title: string;
  lastUpdated: string;
  sections: readonly LegalSection[];
  footerNote?: ReactNode;
};

export default function LegalPageContent({
  tag,
  title,
  lastUpdated,
  sections,
  footerNote,
}: LegalPageContentProps) {
  return (
    <article className="mx-auto max-w-[720px] px-6 py-16">
      <p className="text-sm font-medium text-teal-700 dark:text-teal-400">{tag}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
        {title}
      </h1>
      <p className="mt-3 text-sm text-[var(--text-muted)]">Last updated: {lastUpdated}</p>

      <div className="mt-10 space-y-10">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{section.title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {footerNote ? (
        <div className="mt-12 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-5 text-sm text-[var(--text-secondary)]">
          {footerNote}
        </div>
      ) : null}
    </article>
  );
}

export function legalContactFooter() {
  return (
    <p>
      Questions?{' '}
      <Link href="/#contact" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
        Contact us
      </Link>{' '}
      or review related policies:{' '}
      <Link href="/privacy" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
        Privacy
      </Link>
      ,{' '}
      <Link href="/terms" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
        Terms
      </Link>
      ,{' '}
      <Link href="/cookies" className="font-medium text-teal-700 hover:underline dark:text-teal-400">
        Cookies
      </Link>
      .
    </p>
  );
}
