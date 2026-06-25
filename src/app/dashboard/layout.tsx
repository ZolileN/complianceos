'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { NAV_ITEMS } from '@/lib/constants';
import Logo from '@/components/Logo';

const icons: Record<string, string> = {
  grid: '⊞', users: '👥', user: '👤', 'check-square': '☑', 'git-branch': '⑂', folder: '📁', 'message-circle': '💬', shield: '🛡️', activity: '📊', settings: '⚙️'
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
        { href: '/dashboard/settings', label: 'Settings', icon: 'settings' },
      ];
    }

    return NAV_ITEMS;
  };

  // ── Notifications ──
  interface NotificationItem {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    link: string | null;
    createdAt: string;
  }

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then(({ data }) => {
        if (data) setNotifications(data);
      })
      .catch((err) => console.error('Error fetching notifications:', err));
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    if (!n.read) {
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
      try {
        await fetch('/api/notifications', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: n.id }),
        });
      } catch (err) {
        console.error('Error marking read:', err);
      }
    }
    setDropdownOpen(false);
    if (n.link) {
      router.push(n.link);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

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
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
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
      } else if ((['praxisone', 'mlk-computer-consulting'].includes(user.tenantSlug as string) || ['@praxisone.com', '@mlkcomputer.com'].some(d => user.email?.endsWith(d)))) {
        router.push('/admin');
      }
    }
  }, [loading, user, tenant, signOut, router]);

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
            <Link href="/dashboard/settings?tab=personal" style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
              <div className="header-avatar" style={{ cursor: 'pointer' }}>{user?.name?.[0] || 'U'}</div>
              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</div>
              </div>
            </Link>
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
        <div className="header-actions" style={{ position: 'relative' }}>
          <div ref={notificationsRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button 
              className="btn btn-ghost btn-icon" 
              title="Notifications" 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{ position: 'relative' }}
            >
              🔔
              {unreadCount > 0 && (
                <span className="badge-notification">{unreadCount}</span>
              )}
            </button>

            {dropdownOpen && (
              <div className="notifications-dropdown card card-glass animate-in">
                <div className="notifications-header">
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button 
                      className="btn btn-xs" 
                      onClick={handleMarkAllRead} 
                      style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="notifications-list">
                  {notifications.length === 0 ? (
                    <div className="notifications-empty">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div 
                        key={n.id} 
                        className={`notification-item ${!n.read ? 'unread' : ''}`}
                        onClick={() => handleNotificationClick(n)}
                      >
                        <div className="notification-title">
                          {!n.read && <span className="notification-unread-dot" />}
                          {n.title}
                        </div>
                        <div className="notification-desc">{n.message}</div>
                        <div className="notification-time">{new Date(n.createdAt).toLocaleDateString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <Link href="/dashboard/settings?tab=personal" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="header-avatar" style={{ cursor: 'pointer' }}>{user?.name?.[0] || 'U'}</div>
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="main-content">{children}</main>

      <style jsx>{`
        @media (max-width: 768px) {
          #mobile-menu-btn { display: flex !important; }
        }

        .badge-notification {
          position: absolute;
          top: -2px;
          right: -2px;
          background: var(--red, #ef4444);
          color: white;
          border-radius: 9999px;
          padding: 1px 4px;
          font-size: 0.65rem;
          font-weight: bold;
          line-height: 1;
          min-width: 12px;
          text-align: center;
        }

        .notifications-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 320px;
          max-height: 400px;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          padding: 0;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
        }

        .notifications-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
        }

        .notifications-list {
          overflow-y: auto;
          flex: 1;
        }

        .notifications-empty {
          padding: 24px;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        .notification-item {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.04));
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .notification-item:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .notification-item.unread {
          background: rgba(255, 255, 255, 0.015);
        }

        .notification-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text, #f8fafc);
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }

        .notification-unread-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent, #10b981);
          display: inline-block;
          flex-shrink: 0;
        }

        .notification-desc {
          font-size: 0.75rem;
          color: var(--text-muted, #94a3b8);
          line-height: 1.4;
          margin-bottom: 4px;
        }

        .notification-time {
          font-size: 0.65rem;
          color: var(--text-muted);
          opacity: 0.8;
        }
      `}</style>
    </>
  );
}
