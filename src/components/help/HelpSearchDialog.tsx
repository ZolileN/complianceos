'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Loader2, Search, X } from 'lucide-react';

import type { HelpSearchResult } from '@/lib/help-search';
import { Button } from '@/components/ui/button';

type HelpSearchDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function HelpSearchDialog({ open, onClose }: HelpSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<HelpSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/help/search?q=${encodeURIComponent(q)}&limit=12`);
      const json = await res.json();
      setResults(json.data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      void runSearch(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [open, query, runSearch]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm">
      <div
        role="dialog"
        aria-label="Search help articles"
        className="w-full max-w-xl overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-[var(--border-primary)] px-4 py-3">
          <Search className="size-4 text-[var(--text-muted)]" />
          <input
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none"
            placeholder="Search guides — VAT, OCR, WhatsApp, clients…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading ? <Loader2 className="size-4 animate-spin text-teal-600" /> : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
            aria-label="Close help search"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {query.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">
              Type at least 2 characters to search the knowledge base.
            </p>
          ) : results.length === 0 && !loading ? (
            <p className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">
              No guides matched &quot;{query}&quot;.
            </p>
          ) : (
            <ul className="space-y-1">
              {results.map((result) => (
                <li key={result.slug}>
                  <Link
                    href={result.href}
                    onClick={onClose}
                    className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--bg-secondary)]"
                    {...(result.href.startsWith('/help')
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{result.title}</p>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">{result.category}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">
                          {result.snippet}
                        </p>
                      </div>
                      <BookOpen className="mt-0.5 size-4 shrink-0 text-teal-600" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-[var(--border-primary)] px-4 py-2 text-xs text-[var(--text-muted)]">
          <Link href="/help" onClick={onClose} className="text-teal-700 hover:underline dark:text-teal-400">
            Browse all guides →
          </Link>
        </div>
      </div>
    </div>
  );
}
