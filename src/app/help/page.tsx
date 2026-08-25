import type { Metadata } from 'next';
import Link from 'next/link';

import LandingShell from '@/components/landing/LandingShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  HELP_CENTER_ARTICLES,
  HELP_CENTER_CATEGORIES,
} from '@/lib/help-center-content';

const PAGE_TITLE = 'Help Center | PraxisOne';
const PAGE_DESCRIPTION =
  'Guides for getting started with PraxisOne — clients, compliance, documents, WhatsApp, and billing.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/help' },
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    url: '/help',
    siteName: 'PraxisOne',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

export default function HelpCenterPage() {
  return (
    <LandingShell>
      <div className="mx-auto max-w-[960px] px-6 py-16">
        <p className="text-sm font-medium text-teal-700 dark:text-teal-400">Help center</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
          How can we help?
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
          Quick guides for firms using PraxisOne. Sign in for full dashboard access, or start a
          free Starter trial.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup?plan=starter">
            <Button variant="primary">Start free trial</Button>
          </Link>
          <Link href="/login">
            <Button variant="outline">Sign in</Button>
          </Link>
          <a href="#contact">
            <Button variant="ghost">Contact support</Button>
          </a>
        </div>

        <div className="mt-14 space-y-12">
          {HELP_CENTER_CATEGORIES.map((category) => {
            const articles = HELP_CENTER_ARTICLES.filter((a) => a.category === category);
            if (articles.length === 0) return null;
            return (
              <section key={category}>
                <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">{category}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {articles.map((article) => (
                    <Card key={article.title} className="h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{article.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="mb-4">{article.summary}</CardDescription>
                        <Link
                          href={article.href}
                          className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
                        >
                          Learn more →
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-14 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-secondary)]">
          <p className="font-medium text-[var(--text-primary)]">Still need help?</p>
          <p className="mt-2">
            Use the Contact form on our homepage or email the address on your invoice. For
            security concerns, see our{' '}
            <Link href="/security" className="text-teal-700 hover:underline dark:text-teal-400">
              Security page
            </Link>
            .
          </p>
        </div>
      </div>
    </LandingShell>
  );
}
