'use client';

import React, { useState, useEffect } from 'react';

interface AuditLog {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/audit-logs');
        if (!res.ok) throw new Error('Failed to fetch audit logs');
        const data = await res.json();
        setLogs(data.data || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    void fetchLogs();
  }, []);

  const getActionColor = (action: string) => {
    if (action === 'CREATE') return '#10B981';
    if (action === 'UPDATE') return '#3B82F6';
    if (action === 'DELETE') return '#EF4444';
    if (action === 'UPLOAD') return '#F59E0B';
    return 'var(--text-secondary)';
  };

  if (loading) return <div className="flex-center" style={{ minHeight: '60vh' }}><span className="spinner"></span></div>;

  return (
    <div className="dashboard-content">
      <header className="dashboard-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="dashboard-title">Audit Logs</h1>
          <p className="dashboard-subtitle">Track system activity, user actions, and changes.</p>
        </div>
      </header>

      {error && <div className="error-message" style={{ marginBottom: 24 }}>{error}</div>}

      <div className="card">
        {logs.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📊</span>
            <h3>No audit logs found</h3>
            <p>System activity will appear here as users interact with the platform.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity Type</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  let detailsParsed = {};
                  try {
                    detailsParsed = JSON.parse(log.details);
                  } catch {}

                  return (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className="avatar">{log.user.name?.charAt(0) || '?'}</div>
                          <div>
                            <p style={{ fontWeight: 600, margin: 0 }}>{log.user.name || 'Unknown'}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>{log.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: 4, 
                          fontSize: '0.75rem', 
                          fontWeight: 700,
                          backgroundColor: `${getActionColor(log.action)}20`,
                          color: getActionColor(log.action)
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{log.entityType}</td>
                      <td>
                        <pre style={{ margin: 0, fontSize: '0.75rem', background: 'var(--bg-primary)', padding: 8, borderRadius: 4, maxWidth: 300, overflowX: 'auto' }}>
                          {JSON.stringify(detailsParsed, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
