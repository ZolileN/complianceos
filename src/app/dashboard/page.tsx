'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface ComplianceStats {
  compliant: number;
  action_required: number;
  critical: number;
}

interface Stats { 
  clients: number; 
  tasks: number; 
  documents: number; 
  overdue: number; 
  compliance?: ComplianceStats;
}

export default function DashboardPage() {
  const { user, tenant } = useAuth();
  const [stats, setStats] = useState<Stats>({ clients: 0, tasks: 0, documents: 0, overdue: 0 });
  const [recentClients, setRecentClients] = useState<Array<{ id: string; company_name: string; status: string; created_at: string }>>([]);
  const [recentTasks, setRecentTasks] = useState<Array<{ id: string; title: string; status: string; priority: string; due_date: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant) return;
    async function load() {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data = await res.json();
          if (data.stats) setStats(data.stats);
          if (data.recentClients) setRecentClients(data.recentClients);
          if (data.recentTasks) setRecentTasks(data.recentTasks);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
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

  if (loading) return <div className="flex-center" style={{ padding: 80 }}><span className="spinner" style={{ width: 40, height: 40 }} /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name?.split(' ')[0] || 'there'} 👋</p>
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

      {/* Compliance Monitoring Engine Overview */}
      {stats.compliance && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            🛡️ Compliance Monitoring Engine
          </h2>
          <div className="content-grid grid-3">
            <div className="card" style={{ borderLeft: '4px solid var(--green)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--green)' }}>
                  {stats.compliance.compliant}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Requirements Compliant
                </div>
              </div>
              <span style={{ fontSize: '2rem' }}>✅</span>
            </div>
            <div className="card" style={{ borderLeft: '4px solid var(--amber)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--amber)' }}>
                  {stats.compliance.action_required}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Need Action / Pending
                </div>
              </div>
              <span style={{ fontSize: '2rem' }}>⚠️</span>
            </div>
            <div className="card" style={{ borderLeft: '4px solid var(--red)', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--red)' }}>
                  {stats.compliance.critical}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Critical Deadlines / Expiries
                </div>
              </div>
              <span style={{ fontSize: '2rem' }}>🚨</span>
            </div>
          </div>
        </div>
      )}

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
                <Link key={c.id} href={`/dashboard/clients/${c.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 'var(--radius-md)', transition: 'background var(--transition)', color: 'inherit', textDecoration: 'none' }} className="card-hover">
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
