'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: 'administrator' | 'operations_manager' | 'consultant' | 'client';
  created_at: string;
}

export default function TeamPage() {
  const { user, tenant } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal / Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'consultant',
  });

  const loadMembers = async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to load team members');
      const { data } = await res.json();
      setMembers(data || []);
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenant) {
      loadMembers();
    }
  }, [tenant]);

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

      toast('Team member added successfully');
      setForm({ name: '', email: '', password: '', role: 'consultant' });
      setShowAddModal(false);
      loadMembers();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMember = async (memberId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from your team?`)) return;

    try {
      const res = await fetch(`/api/users/${memberId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove team member');
      }

      toast('Team member removed successfully');
      loadMembers();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  const roleBadgeColor = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'var(--red)';
      case 'operations_manager':
        return 'var(--accent)';
      case 'consultant':
        return '#8b5cf6'; // Purple
      default:
        return 'var(--text-secondary)';
    }
  };

  const canManage = user?.role === 'administrator' || user?.role === 'operations_manager';

  if (loading) return <div className="flex-center" style={{ padding: 80 }}><span className="spinner" style={{ width: 40, height: 40 }} /></div>;

  return (
    <div style={{ maxWidth: 1000 }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Team Management</h1>
          <p className="page-subtitle">Manage your advisory firm staff and roles</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Add Team Member
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Date Added</th>
              {canManage && <th style={{ textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 5 : 4} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  No team members found
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.full_name}</td>
                  <td>{m.email}</td>
                  <td>
                    <span 
                      style={{ 
                        display: 'inline-block',
                        padding: '2px 8px', 
                        borderRadius: 'var(--radius-sm)', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        background: 'rgba(255,255,255,0.05)',
                        color: roleBadgeColor(m.role),
                        border: `1px solid ${roleBadgeColor(m.role)}22`
                      }}
                    >
                      {m.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                  {canManage && (
                    <td style={{ textAlign: 'right' }}>
                      {m.id === user?.id ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', paddingRight: 8 }}>You</span>
                      ) : (
                        <button 
                          className="btn btn-ghost btn-sm" 
                          style={{ color: 'var(--red)', padding: '2px 8px' }}
                          onClick={() => handleDeleteMember(m.id, m.full_name)}
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div className="card" style={{ width: '100%', maxWidth: 500, border: '1px solid var(--border-primary)', position: 'relative' }}>
            <button 
              onClick={() => setShowAddModal(false)}
              style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              ✕
            </button>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>Add Team Member</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>Create a new staff login and set their platform permissions.</p>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 20, color: 'var(--red)', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleAddMember} className="stack">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input 
                  className="input" 
                  required 
                  value={form.name} 
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input 
                  className="input" 
                  type="email" 
                  required 
                  value={form.email} 
                  onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="e.g. john@company.co.za"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password *</label>
                <input 
                  className="input" 
                  type="password" 
                  required 
                  value={form.password} 
                  onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Platform Role *</label>
                <select 
                  className="select" 
                  value={form.role} 
                  onChange={(e) => setForm(p => ({ ...p, role: e.target.value as any }))}
                >
                  <option value="administrator">Administrator (Full Access)</option>
                  <option value="operations_manager">Operations Manager</option>
                  <option value="consultant">Consultant</option>
                  <option value="client">Client</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="spinner" /> : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
