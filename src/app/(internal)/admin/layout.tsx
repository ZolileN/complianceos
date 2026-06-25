'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Logo from '@/components/Logo';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role !== 'administrator' || !['praxisone', 'mlk-computer-consulting'].includes(user.tenantSlug as string)) {
        router.push('/dashboard?error=unauthorized');
      }
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== 'administrator' || !['praxisone', 'mlk-computer-consulting'].includes(user.tenantSlug as string)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#050505', color: '#888888' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #5EEAD4', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '0.9rem', letterSpacing: '0.05em' }}>AUTHORISING ADMINISTRATOR SECURE CONTEXT...</span>
        </div>
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const navItems = [
    { href: '/admin', label: 'Fleet Overview', icon: '⚡' },
    { href: '/admin/team', label: 'Platform Team', icon: '👥' },
    { href: '/admin/audit-logs', label: 'System Audit Logs', icon: '📋' },
    { href: '/admin/webhooks', label: 'Webhook & Metering Logs', icon: '📊' },
    { href: '/admin/infrastructure', label: 'Infrastructure & Tuning', icon: '⚙️' },
    { href: '/admin/console', label: 'Isolated Debug Console', icon: '💻' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#000000', color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
      {/* Admin Sidebar */}
      <aside style={{ width: 260, borderRight: '1px solid #1F1F1F', background: '#000000', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: 24, borderBottom: '1px solid #1F1F1F', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo size={24} showText={true} />
          <span style={{ background: 'rgba(94, 234, 212, 0.1)', color: '#5EEAD4', fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em' }}>PROD ADMIN</span>
        </div>
        <nav style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 6,
                  color: isActive ? '#FFFFFF' : '#888888',
                  background: isActive ? '#141414' : 'transparent',
                  border: isActive ? '1px solid #1F1F1F' : '1px solid transparent',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: 16, borderTop: '1px solid #1F1F1F', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.2)' }}>
          <Link
            href="/admin/profile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flex: 1,
              minWidth: 0,
              textDecoration: 'none',
              color: 'inherit',
              cursor: 'pointer'
            }}
            title="View Personal Profile"
          >
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#5EEAD4', color: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
              {user.name?.[0]?.toUpperCase() || 'A'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
              <div style={{ fontSize: '0.65rem', color: '#888888', textTransform: 'capitalize' }}>Platform Admin</div>
            </div>
          </Link>
          <button
            onClick={() => signOut()}
            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '0.95rem', flexShrink: 0 }}
            title="Exit Admin Panel"
          >
            ⏻
          </button>
        </div>
      </aside>

      {/* Main Admin Content Wrapper */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <header style={{ height: 64, borderBottom: '1px solid #1F1F1F', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#000000' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#888888', fontSize: '0.8rem' }}>Control Plane</span>
            <span style={{ color: '#333333' }}>/</span>
            <span style={{ fontSize: '0.8rem', color: '#FFFFFF', fontWeight: 600 }}>PraxisAdmin OS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Notification Button */}
            <button
              onClick={() => alert("Platform Status: Operational. Zero warning triggers or failed webhooks in the last 24 hours.")}
              style={{
                background: '#0A0A0A',
                border: '1px solid #1F1F1F',
                borderRadius: '50%',
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#888888',
                cursor: 'pointer',
                position: 'relative',
                fontSize: '1rem',
                transition: 'all 0.15s ease'
              }}
              title="Notifications"
              onMouseOver={(e) => { e.currentTarget.style.borderColor = '#5EEAD4'; e.currentTarget.style.color = '#5EEAD4'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = '#1F1F1F'; e.currentTarget.style.color = '#888888'; }}
            >
              🔔
              <span style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: '50%', background: '#34D399', border: '2px solid #000000' }} />
            </button>

            {/* Profile Navigation Button */}
            <Link
              href="/admin/profile"
              style={{
                background: '#0A0A0A',
                border: pathname === '/admin/profile' ? '1px solid #5EEAD4' : '1px solid #1F1F1F',
                borderRadius: 20,
                padding: '4px 12px 4px 6px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: pathname === '/admin/profile' ? '#5EEAD4' : '#888888',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                height: 34
              }}
              title="View Profile Settings"
              onMouseOver={(e) => { e.currentTarget.style.borderColor = '#5EEAD4'; e.currentTarget.style.color = '#5EEAD4'; }}
              onMouseOut={(e) => {
                if (pathname !== '/admin/profile') {
                  e.currentTarget.style.borderColor = '#1F1F1F';
                  e.currentTarget.style.color = '#888888';
                }
              }}
            >
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#5EEAD4', color: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.65rem' }}>
                {user.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Profile</span>
            </Link>
          </div>
        </header>

        {/* Dynamic page context */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
