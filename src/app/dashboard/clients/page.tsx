'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import type { Client } from '@/types';

export default function ClientsPage() {
  const { tenant } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!tenant) return;
    async function load() {
      setLoading(true);
      let query = supabase.from('clients').select('*, assigned_consultant:users!clients_assigned_consultant_id_fkey(id, full_name)').eq('tenant_id', tenant!.id).order('created_at', { ascending: false });
      if (search) query = query.ilike('company_name', `%${search}%`);
      const { data } = await query;
      setClients((data as unknown as Client[]) || []);
      setLoading(false);
    }
    load();
  }, [tenant, search]);

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
        <Link href="/dashboard/clients/new" className="btn btn-primary">+ Add Client</Link>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input className="input" placeholder="Search clients by name..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 400 }} />
      </div>

      {loading ? (
        <div className="stack" style={{ gap: 8 }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60 }} />)}</div>
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
                  <td style={{ color: 'var(--text-secondary)' }}>{(c.assigned_consultant as unknown as { full_name: string })?.full_name || 'Unassigned'}</td>
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
