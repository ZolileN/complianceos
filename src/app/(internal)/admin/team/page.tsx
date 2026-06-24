'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: 'administrator' | 'operations_manager' | 'consultant' | 'client';
  created_at: string;
}

export default function PlatformTeamPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal / Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'administrator' as 'administrator' | 'operations_manager' | 'consultant' | 'client',
  });

  // Reset Password Modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState('');

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to load platform team members');
      const { data } = await res.json();
      setMembers(data || []);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam, refreshKey]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add team member');
      }

      toast('Platform team member added successfully');
      setForm({ name: '', email: '', password: '', role: 'administrator' });
      setShowAddModal(false);
      setRefreshKey(k => k + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (memberId: string, name: string) => {
    const ok = await confirm({
      title: 'Remove Platform Team Member',
      message: `Are you sure you want to remove ${name} from the platform team? This action will immediately revoke their administrator/staff access.`,
      confirmText: 'Remove Member',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/users/${memberId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove team member');
      }

      toast('Platform team member removed successfully');
      setRefreshKey(k => k + 1);
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setResetSubmitting(true);
    setResetError('');
    try {
      const res = await fetch(`/api/users/${selectedMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reset password');
      }

      toast(`Password for ${selectedMember.full_name} has been reset successfully`);
      setResetPassword('');
      setShowResetModal(false);
      setSelectedMember(null);
    } catch (err) {
      setResetError((err as Error).message);
    } finally {
      setResetSubmitting(false);
    }
  };

  const roleBadgeColor = (role: string) => {
    switch (role) {
      case 'administrator':
        return '#F87171'; // light red
      case 'operations_manager':
        return '#60A5FA'; // light blue
      case 'consultant':
        return '#C084FC'; // light purple
      default:
        return '#94A3B8';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: '#94A3B8' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #5EEAD4', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
          <span>Loading platform team registry...</span>
        </div>
        <style jsx>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F8FAFC' }}>Platform Team Management</h1>
          <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: 4 }}>Manage internal staff accounts and access levels for the PraxisOne master tenant.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: '#5EEAD4',
            border: 'none',
            color: '#090D16',
            padding: '10px 20px',
            borderRadius: 6,
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.85rem',
            transition: 'opacity 0.15s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
        >
          + Add Team Member
        </button>
      </div>

      {/* Team Registry Card */}
      <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid #1E293B', color: '#94A3B8' }}>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Full Name</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Email Address</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Role</th>
                <th style={{ padding: '14px 20px', fontWeight: 600 }}>Setup Date</th>
                <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0', color: '#94A3B8', fontStyle: 'italic' }}>
                    No platform team members found.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #1E293B', transition: 'background 0.15s ease' }}>
                    <td style={{ padding: '16px 20px', fontWeight: 600, color: '#F1F5F9' }}>{m.full_name}</td>
                    <td style={{ padding: '16px 20px', color: '#CBD5E1' }}>{m.email}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: 'rgba(255,255,255,0.03)',
                          color: roleBadgeColor(m.role),
                          border: `1px solid ${roleBadgeColor(m.role)}33`
                        }}
                      >
                        {m.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#94A3B8' }}>
                      {new Date(m.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          onClick={() => {
                            setSelectedMember(m);
                            setResetPassword('');
                            setResetError('');
                            setShowResetModal(true);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#5EEAD4',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: 0
                          }}
                        >
                          Reset Password
                        </button>
                        {m.id === user?.id ? (
                          <span style={{ fontSize: '0.75rem', color: '#64748B', fontStyle: 'italic', paddingRight: 4 }}>You</span>
                        ) : (
                          <button
                            onClick={() => handleDeleteMember(m.id, m.full_name)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#F87171',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: 0
                            }}
                          >
                            Remove
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

      {/* Add Member Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 8, padding: 24, width: '100%', maxWidth: 500, position: 'relative' }}>
            <button
              onClick={() => setShowAddModal(false)}
              style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              ✕
            </button>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC', marginBottom: 8 }}>Add Platform Team Member</h2>
            <p style={{ color: '#94A3B8', fontSize: '0.8rem', marginBottom: 20 }}>Provision a new administrative or staff account linked to the PraxisOne master tenant.</p>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '10px 14px', marginBottom: 20, color: '#F87171', fontSize: '0.8rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8' }}>Full Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Pepper Potts"
                  style={{ background: '#090D16', border: '1px solid #1E293B', borderRadius: 6, padding: '10px 12px', color: '#F1F5F9', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8' }}>Email Address *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="e.g. pepper@praxisone.com"
                  style={{ background: '#090D16', border: '1px solid #1E293B', borderRadius: 6, padding: '10px 12px', color: '#F1F5F9', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8' }}>Password *</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Minimum 6 characters"
                  style={{ background: '#090D16', border: '1px solid #1E293B', borderRadius: 6, padding: '10px 12px', color: '#F1F5F9', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8' }}>Platform Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm(p => ({ ...p, role: e.target.value as 'administrator' | 'operations_manager' | 'consultant' | 'client' }))}
                  style={{ background: '#090D16', border: '1px solid #1E293B', borderRadius: 6, padding: '10px 12px', color: '#F1F5F9', fontSize: '0.85rem' }}
                >
                  <option value="administrator">Platform Administrator (Full Access)</option>
                  <option value="operations_manager">Operations Manager</option>
                  <option value="consultant">Consultant</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ background: 'transparent', border: '1px solid #1E293B', color: '#F1F5F9', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ background: '#5EEAD4', border: 'none', color: '#090D16', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                >
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && selectedMember && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 8, padding: 24, width: '100%', maxWidth: 500, position: 'relative' }}>
            <button
              onClick={() => {
                setShowResetModal(false);
                setSelectedMember(null);
              }}
              style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              ✕
            </button>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC', marginBottom: 8 }}>Reset Password</h2>
            <p style={{ color: '#94A3B8', fontSize: '0.8rem', marginBottom: 20 }}>
              Enter a new password for platform team member <strong>{selectedMember.full_name}</strong> ({selectedMember.email}).
            </p>

            {resetError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '10px 14px', marginBottom: 20, color: '#F87171', fontSize: '0.8rem' }}>
                {resetError}
              </div>
            )}

            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8' }}>New Password *</label>
                <input
                  type="password"
                  required
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  autoFocus
                  style={{ background: '#090D16', border: '1px solid #1E293B', borderRadius: 6, padding: '10px 12px', color: '#F1F5F9', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setSelectedMember(null);
                  }}
                  style={{ background: 'transparent', border: '1px solid #1E293B', color: '#F1F5F9', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  style={{ background: '#5EEAD4', border: 'none', color: '#090D16', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                >
                  {resetSubmitting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
