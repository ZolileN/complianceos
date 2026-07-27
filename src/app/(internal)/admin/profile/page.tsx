'use client';

import React, { useState, useEffect } from 'react';
import { KeyRound, UserRound } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface PersonalData {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  contactNumber: string | null;
  createdAt: string;
}

export default function AdminProfile() {
  const [personal, setPersonal] = useState<PersonalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/settings/profile');
        if (!res.ok) throw new Error('Failed to load profile details');
        const dataObj = await res.json();
        const data = dataObj.data;
        setPersonal(data);
        setName(data.name || '');
        setEmail(data.email || '');
        setContactNumber(data.contactNumber || '');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error loading profile';
        showToast(msg, 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return showToast('Name is required', 'error');
    if (!email.trim()) return showToast('Email is required', 'error');

    setSaving(true);
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, contactNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save changes');
      showToast('Personal profile details updated successfully!', 'success');
      setPersonal(data.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update details';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) return showToast('Current password is required', 'error');
    if (newPassword.length < 6) return showToast('Password must be at least 6 characters', 'error');
    if (newPassword !== confirmPassword) return showToast('Passwords do not match', 'error');

    setSaving(true);
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          contactNumber,
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      showToast('Account password updated successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-[1500px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-sm text-slate-500">
          <span className="spinner size-8" />
          <span>Loading account settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[9999] rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
          }`}
        >
          {toast.message}
        </div>
      )}

      <section>
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
          <UserRound className="size-3.5" />
          Account
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">
          Personal profile
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Manage your platform administrator credentials, email notifications, and primary secure
          keys.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile details</CardTitle>
            <CardDescription>Your identity on the PraxisOne control plane.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="stack">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input
                  className="input"
                  type="tel"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="+27..."
                />
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-4 text-xs text-slate-500">
                <span>Role</span>
                <Badge variant="info" className="uppercase">
                  {personal?.role}
                </Badge>
              </div>
              <Button type="submit" variant="primary" disabled={saving} className="mt-2 w-full">
                {saving ? <span className="spinner" /> : 'Save profile details'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4" />
              Security & password
            </CardTitle>
            <CardDescription>Rotate your administrator password.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="stack">
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <PasswordInput
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <PasswordInput
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="outline" disabled={saving} className="mt-2 w-full">
                {saving ? <span className="spinner" /> : 'Update password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
