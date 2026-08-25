'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'praxisone-cookie-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        setVisible(!localStorage.getItem(STORAGE_KEY));
      } catch {
        setVisible(true);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const accept = (value: 'all' | 'essential') => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-[var(--border-primary)] bg-[var(--bg-card)]/95 p-4 shadow-lg backdrop-blur-md sm:p-5"
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 text-sm text-[var(--text-secondary)]">
          <p className="font-medium text-[var(--text-primary)]">We use cookies</p>
          <p className="mt-1 leading-relaxed">
            Essential cookies keep you signed in. Analytics cookies help us improve PraxisOne. See
            our{' '}
            <Link href="/cookies" className="text-teal-700 hover:underline dark:text-teal-400">
              Cookie Policy
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-teal-700 hover:underline dark:text-teal-400">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => accept('essential')}>
            Essential only
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={() => accept('all')}>
            Accept all
          </Button>
          <button
            type="button"
            className="rounded-md p-2 text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
            aria-label="Dismiss"
            onClick={() => accept('essential')}
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
