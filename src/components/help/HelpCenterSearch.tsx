'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Search } from 'lucide-react';

import type { HelpSearchResult } from '@/lib/help-search';
import {
  HELP_CENTER_ARTICLES,
  HELP_CENTER_CATEGORIES,
} from '@/lib/help-center-content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HelpCenterSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HelpSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      const id = window.setTimeout(() => setResults(null), 0);
      return () => window.clearTimeout(id);
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/help/search?q=${encodeURIComponent(q)}`);
        const json = await res.json();
        setResults(json.data || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const showSearchResults = results !== null;

  return (
    <>
      <div className="relative mt-8 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          className="input w-full pl-10"
          placeholder="Search the knowledge base…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search help articles"
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-teal-600" />
        ) : null}
      </div>

      {showSearchResults ? (
        <div className="mt-10 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {results.length === 0 ? 'No results' : `${results.length} result${results.length === 1 ? '' : 's'}`}
          </h2>
          {results.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Try different keywords — e.g. &quot;VAT&quot;, &quot;OCR&quot;, &quot;WhatsApp&quot;, or &quot;mandate&quot;.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {results.map((article) => (
                <Card key={article.slug} className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{article.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-2">{article.snippet}</CardDescription>
                    <p className="mb-4 text-xs text-[var(--text-muted)]">{article.category}</p>
                    <Link
                      href={article.href}
                      className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
                    >
                      Read guide →
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
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
      )}
    </>
  );
}
