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
      } else if (user.role !== 'administrator' || user.tenantSlug !== 'praxisone') {
        router.push('/dashboard?error=unauthorized');
      }
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== 'administrator' || user.tenantSlug !== 'praxisone') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0F172A', color: '#94A3B8' }}>
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
    { href: '/admin/webhooks', label: 'Webhook & Metering Logs', icon: '📊' },
    { href: '/admin/infrastructure', label: 'Infrastructure & Tuning', icon: '⚙️' },
    { href: '/admin/console', label: 'Isolated Debug Console', icon: '💻' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#090D16', color: '#F1F5F9', fontFamily: 'Inter, sans-serif' }}>
      {/* Admin Sidebar */}
      <aside style={{ width: 260, borderRight: '1px solid #1E293B', background: '#0B111E', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: 24, borderBottom: '1px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                  color: isActive ? '#5EEAD4' : '#94A3B8',
                  background: isActive ? 'rgba(94, 234, 212, 0.08)' : 'transparent',
                  border: isActive ? '1px solid rgba(94, 234, 212, 0.2)' : '1px solid transparent',
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
        <div style={{ padding: 16, borderTop: '1px solid #1E293B', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#5EEAD4', color: '#090D16', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
            {user.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
            <div style={{ fontSize: '0.65rem', color: '#94A3B8', textTransform: 'capitalize' }}>Platform Admin</div>
          </div>
          <button
            onClick={() => signOut()}
            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '0.95rem' }}
            title="Exit Admin Panel"
          >
            ⏻
          </button>
        </div>
      </aside>

      {/* Main Admin Content Wrapper */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <header style={{ height: 64, borderBottom: '1px solid #1E293B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', background: '#0B111E' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>Control Plane</span>
            <span style={{ color: '#475569' }}>/</span>
            <span style={{ fontSize: '0.8rem', color: '#F1F5F9', fontWeight: 600 }}>PraxisAdmin OS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link
              href="/dashboard"
              style={{
                fontSize: '0.75rem',
                color: '#94A3B8',
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: 4,
                border: '1px solid #1E293B',
                background: 'rgba(255,255,255,0.02)'
              }}
            >
              ← Back to Client Dashboard
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
