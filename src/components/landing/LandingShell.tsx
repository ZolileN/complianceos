'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, Moon, Sun, X } from 'lucide-react';
import Logo from '@/components/Logo';
import BookDemoModal from '@/components/BookDemoModal';
import ContactModal from '@/components/ContactModal';
import ContactSalesModal from '@/components/ContactSalesModal';
import RefundPolicyModal from '@/components/RefundPolicyModal';
import ScrollLink from '@/components/ScrollLink';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

const NAV_LINKS = [
  ['#features', 'Features'],
  ['#solutions', 'Solutions'],
  ['#how-it-works', 'How it works'],
  ['#dashboard', 'Dashboard'],
  ['#pricing', 'Plans'],
  ['#testimonials', 'Testimonials'],
  ['#faq', 'FAQ'],
] as const;

export default function LandingShell({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className={`precision-ops min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <header className="sticky top-0 z-50 border-b border-[var(--border-primary)] bg-[var(--bg-card)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex shrink-0 items-center">
            <Logo size={32} showText tone={theme === 'dark' ? 'dark' : 'light'} />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map(([href, label]) => (
              <ScrollLink
                key={href}
                href={href}
                className="text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-teal-700 dark:hover:text-teal-400"
              >
                {label}
              </ScrollLink>
            ))}
            <Link
              href="/help"
              className="text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-teal-700 dark:hover:text-teal-400"
            >
              Help
            </Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileNavOpen((open) => !open)}
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
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
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <a href="#book-demo" className="hidden sm:block">
              <Button variant="outline" size="sm">
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

        {mobileNavOpen ? (
          <nav className="border-t border-[var(--border-primary)] bg-[var(--bg-card)] px-6 py-4 md:hidden">
            <ul className="space-y-3">
              {NAV_LINKS.map(([href, label]) => (
                <li key={href}>
                  <ScrollLink
                    href={href}
                    onClick={closeMobileNav}
                    className="block text-sm font-medium text-[var(--text-secondary)]"
                  >
                    {label}
                  </ScrollLink>
                </li>
              ))}
              <li>
                <Link
                  href="/help"
                  onClick={closeMobileNav}
                  className="block text-sm font-medium text-[var(--text-secondary)]"
                >
                  Help
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  onClick={closeMobileNav}
                  className="block text-sm font-medium text-[var(--text-secondary)]"
                >
                  Sign in
                </Link>
              </li>
            </ul>
          </nav>
        ) : null}
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
              <li><Link href="/help">Help center</Link></li>
              <li><Link href="/security">Security</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Legal
            </h4>
            <ul className="space-y-2 text-sm text-[var(--text-secondary)]">
              <li><a href="#contact">Contact</a></li>
              <li><Link href="/privacy">Privacy policy</Link></li>
              <li><Link href="/terms">Terms of service</Link></li>
              <li><Link href="/cookies">Cookie policy</Link></li>
              <li><Link href="/refund-policy">Refund policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--border-primary)] px-6 py-4 text-center text-xs text-[var(--text-muted)]">
          © {new Date().getFullYear()} PraxisOne. All rights reserved.
          <span className="mx-2" aria-hidden="true">·</span>
          <Link href="/privacy" className="hover:text-teal-700 hover:underline dark:hover:text-teal-400">
            Privacy
          </Link>
          <span className="mx-2" aria-hidden="true">·</span>
          <Link href="/terms" className="hover:text-teal-700 hover:underline dark:hover:text-teal-400">
            Terms
          </Link>
          <span className="mx-2" aria-hidden="true">·</span>
          <Link href="/refund-policy" className="hover:text-teal-700 hover:underline dark:hover:text-teal-400">
            Refund policy
          </Link>
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
      <RefundPolicyModal />
    </div>
  );
}
