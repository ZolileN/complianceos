'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Gauge,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  Server,
  Sun,
  Terminal,
  UsersRound,
  Webhook,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import Logo from '@/components/Logo';

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/admin', label: 'Fleet Overview', icon: Gauge },
  { href: '/admin/team', label: 'Platform Team', icon: UsersRound },
  { href: '/admin/audit-logs', label: 'System Audit Logs', icon: ScrollText },
  { href: '/admin/webhooks', label: 'Webhook & Metering', icon: Webhook },
  { href: '/admin/infrastructure', label: 'Infrastructure & Tuning', icon: Server },
  { href: '/admin/console', label: 'Debug Console', icon: Terminal },
];

const ADMIN_SLUGS = ['praxisone', 'mlk-computer-consulting'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const isAuthorized =
    !!user &&
    user.role === 'administrator' &&
    ADMIN_SLUGS.includes(user.tenantSlug as string);

  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (!isAuthorized) {
        router.push('/dashboard?error=unauthorized');
      }
    }
  }, [loading, user, isAuthorized, router]);

  if (loading || !isAuthorized) {
    return (
      <div
        className={`precision-ops ${theme === 'dark' ? 'dark' : ''} flex-center`}
        style={{ minHeight: '100vh', flexDirection: 'column', gap: 14 }}
      >
        <span className="spinner" style={{ width: 36, height: 36 }} />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
          Authorising administrator context…
        </span>
      </div>
    );
  }

  return (
    <div className={`precision-ops ${theme === 'dark' ? 'dark' : ''}`}>
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo" style={{ justifyContent: 'space-between' }}>
          <Logo size={28} showText={true} tone={theme === 'dark' ? 'dark' : 'light'} />
          <span
            style={{
              background: 'var(--accent-muted)',
              color: 'var(--accent-strong)',
              fontSize: '0.6rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 5,
              letterSpacing: '0.08em',
            }}
          >
            ADMIN
          </span>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-label">Control plane</div>
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="nav-icon" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link
              href="/admin/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flex: 1,
                minWidth: 0,
                textDecoration: 'none',
                color: 'inherit',
              }}
              title="View profile"
            >
              <div className="header-avatar" style={{ cursor: 'pointer' }}>
                {user.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Platform admin</div>
              </div>
            </Link>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => signOut()}
              title="Exit admin panel"
              aria-label="Exit admin panel"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {/* Header */}
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{ display: 'none' }}
            id="admin-mobile-menu-btn"
            aria-label="Open navigation"
          >
            <Menu size={19} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Control plane</span>
            <span style={{ color: 'var(--border-primary)' }}>/</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>
              Precision Ops Admin
            </span>
          </div>
        </div>
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link href="/admin/profile" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="header-avatar" style={{ cursor: 'pointer' }}>
              {user.name?.[0]?.toUpperCase() || 'A'}
            </div>
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="main-content">{children}</main>

      <style jsx>{`
        @media (max-width: 768px) {
          #admin-mobile-menu-btn {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}
