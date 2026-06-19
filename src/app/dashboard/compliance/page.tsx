'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface ComplianceItem {
  id: string;
  clientId: string;
  client: { companyName: string; status: string };
  category: string;
  name: string;
  status: string;
  dueDate: string | null;
  lastChecked: string;
}

function CompliancePageContent() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams?.get('filter') || 'all';
  
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(initialFilter);

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

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div>
          <h1 className="page-title">Global Compliance Alerts</h1>
          <p className="page-subtitle">A centralized view of all compliance items across your clients.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter('all')}>
          All Items
        </button>
        <button className={`btn ${filter === 'action_required' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter('action_required')}>
          ⚠️ Action Required
        </button>
        <button className={`btn ${filter === 'critical' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter('critical')}>
          🚨 Critical Deadlines
        </button>
        <button className={`btn ${filter === 'compliant' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter('compliant')}>
          ✅ Compliant
        </button>
      </div>

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
