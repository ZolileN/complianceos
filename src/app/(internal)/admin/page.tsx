'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

interface TenantItem {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  whatsappPhoneNumberId: string | null;
  whatsappSetupComplete: boolean;
  _count: {
    users: number;
    clients: number;
  };
}

interface OnboardingClient {
  id: string;
  companyName: string;
  registrationNumber: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  tenant: {
    name: string;
    slug: string;
  };
}

export default function FleetOverview() {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [onboardingClients, setOnboardingClients] = useState<OnboardingClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [queueDepth, setQueueDepth] = useState<number>(0);

  // Card filter state
  const [filterType, setFilterType] = useState<'all' | 'active' | 'suspended' | 'waba'>('all');
  const stuckRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    try {
      const [tenantsRes, onboardingRes, diagnosticsRes] = await Promise.all([
        fetch('/api/admin/tenants'),
        fetch('/api/admin/onboarding'),
        fetch('/api/admin/diagnostics')
      ]);

      const tenantsData = await tenantsRes.json();
      const onboardingData = await onboardingRes.json();
      const diagnosticsData = await diagnosticsRes.json();

      if (tenantsData.success) setTenants(tenantsData.data);
      if (onboardingData.success) setOnboardingClients(onboardingData.data);
      if (diagnosticsData.success) {
        setQueueDepth(diagnosticsData.queueDepth);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to retrieve fleet data.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchData();
    };
    init();
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/diagnostics');
        const data = await res.json();
        if (data.success) {
          setQueueDepth(data.queueDepth);
        }
      } catch (err) {
        console.error('Failed to poll diagnostics:', err);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleToggleActive = async (tenantId: string, currentStatus: boolean) => {
    setActionLoading(tenantId + '-toggle');
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update tenant status');
      showToast(`Tenant successfully ${!currentStatus ? 'activated' : 'suspended'}`);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      showToast(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleForceRevoke = async (tenantId: string) => {
    if (!confirm('Are you sure you want to force disconnect Meta/WhatsApp configurations for this tenant? This action will reset their WhatsApp Business API setup.')) {
      return;
    }
    setActionLoading(tenantId + '-revoke');
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/revoke-token`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke token');
      showToast('Meta connection successfully revoked and reset!');
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      showToast(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: '#94A3B8' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #5EEAD4', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
          <span>Polling workspace status...</span>
        </div>
        <style jsx>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  // Calculate metrics
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.isActive).length;
  const suspendedTenants = totalTenants - activeTenants;
  const metaConnected = tenants.filter(t => t.whatsappSetupComplete).length;
  const pendingIntake = onboardingClients.length;

  // Filter tenants array
  const filteredTenants = tenants.filter(t => {
    if (filterType === 'active') return t.isActive;
    if (filterType === 'suspended') return !t.isActive;
    if (filterType === 'waba') return t.whatsappSetupComplete;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          background: toast.type === 'success' ? '#10B981' : '#EF4444',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: 8,
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          fontWeight: 600,
          fontSize: '0.85rem',
          animation: 'slideIn 0.2s ease-out'
        }}>
          {toast.message}
          <style jsx>{`
            @keyframes slideIn {
              from { transform: translateY(-20px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {/* Card 1: Total Tenants */}
        <div 
          onClick={() => setFilterType('all')}
          style={{ 
            background: filterType === 'all' ? 'rgba(94, 234, 212, 0.03)' : '#0F172A', 
            border: filterType === 'all' ? '1px solid #5EEAD4' : '1px solid #1E293B', 
            borderRadius: 8, 
            padding: 20,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Tenant Workspaces</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#F1F5F9', marginTop: 8 }}>{totalTenants}</div>
        </div>

        {/* Card 2: Active Tenants */}
        <div 
          onClick={() => setFilterType('active')}
          style={{ 
            background: filterType === 'active' ? 'rgba(16, 185, 129, 0.03)' : '#0F172A', 
            border: filterType === 'active' ? '1px solid #10B981' : '1px solid #1E293B', 
            borderRadius: 8, 
            padding: 20,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Workspaces</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10B981', marginTop: 8 }}>{activeTenants}</div>
        </div>

        {/* Card 3: Suspended Tenants */}
        <div 
          onClick={() => setFilterType('suspended')}
          style={{ 
            background: filterType === 'suspended' ? 'rgba(245, 158, 11, 0.03)' : '#0F172A', 
            border: filterType === 'suspended' ? '1px solid #F59E0B' : '1px solid #1E293B', 
            borderRadius: 8, 
            padding: 20,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suspended Workspaces</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#F59E0B', marginTop: 8 }}>{suspendedTenants}</div>
        </div>

        {/* Card 4: Meta WABA */}
        <div 
          onClick={() => setFilterType('waba')}
          style={{ 
            background: filterType === 'waba' ? 'rgba(59, 130, 246, 0.03)' : '#0F172A', 
            border: filterType === 'waba' ? '1px solid #3B82F6' : '1px solid #1E293B', 
            borderRadius: 8, 
            padding: 20,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Meta WABA Mapped</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#3B82F6', marginTop: 8 }}>{metaConnected} <span style={{ fontSize: '0.9rem', fontWeight: 400, color: '#94A3B8' }}>/ {totalTenants}</span></div>
        </div>

        {/* Card 5: Stuck Intake */}
        <div 
          onClick={() => stuckRef.current?.scrollIntoView({ behavior: 'smooth' })}
          style={{ 
            background: '#0F172A', 
            border: '1px solid #1E293B', 
            borderRadius: 8, 
            padding: 20,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#EF4444'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = '#1E293B'}
        >
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stuck Intake Lines</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#EF4444', marginTop: 8 }}>{pendingIntake}</div>
        </div>

        {/* Card 6: Webhook Queue Backlog */}
        <div 
          style={{ 
            background: '#0F172A', 
            border: '1px solid #1E293B', 
            borderRadius: 8, 
            padding: 20,
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Webhook Queue Backlog</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: queueDepth > 0 ? '#38BDF8' : '#34D399', marginTop: 8 }}>
            {queueDepth}
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94A3B8', marginLeft: 8 }}>payloads</span>
          </div>
        </div>
      </div>

      {/* Tenant Registry Section */}
      <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: 20, borderBottom: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>
              Master Tenant Registry {filterType !== 'all' && <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 400 }}>({filterType === 'active' ? 'Active' : filterType === 'suspended' ? 'Suspended' : 'WhatsApp Linked'} Filter Active)</span>}
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 4 }}>Control status, subscription tiers, and WhatsApp configurations across the active fleet.</p>
          </div>
          {filterType !== 'all' && (
            <button 
              onClick={() => setFilterType('all')}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #1E293B', color: '#CBD5E1', borderRadius: 4, padding: '4px 8px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Clear Filter
            </button>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: 1000, borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid #1E293B', color: '#94A3B8' }}>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Workspace Name & Slug</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Tier</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Members</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Clients</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Setup Date</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>Meta Integration</th>
                <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontStyle: 'italic' }}>
                    No workspaces match the current active filter criteria.
                  </td>
                </tr>
              ) : (
                filteredTenants.map(tenant => (
                  <tr key={tenant.id} style={{ borderBottom: '1px solid #1E293B', background: tenant.isActive ? 'transparent' : 'rgba(245, 158, 11, 0.02)', transition: 'background 0.15s ease' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <Link 
                        href={`/admin/tenants/${tenant.id}`}
                        style={{ 
                          fontWeight: 600, 
                          color: '#5EEAD4', 
                          textDecoration: 'none', 
                          cursor: 'pointer' 
                        }}
                        onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        {tenant.name}
                      </Link>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontFamily: 'monospace' }}>/onboard/{tenant.slug}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/onboard/${tenant.slug}`);
                            showToast('Onboarding URL copied to clipboard');
                          }}
                          style={{ background: 'none', border: 'none', color: '#5EEAD4', cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}
                          title="Copy Onboarding URL"
                        >
                          [Copy]
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textTransform: 'capitalize' }}>
                      <span style={{ padding: '2px 6px', borderRadius: 4, background: tenant.plan === 'enterprise' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: tenant.plan === 'enterprise' ? '#A78BFA' : '#60A5FA', fontSize: '0.7rem', fontWeight: 600 }}>
                        {tenant.plan}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#CBD5E1' }}>{tenant._count.users}</td>
                    <td style={{ padding: '16px 20px', color: '#CBD5E1' }}>{tenant._count.clients}</td>
                    <td style={{ padding: '16px 20px', color: '#94A3B8' }}>{new Date(tenant.createdAt).toLocaleDateString('en-GB')}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: 9999,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        background: tenant.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: tenant.isActive ? '#34D399' : '#F87171'
                      }}>
                        {tenant.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {tenant.whatsappSetupComplete ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ color: '#34D399', fontWeight: 600, fontSize: '0.7rem' }}>● Linked</span>
                          {tenant.whatsappPhoneNumberId && (
                            <span style={{ fontSize: '0.65rem', color: '#94A3B8', fontFamily: 'monospace' }}>WABA: {tenant.whatsappPhoneNumberId}</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#64748B', fontSize: '0.7rem' }}>Unlinked</span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                        <button
                          onClick={() => handleToggleActive(tenant.id, tenant.isActive)}
                          disabled={actionLoading !== null}
                          style={{
                            background: tenant.isActive ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            border: `1px solid ${tenant.isActive ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                            color: tenant.isActive ? '#F59E0B' : '#34D399',
                            padding: '6px 12px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: '0.7rem',
                            fontWeight: 600
                          }}
                        >
                          {actionLoading === tenant.id + '-toggle' ? '...' : tenant.isActive ? 'Suspend' : 'Activate'}
                        </button>
                        {tenant.whatsappSetupComplete && (
                          <button
                            onClick={() => handleForceRevoke(tenant.id)}
                            disabled={actionLoading !== null}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              color: '#F87171',
                              padding: '6px 12px',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: '0.7rem',
                              fontWeight: 600
                            }}
                          >
                            {actionLoading === tenant.id + '-revoke' ? '...' : 'Force Disconnect'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stuck Intake Deep-Dive Section */}
      <div id="stuck-intake-section" ref={stuckRef} style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: 20, borderBottom: '1px solid #1E293B' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>Client Intake Deep-Dive (Stuck in Onboarding)</h2>
          <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 4 }}>Review client registrations that have not completed verification or are currently stuck in the `ONBOARDING` state block.</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {onboardingClients.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: '0.8rem', fontStyle: 'italic' }}>
              No onboarding client sessions are currently stuck. Fleet is healthy.
            </div>
          ) : (
            <table style={{ width: 1000, borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid #1E293B', color: '#94A3B8' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Client Company Name</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Parent Tenant</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Email Address</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Contact Info</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Reg Number</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Intake Initiated</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Status Block</th>
                </tr>
              </thead>
              <tbody>
                {onboardingClients.map(client => (
                  <tr key={client.id} style={{ borderBottom: '1px solid #1E293B' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: '#F1F5F9' }}>{client.companyName}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ color: '#F1F5F9' }}>{client.tenant.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{client.tenant.slug}</div>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#CBD5E1' }}>{client.email || 'N/A'}</td>
                    <td style={{ padding: '16px 20px', color: '#CBD5E1' }}>{client.phone || 'N/A'}</td>
                    <td style={{ padding: '16px 20px', color: '#CBD5E1' }}>{client.registrationNumber || 'N/A'}</td>
                    <td style={{ padding: '16px 20px', color: '#94A3B8' }}>{new Date(client.createdAt).toLocaleDateString('en-GB')} {new Date(client.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontSize: '0.7rem', fontWeight: 700 }}>
                        ONBOARDING
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
