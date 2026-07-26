'use client';

import React from 'react';
import Link from 'next/link';
import { Moon, Sun } from 'lucide-react';
import Logo from '@/components/Logo';
import BookDemoModal from '@/components/BookDemoModal';
import ContactModal from '@/components/ContactModal';
import ContactSalesModal from '@/components/ContactSalesModal';
import ScrollLink from '@/components/ScrollLink';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

export default function LandingShell({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={`precision-ops min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <header className="sticky top-0 z-50 border-b border-[var(--border-primary)] bg-[var(--bg-card)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex shrink-0 items-center">
            <Logo size={32} showText tone={theme === 'dark' ? 'dark' : 'light'} />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {[
              ['#features', 'Features'],
              ['#solutions', 'Solutions'],
              ['#how-it-works', 'How it works'],
              ['#dashboard', 'Dashboard'],
              ['#pricing', 'Plans'],
              ['#faq', 'FAQ'],
            ].map(([href, label]) => (
              <ScrollLink
                key={href}
                href={href}
                className="text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-teal-700 dark:hover:text-teal-400"
              >
                {label}
              </ScrollLink>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <a href="#book-demo">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                Book demo
              </Button>
            </a>
            <Link href="/signup?plan=starter">
              <Button variant="primary" size="sm">
                Start trial
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-6 py-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo size={24} showText tone={theme === 'dark' ? 'dark' : 'light'} />
            <p className="mt-3 max-w-md text-sm text-[var(--text-secondary)]">
              The operating system for South African compliance, accounting, and advisory
              firms — clients, documents, workflows, and WhatsApp in one workspace.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Product
            </h4>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li><ScrollLink href="#features">Features</ScrollLink></li>
              <li><ScrollLink href="#dashboard">Dashboard</ScrollLink></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Company
            </h4>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li><a href="#book-demo">Book demo</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--border-primary)] px-6 py-4 text-center text-xs text-[var(--text-muted)]">
          © {new Date().getFullYear()} PraxisOne. All rights reserved.
          <span className="mx-2" aria-hidden="true">·</span>
          A product of{' '}
          <a
            href="https://www.mlkcomputer.com/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-teal-700 transition-colors hover:text-teal-800 hover:underline dark:text-teal-400 dark:hover:text-teal-300"
          >
            MLK Computer Consulting
          </a>
        </div>
      </footer>

      <BookDemoModal />
      <ContactModal />
      <ContactSalesModal />
    </div>
  );
}
