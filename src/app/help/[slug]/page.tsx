import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import LandingShell from '@/components/landing/LandingShell';
import { Button } from '@/components/ui/button';
import { getHelpArticle, HELP_ARTICLES } from '@/lib/help-articles';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return HELP_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getHelpArticle(slug);
  if (!article) return { title: 'Help | PraxisOne' };
  return {
    title: `${article.title} | Help Center | PraxisOne`,
    description: article.summary,
    alternates: { canonical: `/help/${slug}` },
  };
}

export default async function HelpArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = getHelpArticle(slug);
  if (!article) notFound();

  return (
    <LandingShell>
      <div className="mx-auto max-w-[720px] px-6 py-16">
        <p className="text-sm font-medium text-teal-700 dark:text-teal-400">
          <Link href="/help" className="hover:underline">
            Help center
          </Link>
          {' · '}
          {article.category}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
          {article.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{article.summary}</p>

        <div className="prose prose-slate mt-10 max-w-none dark:prose-invert">
          {article.sections.map((section, idx) => (
            <section key={idx} className="mb-8">
              {section.heading ? (
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">{section.heading}</h2>
              ) : null}
              {section.paragraphs.map((p, pIdx) => (
                <p key={pIdx} className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {p}
                </p>
              ))}
              {section.bullets ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--text-secondary)]">
                  {section.bullets.map((b, bIdx) => (
                    <li key={bIdx}>{b}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3 border-t border-[var(--border-primary)] pt-8">
          <Link href="/help">
            <Button variant="outline">← All guides</Button>
          </Link>
          <Link href="/signup?plan=starter">
            <Button variant="primary">Start free trial</Button>
          </Link>
        </div>
      </div>
    </LandingShell>
  );
}
