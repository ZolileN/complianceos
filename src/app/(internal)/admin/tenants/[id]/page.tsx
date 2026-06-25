'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

interface ClientItem {
  id: string;
  companyName: string;
  registrationNumber: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
}

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  whatsappSetupComplete: boolean;
  whatsappPhoneNumber: string | null;
  email: string | null;
  contactNumber: string | null;
  address: string | null;
  website: string | null;
  createdAt: string;
  users: UserItem[];
  clients: ClientItem[];
}

interface InspectorEntity {
  type: 'User' | 'Client';
  id: string;
  name: string;
  details: Record<string, string | null>;
}

interface TenantLog {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  payload?: Record<string, unknown>;
}

export default function TenantProfile() {
  const { id } = useParams() as { id: string };
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'clients' | 'logs'>('members');
  const [error, setError] = useState<string | null>(null);
  
  // Redis Logs State
  const [logs, setLogs] = useState<TenantLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // Poll Redis Logs when tab is active
  useEffect(() => {
    if (activeTab !== 'logs') return;

    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/admin/tenants/${id}/logs`);
        const data = await res.json();
        if (res.ok && data.success) {
          setLogs(data.data);
        }
      } catch (err) {
        console.error('Failed to retrieve logs:', err);
      } finally {
        setLogsLoading(false);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [activeTab, id]);

  // Inspector Modal State
  const [inspectionEntity, setInspectionEntity] = useState<InspectorEntity | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    const fetchTenantDetail = async () => {
      try {
        const res = await fetch(`/api/admin/tenants/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to retrieve tenant details');
        setTenant(data.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchTenantDetail();
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: '#888888' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #5EEAD4', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
          <span>Retrieving workspace metadata...</span>
        </div>
        <style jsx>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div style={{ padding: 24, background: '#050505', border: '1px solid #EF4444', borderRadius: 8, color: '#F87171', maxWidth: 600 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Error Loading Tenant</h2>
        <p style={{ fontSize: '0.85rem', marginTop: 8 }}>{error || 'Tenant not found.'}</p>
        <Link href="/admin" style={{ display: 'inline-block', marginTop: 16, color: '#5EEAD4', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
          ← Back to Fleet Overview
        </Link>
      </div>
    );
  }

  const roleBadgeColor = (role: string) => {
    switch (role) {
      case 'administrator':
        return '#F87171';
      case 'operations_manager':
        return '#60A5FA';
      case 'consultant':
        return '#C084FC';
      default:
        return '#888888';
    }
  };

  const statusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'compliant':
        return '#34D399';
      case 'onboarding':
      case 'action_required':
        return '#60A5FA';
      default:
        return '#F87171';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Header Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link href="/admin" style={{ color: '#5EEAD4', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>←</span> Back to Fleet Overview
          </Link>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#FFFFFF', marginTop: 8 }}>
            Tenant Profile: {tenant.name}
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#888888', marginTop: 4 }}>
            System-level metadata for workspace firm <code>/onboard/{tenant.slug}</code>.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 700,
            background: tenant.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: tenant.isActive ? '#34D399' : '#F87171',
            border: `1px solid ${tenant.isActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
          }}>
            {tenant.isActive ? 'Active' : 'Suspended'}
          </span>
          <span style={{
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: '0.75rem',
            fontWeight: 700,
            background: 'rgba(59, 130, 246, 0.1)',
            color: '#60A5FA',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            textTransform: 'uppercase'
          }}>
            Tier: {tenant.plan}
          </span>
        </div>
      </div>

      {/* POPIA Privacy Shield Alert Banner */}
      <div style={{
        background: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: 8,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16
      }}>
        <div style={{
          background: 'rgba(59, 130, 246, 0.15)',
          color: '#60A5FA',
          width: 32,
          height: 32,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontWeight: 700,
          fontSize: '1rem'
        }}>
          🛡️
        </div>
        <div>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>POPIA Privacy Shield Enabled</h4>
          <p style={{ fontSize: '0.75rem', color: '#888888', marginTop: 4, lineHeight: 1.4 }}>
            In compliance with the <strong>Protection of Personal Information Act (POPIA)</strong>, platform administration access is restricted to tenant-level configuration and high-level directory directories. Direct access to client document vaults, secure message histories, tax identification items, and client workflows remains locked to the tenant workspace.
          </p>
        </div>
      </div>

      {/* Tenant Metadata Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <div style={{ background: '#050505', border: '1px solid #1F1F1F', borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registration Metadata</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16, fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Workspace URL Slug:</span>
              <span style={{ color: '#FFFFFF', fontFamily: 'monospace' }}>{tenant.slug}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Creation Date:</span>
              <span style={{ color: '#FFFFFF' }}>{new Date(tenant.createdAt).toLocaleDateString('en-GB')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Internal ID Reference:</span>
              <span style={{ color: '#888888', fontFamily: 'monospace', fontSize: '0.7rem' }}>{tenant.id}</span>
            </div>
          </div>
        </div>

        <div style={{ background: '#050505', border: '1px solid #1F1F1F', borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Meta WABA Integration</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16, fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>WhatsApp Linkage:</span>
              <span style={{ color: tenant.whatsappSetupComplete ? '#34D399' : '#64748B', fontWeight: 600 }}>
                {tenant.whatsappSetupComplete ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            {tenant.whatsappPhoneNumber && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>WhatsApp Phone Number:</span>
                <span style={{ color: '#FFFFFF', fontFamily: 'monospace' }}>{tenant.whatsappPhoneNumber}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>System Users Active:</span>
              <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{tenant.users.length}</span>
            </div>
          </div>
        </div>

        <div style={{ background: '#050505', border: '1px solid #1F1F1F', borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Firm Directory Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16, fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Business Email:</span>
              <span style={{ color: '#FFFFFF' }}>{tenant.email || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Contact Number:</span>
              <span style={{ color: '#FFFFFF' }}>{tenant.contactNumber || 'N/A'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748B' }}>Active Client Count:</span>
              <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{tenant.clients.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Directory Selector tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1F1F1F', gap: 8, marginTop: 8 }}>
        <button
          onClick={() => setActiveTab('members')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'members' ? '2px solid #5EEAD4' : '2px solid transparent',
            color: activeTab === 'members' ? '#FFFFFF' : '#888888',
            padding: '12px 16px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Firm Members ({tenant.users.length})
        </button>
        <button
          onClick={() => setActiveTab('clients')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'clients' ? '2px solid #5EEAD4' : '2px solid transparent',
            color: activeTab === 'clients' ? '#FFFFFF' : '#888888',
            padding: '12px 16px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Registered Clients ({tenant.clients.length})
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'logs' ? '2px solid #5EEAD4' : '2px solid transparent',
            color: activeTab === 'logs' ? '#FFFFFF' : '#888888',
            padding: '12px 16px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          Live System Logs
        </button>
      </div>

      {/* Active Tab View */}
      <div style={{ background: '#050505', border: '1px solid #1F1F1F', borderRadius: 8, overflow: 'hidden' }}>
        {activeTab === 'members' ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#0A0A0A', borderBottom: '1px solid #1F1F1F', color: '#888888' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Email Address</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>System Permission Role</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {tenant.users.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '32px 0', color: '#888888', fontStyle: 'italic' }}>
                      No workspace members registered.
                    </td>
                  </tr>
                ) : (
                  tenant.users.map(user => (
                    <tr key={user.id} style={{ borderBottom: '1px solid #1F1F1F' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <button
                          onClick={() => setInspectionEntity({
                            type: 'User',
                            id: user.id,
                            name: user.name || 'Unnamed Member',
                            details: {
                              'Email Address': user.email,
                              'System Permission Role': user.role.replace('_', ' ').toUpperCase(),
                              'Joined Date': new Date(user.createdAt).toLocaleDateString('en-GB')
                            }
                          })}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontWeight: 600,
                            color: '#5EEAD4',
                            cursor: 'pointer',
                            padding: 0,
                            textAlign: 'left',
                            fontSize: '0.85rem',
                            fontFamily: 'inherit'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                          {user.name || 'Unnamed'}
                        </button>
                      </td>
                      <td style={{ padding: '16px 20px', color: '#A3A3A3' }}>{user.email}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: 'rgba(255,255,255,0.03)',
                          color: roleBadgeColor(user.role),
                          border: `1px solid ${roleBadgeColor(user.role)}33`
                        }}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', color: '#888888' }}>
                        {new Date(user.createdAt).toLocaleDateString('en-GB')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'clients' ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#0A0A0A', borderBottom: '1px solid #1F1F1F', color: '#888888' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Client Name</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Registration Number</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Email Address</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Contact Phone</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>Onboarded Date</th>
                </tr>
              </thead>
              <tbody>
                {tenant.clients.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px 0', color: '#888888', fontStyle: 'italic' }}>
                      No clients registered under this workspace.
                    </td>
                  </tr>
                ) : (
                  tenant.clients.map(client => (
                    <tr key={client.id} style={{ borderBottom: '1px solid #1F1F1F' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <button
                          onClick={() => setInspectionEntity({
                            type: 'Client',
                            id: client.id,
                            name: client.companyName,
                            details: {
                              'Registration Number': client.registrationNumber || 'N/A',
                              'Contact Email': client.email || 'N/A',
                              'Contact Phone': client.phone || 'N/A',
                              'Current Status': client.status.toUpperCase(),
                              'Onboarded Date': new Date(client.createdAt).toLocaleDateString('en-GB')
                            }
                          })}
                          style={{
                            background: 'none',
                            border: 'none',
                            fontWeight: 600,
                            color: '#5EEAD4',
                            cursor: 'pointer',
                            padding: 0,
                            textAlign: 'left',
                            fontSize: '0.85rem',
                            fontFamily: 'inherit'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                          {client.companyName}
                        </button>
                      </td>
                      <td style={{ padding: '16px 20px', color: '#A3A3A3', fontFamily: 'monospace' }}>{client.registrationNumber || 'N/A'}</td>
                      <td style={{ padding: '16px 20px', color: '#A3A3A3' }}>{client.email || 'N/A'}</td>
                      <td style={{ padding: '16px 20px', color: '#A3A3A3' }}>{client.phone || 'N/A'}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: 'rgba(255,255,255,0.03)',
                          color: statusBadgeColor(client.status),
                          border: `1px solid ${statusBadgeColor(client.status)}33`
                        }}>
                          {client.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', color: '#888888' }}>
                        {new Date(client.createdAt).toLocaleDateString('en-GB')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>Redis Live Capped Message & Status Logs</h3>
              <span style={{ fontSize: '0.7rem', color: '#5EEAD4', background: '#141414', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                ● Auto-polling (5s)
              </span>
            </div>
            
            {logsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0', color: '#888888' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #5EEAD4', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: '0.8rem' }}>Loading log stream...</span>
                </div>
              </div>
            ) : logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#888888', fontSize: '0.85rem', fontStyle: 'italic' }}>
                No telemetry logs found for this tenant. Logs appear as system events occur (suspension, WABA disconnections, WhatsApp webhooks).
              </div>
            ) : (
              <div style={{ background: '#000000', border: '1px solid #1F1F1F', borderRadius: 6, maxHeight: 400, overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.75rem', padding: 12 }}>
                {logs.map((log) => {
                  let badgeColor = '#888888';
                  if (log.type === 'webhook') badgeColor = '#38BDF8';
                  if (log.type === 'system') badgeColor = '#F59E0B';
                  if (log.type === 'error') badgeColor = '#EF4444';
                  
                  return (
                    <div key={log.id} style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid #0A0A0A' }}>
                      <span style={{ color: '#64748B', flexShrink: 0 }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span style={{ color: badgeColor, fontWeight: 700, textTransform: 'uppercase', width: 70, flexShrink: 0 }}>[{log.type}]</span>
                      <span style={{ color: '#E2E8F0', flex: 1, wordBreak: 'break-all' }}>{log.message}</span>
                      {log.payload && (
                        <span style={{ color: '#64748B', fontSize: '0.7rem', fontStyle: 'italic', marginLeft: 8 }}>
                          {JSON.stringify(log.payload)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Troubleshooting Inspector Modal */}
      {inspectionEntity && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#050505', border: '1px solid #1F1F1F', borderRadius: 8, padding: 24, width: '100%', maxWidth: 500, position: 'relative' }}>
            <button
              onClick={() => {
                setInspectionEntity(null);
                setCopiedId(false);
              }}
              style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#888888', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              ✕
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#5EEAD4', background: 'rgba(94, 234, 212, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                {inspectionEntity.type} Entity
              </span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF', marginBottom: 16 }}>{inspectionEntity.name}</h2>
            
            {/* ID copy section */}
            <div style={{ background: '#000000', border: '1px solid #1F1F1F', borderRadius: 6, padding: '12px 14px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                <div style={{ fontSize: '0.65rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Database Primary Key ID</div>
                <div style={{ fontSize: '0.8rem', color: '#E2E8F0', fontFamily: 'monospace', marginTop: 4, wordBreak: 'break-all' }}>{inspectionEntity.id}</div>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inspectionEntity.id);
                  setCopiedId(true);
                  setTimeout(() => setCopiedId(false), 2000);
                }}
                style={{
                  background: copiedId ? 'rgba(52, 211, 153, 0.1)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${copiedId ? '#34D399' : '#1F1F1F'}`,
                  color: copiedId ? '#34D399' : '#A3A3A3',
                  borderRadius: 4,
                  padding: '6px 12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {copiedId ? '✓ Copied' : 'Copy ID'}
              </button>
            </div>

            {/* Other Metadata */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(inspectionEntity.details).map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid rgba(30, 41, 59, 0.5)', paddingBottom: 8 }}>
                  <span style={{ color: '#64748B' }}>{label}:</span>
                  <span style={{ color: '#FFFFFF', fontWeight: 500 }}>{val}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
              {inspectionEntity.type === 'User' ? (
                <button
                  onClick={async () => {
                    if (!confirm("Are you sure you want to force reset this user's password?")) return;
                    try {
                      const res = await fetch(`/api/admin/users/${inspectionEntity.id}/reset-password`, {
                        method: 'POST'
                      });
                      const data = await res.json();
                      if (data.success) {
                        prompt('Password reset successfully. Please copy the temporary password securely:', data.temporaryPassword);
                      } else {
                        alert(data.error || 'Failed to reset password');
                      }
                    } catch {
                      alert('An error occurred during password reset.');
                    }
                  }}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#F87171',
                    padding: '8px 16px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                >
                  Force Reset Password
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => {
                  setInspectionEntity(null);
                  setCopiedId(false);
                }}
                style={{ background: 'transparent', border: '1px solid #1F1F1F', color: '#FFFFFF', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
