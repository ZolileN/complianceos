'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface Stats { clients: number; tasks: number; documents: number; overdue: number; }

export default function DashboardPage() {
  const { user, tenant } = useAuth();
  const [stats, setStats] = useState<Stats>({ clients: 0, tasks: 0, documents: 0, overdue: 0 });
  const [recentClients, setRecentClients] = useState<Array<{ id: string; company_name: string; status: string; created_at: string }>>([]);
  const [recentTasks, setRecentTasks] = useState<Array<{ id: string; title: string; status: string; priority: string; due_date: string | null }>>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!tenant) return;
    async function load() {
      const [c, t, d, o] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant!.id),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant!.id).neq('status', 'completed'),
        supabase.from('documents').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant!.id),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant!.id).eq('status', 'overdue'),
      ]);
      setStats({ clients: c.count || 0, tasks: t.count || 0, documents: d.count || 0, overdue: o.count || 0 });

      const { data: rc } = await supabase.from('clients').select('id, company_name, status, created_at').eq('tenant_id', tenant!.id).order('created_at', { ascending: false }).limit(5);
      if (rc) setRecentClients(rc);

      const { data: rt } = await supabase.from('tasks').select('id, title, status, priority, due_date').eq('tenant_id', tenant!.id).neq('status', 'completed').order('created_at', { ascending: false }).limit(5);
      if (rt) setRecentTasks(rt);
    }
    load();
  }, [tenant]);

  const kpis = [
    { label: 'Total Clients', value: stats.clients, icon: '👥', color: 'var(--accent)', bg: 'var(--accent-muted)' },
    { label: 'Active Tasks', value: stats.tasks, icon: '☑', color: 'var(--blue)', bg: 'rgba(59,130,246,0.15)' },
    { label: 'Documents', value: stats.documents, icon: '📁', color: 'var(--purple)', bg: 'rgba(139,92,246,0.15)' },
    { label: 'Overdue', value: stats.overdue, icon: '⚠', color: 'var(--red)', bg: 'rgba(239,68,68,0.15)' },
  ];

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { active: 'badge-green', inactive: 'badge-gray', onboarding: 'badge-blue', new: 'badge-purple', waiting_on_client: 'badge-amber', processing: 'badge-blue', submitted: 'badge-purple', completed: 'badge-green', overdue: 'badge-red' };
    return map[s] || 'badge-gray';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.full_name?.split(' ')[0] || 'there'} 👋</p>
        </div>
        <Link href="/dashboard/clients/new" className="btn btn-primary">+ New Client</Link>
      </div>

      {/* KPI Cards */}
      <div className="content-grid grid-4" style={{ marginBottom: 32 }}>
        {kpis.map((kpi, i) => (
          <div key={kpi.label} className={`card kpi-card animate-in animate-delay-${i + 1}`}>
            <div className="kpi-icon" style={{ background: kpi.bg, color: kpi.color }}>{kpi.icon}</div>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="content-grid grid-2">
        <div className="card animate-in" style={{ animationDelay: '200ms' }}>
          <div className="flex-between" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent Clients</h3>
            <Link href="/dashboard/clients" className="btn btn-ghost btn-sm">View All →</Link>
          </div>
          {recentClients.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <div className="empty-icon">👥</div>
              <h3>No clients yet</h3>
              <p>Add your first client to get started</p>
            </div>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {recentClients.map((c) => (
                <Link key={c.id} href={`/dashboard/clients/${c.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 'var(--radius-md)', transition: 'background var(--transition)', color: 'inherit' }} className="card-hover" onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{c.company_name}</span>
                  <span className={`badge ${statusBadge(c.status)}`}>{c.status}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card animate-in" style={{ animationDelay: '250ms' }}>
          <div className="flex-between" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Active Tasks</h3>
            <Link href="/dashboard/tasks" className="btn btn-ghost btn-sm">View All →</Link>
          </div>
          {recentTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 16px' }}>
              <div className="empty-icon">☑</div>
              <h3>No tasks yet</h3>
              <p>Create tasks to track your compliance work</p>
            </div>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {recentTasks.map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{t.title}</div>
                    {t.due_date && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>Due: {new Date(t.due_date).toLocaleDateString()}</div>}
                  </div>
                  <span className={`badge ${statusBadge(t.status)}`}>{t.status.replace('_', ' ')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
