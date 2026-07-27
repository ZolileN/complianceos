'use client';

import React, { useState, useEffect } from 'react';
import { KeyRound, Plus, Trash2, UsersRound, X } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: 'administrator' | 'operations_manager' | 'consultant';
  created_at: string;
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'outline';

function roleVariant(role: string): BadgeVariant {
  switch (role) {
    case 'administrator':
      return 'destructive';
    case 'operations_manager':
      return 'info';
    case 'consultant':
      return 'success';
    default:
      return 'outline';
  }
}

export default function PlatformTeamPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'administrator' as 'administrator' | 'operations_manager' | 'consultant',
  });

  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    let active = true;
    const fetchTeam = async () => {
      try {
        const res = await fetch('/api/users');
        if (!res.ok) throw new Error('Failed to load platform team members');
        const { data } = await res.json();
        if (active) setMembers(data || []);
      } catch (err) {
        if (active) toast((err as Error).message, 'error');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchTeam();

    return () => {
      active = false;
    };
  }, [refreshKey, toast]);

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
      setRefreshKey((k) => k + 1);
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
      type: 'danger',
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
      setRefreshKey((k) => k + 1);
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

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-[1500px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-sm text-[var(--text-muted)]">
          <span className="spinner size-8" />
          <span>Loading platform team registry...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
            <UsersRound className="size-3.5" />
            Registry
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">
            Platform team
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Manage internal staff accounts and access levels for the PraxisOne master tenant.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <Plus />
          Add team member
        </Button>
      </section>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                {['Full name', 'Email address', 'Role', 'Setup date', 'Actions'].map((label) => (
                  <th
                    key={label}
                    className={`px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase ${
                      label === 'Actions' ? 'text-right' : ''
                    }`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500 italic">
                    No platform team members found.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3.5 text-sm font-semibold text-slate-900">
                      {m.full_name}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{m.email}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant={roleVariant(m.role)} className="capitalize">
                        {m.role.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">
                      {new Date(m.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedMember(m);
                            setResetPassword('');
                            setResetError('');
                            setShowResetModal(true);
                          }}
                        >
                          <KeyRound />
                          Reset password
                        </Button>
                        {m.id === user?.id ? (
                          <span className="px-2 text-xs italic text-slate-400">You</span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteMember(m.id, m.full_name)}
                          >
                            <Trash2 />
                            Remove
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <Card className="relative w-full max-w-[500px]">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3"
              onClick={() => setShowAddModal(false)}
              aria-label="Close"
            >
              <X />
            </Button>
            <CardContent className="pt-5">
              <h2 className="mb-1 text-xl font-semibold text-slate-950">
                Add platform team member
              </h2>
              <p className="mb-5 text-sm text-slate-500">
                Provision a new administrative or staff account linked to the PraxisOne master
                tenant.
              </p>

              {error && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
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
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Pepper Potts"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    className="input"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="e.g. pepper@praxisone.com"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input
                    className="input"
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    placeholder="Minimum 6 characters"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Platform Role *</label>
                  <select
                    className="select"
                    value={form.role}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        role: e.target.value as
                          | 'administrator'
                          | 'operations_manager'
                          | 'consultant',
                      }))
                    }
                  >
                    <option value="administrator">Platform Administrator (Full Access)</option>
                    <option value="operations_manager">Operations Manager</option>
                    <option value="consultant">Consultant</option>
                  </select>
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={submitting}>
                    {submitting ? <span className="spinner" /> : 'Create account'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {showResetModal && selectedMember && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <Card className="relative w-full max-w-[500px]">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3"
              onClick={() => {
                setShowResetModal(false);
                setSelectedMember(null);
              }}
              aria-label="Close"
            >
              <X />
            </Button>
            <CardContent className="pt-5">
              <h2 className="mb-1 text-xl font-semibold text-slate-950">Reset password</h2>
              <p className="mb-5 text-sm text-slate-500">
                Enter a new password for platform team member{' '}
                <strong>{selectedMember.full_name}</strong> ({selectedMember.email}).
              </p>

              {resetError && (
                <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                  {resetError}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="stack">
                <div className="form-group">
                  <label className="form-label">New Password *</label>
                  <input
                    className="input"
                    type="password"
                    required
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    autoFocus
                  />
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowResetModal(false);
                      setSelectedMember(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={resetSubmitting}>
                    {resetSubmitting ? <span className="spinner" /> : 'Reset password'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
