'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Client } from '@/types';
import { useToast } from '@/contexts/ToastContext';

export default function ClientsPage() {
  const { user, tenant } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Redirect client roles
  useEffect(() => {
    if (user?.role === 'client') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch tenant slug once (for the invite link)
  useEffect(() => {
    if (!tenant) return;
    fetch('/api/dashboard')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.tenant?.slug) setTenantSlug(d.tenant.slug);
      })
      .catch(() => null);
  }, [tenant]);

  const handleCopyInviteLink = async () => {
    if (!tenantSlug) return;
    const url = `${window.location.origin}/onboard/${tenantSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast('Invite link copied to clipboard! Share it with your clients.', 'success');
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      toast('Invite link copied!', 'success');
    }
  };

  // Debounce the search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch clients whenever tenant or debounced search changes — correct effect pattern
  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });
    const url = debouncedSearch
      ? `/api/clients?search=${encodeURIComponent(debouncedSearch)}`
      : `/api/clients`;
    fetch(url)
      .then((res) => res.json())
      .then(({ data }) => { if (!cancelled) setClients(data || []); })
      .catch((err) => console.error(err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tenant, debouncedSearch]);

  const statusBadge = (s: string) => {
    const m: Record<string, string> = { active: 'badge-green', inactive: 'badge-gray', onboarding: 'badge-blue' };
    return m[s] || 'badge-gray';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">{clients.length} total clients</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {tenantSlug && (
            <button
              id="copy-invite-link-btn"
              className={`btn ${linkCopied ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={handleCopyInviteLink}
              title={`Share: /onboard/${tenantSlug}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
            >
              {linkCopied ? '✓ Link Copied!' : '🔗 Share Invite Link'}
            </button>
          )}
          {(user?.role === 'administrator' || user?.role === 'operations_manager') && (
            <Link href="/dashboard/clients/new" className="btn btn-primary">+ Add Client</Link>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input
          className="input"
          placeholder="Search clients by name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setLoading(true);
          }}
          style={{ maxWidth: 400 }}
        />
      </div>

      {loading ? (
        <div className="stack" style={{ gap: 8 }}>{[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60 }} />)}</div>
      ) : clients.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>No clients found</h3>
            <p>{search ? 'Try a different search term' : 'Add your first client to get started'}</p>
            {!search && <Link href="/dashboard/clients/new" className="btn btn-primary" style={{ marginTop: 16 }}>+ Add Client</Link>}
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Reg Number</th>
                <th>Tax Number</th>
                <th>Contact</th>
                <th>Consultant</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/dashboard/clients/${c.id}`}>
                  <td style={{ fontWeight: 600 }}>{c.company_name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.registration_number || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.tax_number || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.email || c.phone || '—'}</td>
                  {/* Fix: API returns { name } not { full_name } */}
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {(c.assigned_consultant as unknown as { name?: string })?.name || 'Unassigned'}
                  </td>
                  <td><span className={`badge ${statusBadge(c.status)}`}>{c.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
