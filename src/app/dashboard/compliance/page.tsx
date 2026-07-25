'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  List,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ComplianceItem {
  id: string;
  clientId: string;
  client: { companyName: string; status: string };
  category: string;
  name: string;
  status: string;
  dueDate: string | null;
  lastChecked: string;
  documents?: Array<{ id: string; name: string; filePath: string }>;
}

function CompliancePageContent() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams?.get('filter') || 'all';
  
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(initialFilter);
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/compliance');
        if (res.ok) {
          const json = await res.json();
          setItems(json.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { 
      compliant: 'badge-green', 
      action_required: 'badge-amber', 
      critical: 'badge-red',
      not_applicable: 'badge-gray'
    };
    return map[s] || 'badge-gray';
  };

  if (loading) {
    return <div className="flex-center" style={{ minHeight: '50vh' }}><span className="spinner" style={{ width: 40, height: 40 }} /></div>;
  }

  const filteredItems = items.filter(item => filter === 'all' || item.status === filter);
  const summary = {
    compliant: items.filter(item => item.status === 'compliant').length,
    actionRequired: items.filter(item => item.status === 'action_required').length,
    critical: items.filter(item => item.status === 'critical').length,
    dueThisWeek: items.filter(item => {
      if (!item.dueDate) return false;
      const due = new Date(item.dueDate);
      const today = new Date();
      const week = new Date();
      week.setDate(today.getDate() + 7);
      return due >= today && due <= week;
    }).length,
  };

  // Grouping for Timeline View
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const oneWeekFromNow = new Date(now);
  oneWeekFromNow.setDate(now.getDate() + 7);
  
  const oneMonthFromNow = new Date(now);
  oneMonthFromNow.setDate(now.getDate() + 30);

  const overdue: ComplianceItem[] = [];
  const dueThisWeek: ComplianceItem[] = [];
  const dueThisMonth: ComplianceItem[] = [];
  const futureOrCompliant: ComplianceItem[] = [];

  filteredItems.forEach(item => {
    if (item.status === 'compliant' || item.status === 'not_applicable') {
      futureOrCompliant.push(item);
    } else if (!item.dueDate) {
      futureOrCompliant.push(item);
    } else {
      const due = new Date(item.dueDate);
      due.setHours(0, 0, 0, 0);
      if (due < now) {
        overdue.push(item);
      } else if (due <= oneWeekFromNow) {
        dueThisWeek.push(item);
      } else if (due <= oneMonthFromNow) {
        dueThisMonth.push(item);
      } else {
        futureOrCompliant.push(item);
      }
    }
  });

  const timelineColumns = [
    { title: '🚨 Overdue', items: overdue, color: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.2)', titleColor: 'var(--red)' },
    { title: '⚠️ Due This Week', items: dueThisWeek, color: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.2)', titleColor: 'var(--amber)' },
    { title: '📅 Due This Month', items: dueThisMonth, color: 'rgba(59, 130, 246, 0.08)', border: 'rgba(59, 130, 246, 0.2)', titleColor: 'var(--blue)' },
    { title: '✅ Future / Compliant', items: futureOrCompliant, color: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.2)', titleColor: 'var(--green)' }
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
            <ShieldCheck className="size-3.5" />
            Portfolio monitoring
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">Compliance</h1>
          <p className="mt-1.5 text-sm text-slate-500">Deadlines, evidence and risk across every client.</p>
        </div>
        
        {/* Table vs Timeline View Toggle */}
        <div className="flex rounded-lg border border-[var(--border-primary)] bg-[var(--bg-card)] p-1 shadow-sm">
          <Button
            variant={viewMode === 'table' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <List />
            Table
          </Button>
          <Button
            variant={viewMode === 'timeline' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('timeline')}
          >
            <Clock3 />
            Timeline
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Compliant', value: summary.compliant, icon: CheckCircle2, iconClass: 'bg-emerald-50 text-emerald-700' },
          { label: 'Action required', value: summary.actionRequired, icon: AlertTriangle, iconClass: 'bg-amber-50 text-amber-700' },
          { label: 'Critical', value: summary.critical, icon: ShieldAlert, iconClass: 'bg-red-50 text-red-700' },
          { label: 'Due this week', value: summary.dueThisWeek, icon: Clock3, iconClass: 'bg-blue-50 text-blue-700' },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <div className="text-2xl font-semibold tracking-tight text-slate-950">{metric.value}</div>
                  <div className="mt-1 text-sm text-slate-500">{metric.label}</div>
                </div>
                <div className={`flex size-10 items-center justify-center rounded-lg ${metric.iconClass}`}>
                  <Icon className="size-[18px]" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={filter === 'all' ? 'primary' : 'outline'} size="sm" onClick={() => setFilter('all')}>
          All Items
        </Button>
        <Button variant={filter === 'action_required' ? 'primary' : 'outline'} size="sm" onClick={() => setFilter('action_required')}>
          Action Required
        </Button>
        <Button variant={filter === 'critical' ? 'primary' : 'outline'} size="sm" onClick={() => setFilter('critical')}>
          Critical Deadlines
        </Button>
        <Button variant={filter === 'compliant' ? 'primary' : 'outline'} size="sm" onClick={() => setFilter('compliant')}>
          Compliant
        </Button>
      </div>

      {viewMode === 'table' ? (
        <div className="card">
          {filteredItems.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-icon">🛡️</div>
              <h3>No compliance alerts found</h3>
              <p>No items match the selected filter.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Category</th>
                    <th>Requirement</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Proof Document</th>
                    <th>Last Checked</th>
                    <th style={{ width: 50 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="table-row-clickable">
                      <td style={{ fontWeight: 500 }}>
                        <Link href={`/dashboard/clients/${item.clientId}?tab=compliance`} style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>
                          {item.client?.companyName || 'Unknown Client'}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/dashboard/clients/${item.clientId}?tab=compliance`} style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>
                          {item.category}
                        </Link>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        <Link href={`/dashboard/clients/${item.clientId}?tab=compliance`} style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>
                          {item.name}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/dashboard/clients/${item.clientId}?tab=compliance`} style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>
                          {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-GB') : '-'}
                        </Link>
                      </td>
                      <td>
                        <Link href={`/dashboard/clients/${item.clientId}?tab=compliance`} style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>
                          <span className={`badge ${statusBadge(item.status)}`}>{item.status.replace('_', ' ')}</span>
                        </Link>
                      </td>
                      <td>
                        <Link href={`/dashboard/clients/${item.clientId}?tab=compliance`} style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>
                          {item.documents && item.documents.length > 0 ? (
                            <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
                              📄 {item.documents[0].name.substring(0, 18)}{item.documents[0].name.length > 18 ? '...' : ''}
                              {item.documents.length > 1 && ` (+${item.documents.length - 1})`}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>None</span>
                          )}
                        </Link>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <Link href={`/dashboard/clients/${item.clientId}?tab=compliance`} style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}>
                          {new Date(item.lastChecked).toLocaleDateString('en-GB')}
                        </Link>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Link href={`/dashboard/clients/${item.clientId}?tab=compliance`} className="btn btn-ghost btn-icon">
                          →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Timeline Board View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, alignItems: 'start' }}>
          {timelineColumns.map((col, idx) => (
            <div 
              key={idx} 
              style={{ 
                background: 'var(--card-bg)', 
                border: '1px solid var(--border-primary)', 
                borderRadius: 'var(--radius-lg)', 
                padding: 16,
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--border-primary)' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: col.titleColor }}>{col.title}</h3>
                <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>{col.items.length}</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.items.length === 0 ? (
                  <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-primary)' }}>
                    Empty
                  </div>
                ) : (
                  col.items.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => window.location.href = `/dashboard/clients/${item.clientId}?tab=compliance`}
                      style={{ 
                        background: 'var(--bg-primary)', 
                        border: '1px solid var(--border-primary)', 
                        borderRadius: 'var(--radius-md)', 
                        padding: 12,
                        cursor: 'pointer',
                        transition: 'transform 0.15s ease, border-color 0.15s ease'
                      }}
                      className="timeline-card-hover"
                    >
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                        {item.category}
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                        {item.client?.companyName}
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                        <span style={{ fontSize: '0.75rem', color: col.titleColor }}>
                          📅 {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-GB') : 'No due date'}
                        </span>
                        
                        {item.documents && item.documents.length > 0 && (
                          <span className="badge badge-blue" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                            📄 Proof
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CompliancePage() {
  return (
    <Suspense fallback={<div className="flex-center" style={{ minHeight: '50vh' }}><span className="spinner" style={{ width: 40, height: 40 }} /></div>}>
      <CompliancePageContent />
    </Suspense>
  );
}
