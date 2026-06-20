'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { NAV_ITEMS } from '@/lib/constants';
import Logo from '@/components/Logo';

const icons: Record<string, string> = {
  grid: '⊞', users: '👥', user: '👤', 'check-square': '☑', 'git-branch': '⑂', folder: '📁', 'message-circle': '💬', shield: '🛡️', activity: '📊'
};

interface SearchResult {
  id: string;
  company_name: string;
  status: string;
  registration_number?: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, tenant, signOut, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'client') {
      fetch('/api/clients')
        .then((r) => r.json())
        .then(({ data }) => {
          if (data && data[0]) {
            setClientId(data[0].id);
          }
        })
        .catch((err) => console.error(err));
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'client' && clientId && pathname === '/dashboard') {
      router.push(`/dashboard/clients/${clientId}`);
    }
  }, [user, clientId, pathname, router]);

  const getFilteredNavItems = () => {
    if (!user) return [];
    
    if (user.role === 'client') {
      return [
        { href: clientId ? `/dashboard/clients/${clientId}` : '/dashboard', label: 'My Company', icon: 'grid' },
        { href: '/dashboard/documents', label: 'Documents', icon: 'folder' },
        { href: '/dashboard/inbox', label: 'Inbox', icon: 'message-circle' },
      ];
    }
    
    if (user.role === 'consultant') {
      return [
        { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
        { href: '/dashboard/clients', label: 'Clients', icon: 'users' },
        { href: '/dashboard/compliance', label: 'Compliance', icon: 'shield' },
        { href: '/dashboard/tasks', label: 'Tasks', icon: 'check-square' },
        { href: '/dashboard/documents', label: 'Documents', icon: 'folder' },
        { href: '/dashboard/inbox', label: 'Inbox', icon: 'message-circle' },
      ];
    }

    if (user.role === 'administrator') {
      return [
        ...NAV_ITEMS,
        { href: '/dashboard/audit-logs', label: 'Audit Logs', icon: 'activity' },
      ];
    }

    return NAV_ITEMS;
  };

  // ── Global Search ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchQuery.trim().length < 2) return;
    const timer = setTimeout(() => {
      setSearchLoading(true);
      fetch(`/api/clients?search=${encodeURIComponent(searchQuery)}&limit=5`)
        .then((r) => r.json())
        .then(({ data }) => {
          setSearchResults(data || []);
          setShowDropdown(true);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelectResult = (id: string) => {
    setSearchQuery('');
    setShowDropdown(false);
    router.push(`/dashboard/clients/${id}`);
  };

  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        window.location.href = '/login';
      } else if (!tenant) {
        signOut();
      }
    }
  }, [loading, user, tenant, signOut]);

  if (loading) {
    return <div className="flex-center" style={{ minHeight: '100vh' }}><span className="spinner" style={{ width: 40, height: 40 }} /></div>;
  }

  const statusBadge = (s: string) => {
    const m: Record<string, string> = { active: 'badge-green', inactive: 'badge-gray', onboarding: 'badge-blue' };
    return m[s] || 'badge-gray';
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }} onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <Logo size={28} showText={true} />
        </div>
        <nav className="sidebar-nav">
          {getFilteredNavItems().map((item) => {
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
          {/* Global Search */}
          {user?.role !== 'client' && (
            <div className="search-wrapper" ref={searchRef}>
              <div className="header-search">
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {searchLoading ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 1.5 }} /> : '⌕'}
                </span>
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    if (!val.trim() || val.length < 2) {
                      setSearchResults([]);
                      setShowDropdown(false);
                    }
                  }}
                  onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); setShowDropdown(false); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', lineHeight: 1 }}
                  >
                    ✕
                  </button>
                )}
              </div>
              {showDropdown && (
                <div className="search-dropdown">
                  {searchResults.length === 0 ? (
                    <div className="search-empty">No clients found for &quot;{searchQuery}&quot;</div>
                  ) : (
                    searchResults.map((r) => (
                      <div key={r.id} className="search-result-item" onClick={() => handleSelectResult(r.id)}>
                        <div>
                          <div className="search-result-name">{r.company_name}</div>
                          {r.registration_number && <div className="search-result-meta">{r.registration_number}</div>}
                        </div>
                        <span className={`badge ${statusBadge(r.status)}`}>{r.status}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
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
