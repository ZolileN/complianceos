'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface AuditLogItem {
  id: string;
  action: 'SUSPEND_TENANT' | 'ACTIVATE_TENANT' | 'DISCONNECT_WABA' | 'VACUUM_DATABASE';
  adminId: string;
  adminEmail: string;
  targetId: string | null;
  details: string;
  createdAt: string;
  admin: {
    name: string | null;
    email: string;
  };
}

export default function SystemAuditLogs() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchLogs = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs');
      const data = await res.json();
      if (res.ok && data.success) {
        setLogs(data.data);
      } else {
        throw new Error(data.error || 'Failed to retrieve logs');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve system logs';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchLogs(false);
    };
    init();
  }, [fetchLogs]);

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'SUSPEND_TENANT':
        return { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', text: '#EF4444' };
      case 'ACTIVATE_TENANT':
        return { bg: 'rgba(52, 211, 153, 0.1)', border: 'rgba(52, 211, 153, 0.2)', text: '#34D399' };
      case 'DISCONNECT_WABA':
        return { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B' };
      case 'VACUUM_DATABASE':
        return { bg: 'rgba(56, 189, 248, 0.1)', border: 'rgba(56, 189, 248, 0.2)', text: '#38BDF8' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.2)', text: '#94A3B8' };
    }
  };

  const filteredLogs = logs.filter(log => actionFilter === 'ALL' || log.action === actionFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          background: toast.type === 'success' ? '#064E3B' : '#7F1D1D',
          border: `1px solid ${toast.type === 'success' ? '#059669' : '#DC2626'}`,
          color: toast.type === 'success' ? '#A7F3D0' : '#FCA5A5',
          padding: '12px 20px',
          borderRadius: 6,
          zIndex: 1000,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
          fontSize: '0.85rem',
          fontWeight: 600
        }}>
          {toast.message}
        </div>
      )}

      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#F8FAFC', margin: 0 }}>System Audit Stream</h1>
          <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: 6 }}>Immutable log of high-risk platform operations, mutators, and maintenance heartbeats.</p>
        </div>
        <button
          onClick={() => fetchLogs(true)}
          disabled={loading}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid #1E293B',
            color: '#CBD5E1',
            borderRadius: 6,
            padding: '8px 16px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          {loading ? 'Refreshing...' : '↻ Refresh logs'}
        </button>
      </div>

      {/* Filter and Content Card */}
      <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 8, overflow: 'hidden' }}>
        {/* Filters bar */}
        <div style={{ padding: 20, borderBottom: '1px solid #1E293B', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filter Action:</span>
          {['ALL', 'SUSPEND_TENANT', 'ACTIVATE_TENANT', 'DISCONNECT_WABA', 'VACUUM_DATABASE'].map(action => (
            <button
              key={action}
              onClick={() => setActionFilter(action)}
              style={{
                background: actionFilter === action ? 'rgba(94, 234, 212, 0.08)' : 'transparent',
                border: actionFilter === action ? '1px solid #5EEAD4' : '1px solid transparent',
                color: actionFilter === action ? '#5EEAD4' : '#94A3B8',
                borderRadius: 4,
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {action.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Logs Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid #1E293B', color: '#94A3B8' }}>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Timestamp</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Action</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Administrator</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Target Entity ID</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Details & Metadata</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #5EEAD4', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                      <span>Reading audit records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8', fontStyle: 'italic' }}>
                    No audit log records match the current filter selection.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const badge = getActionBadgeColor(log.action);
                  let detailsParsed = {};
                  try {
                    detailsParsed = JSON.parse(log.details);
                  } catch {}

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #1E293B', transition: 'background 0.15s ease' }}>
                      <td style={{ padding: '16px 20px', color: '#CBD5E1', whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#F8FAFC' }}>{log.admin.name || 'Unnamed Admin'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 2 }}>{log.adminEmail}</div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', color: '#CBD5E1', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {log.targetId || '-'}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {Object.keys(detailsParsed).length === 0 ? (
                            <span style={{ color: '#64748B', fontStyle: 'italic', fontSize: '0.75rem' }}>No extra parameters</span>
                          ) : (
                            Object.entries(detailsParsed).map(([key, val]) => (
                              <div key={key} style={{ fontSize: '0.75rem', color: '#E2E8F0' }}>
                                <span style={{ color: '#64748B', fontWeight: 600 }}>{key}:</span>{' '}
                                <span>{String(val)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
