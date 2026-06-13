'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { NAV_ITEMS } from '@/lib/constants';

const icons: Record<string, string> = {
  grid: '⊞', users: '👥', 'check-square': '☑', 'git-branch': '⑂', folder: '📁', 'message-circle': '💬',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, tenant, signOut, loading } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        window.location.href = '/login';
      } else if (!tenant) {
        // If the DB was wiped but the cookie remains, the user won't have a valid tenant
        signOut();
      }
    }
  }, [loading, user, tenant, signOut]);

  if (loading) {
    return <div className="flex-center" style={{ minHeight: '100vh' }}><span className="spinner" style={{ width: 40, height: 40 }} /></div>;
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">C</div>
          <h1>ComplianceOS</h1>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                <span className="nav-icon">{icons[item.icon] || '•'}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="header-avatar">{user?.name?.[0] || 'U'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={signOut} title="Sign out" style={{ fontSize: '1rem' }}>⏻</button>
          </div>
        </div>
      </aside>

      {/* Header */}
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-ghost btn-icon" onClick={() => setSidebarOpen(!sidebarOpen)} style={{ display: 'none' }} id="mobile-menu-btn">☰</button>
          <div className="header-search">
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>⌕</span>
            <input type="text" placeholder="Search clients, tasks, documents..." />
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost btn-icon" title="Notifications">🔔</button>
          <div className="header-avatar">{user?.name?.[0] || 'U'}</div>
        </div>
      </header>

      {/* Main */}
      <main className="main-content">{children}</main>

      <style jsx>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}
