'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

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

  // Profile Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  // Password State
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
      } catch (err: any) {
        showToast(err.message || 'Error loading profile', 'error');
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
    } catch (err: any) {
      showToast(err.message || 'Failed to update details', 'error');
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
          newPassword
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      showToast('Account password updated successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message || 'Failed to update password', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: '#94A3B8' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #5EEAD4', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
          <span>Loading account settings...</span>
        </div>
        <style jsx>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800 }}>
      {/* Toast */}
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
          fontSize: '0.85rem'
        }}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#F8FAFC' }}>Personal Profile</h1>
        <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: 4 }}>
          Manage your platform administrator credentials, email notifications, and primary secure keys.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        {/* Profile Info Form */}
        <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 8, padding: 24 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: 16 }}>Profile Details</h2>
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8' }}>Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ background: '#090D16', border: '1px solid #1E293B', borderRadius: 6, padding: '10px 14px', color: '#F1F5F9', fontSize: '0.85rem' }}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8' }}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ background: '#090D16', border: '1px solid #1E293B', borderRadius: 6, padding: '10px 14px', color: '#F1F5F9', fontSize: '0.85rem' }}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8' }}>Contact Number</label>
              <input
                type="tel"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                style={{ background: '#090D16', border: '1px solid #1E293B', borderRadius: 6, padding: '10px 14px', color: '#F1F5F9', fontSize: '0.85rem' }}
                placeholder="+27..."
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748B', borderTop: '1px solid #1E293B', paddingTop: 16, marginTop: 8 }}>
              <span>Role:</span>
              <span style={{ color: '#5EEAD4', fontWeight: 600, textTransform: 'uppercase' }}>{personal?.role}</span>
            </div>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: '#5EEAD4',
                color: '#090D16',
                border: 'none',
                borderRadius: 6,
                padding: '10px 16px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: 8
              }}
            >
              {saving ? 'Saving...' : 'Save Profile Details'}
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 8, padding: 24 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: 16 }}>Security & Password</h2>
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8' }}>Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={{ background: '#090D16', border: '1px solid #1E293B', borderRadius: 6, padding: '10px 14px', color: '#F1F5F9', fontSize: '0.85rem' }}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8' }}>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ background: '#090D16', border: '1px solid #1E293B', borderRadius: 6, padding: '10px 14px', color: '#F1F5F9', fontSize: '0.85rem' }}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8' }}>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ background: '#090D16', border: '1px solid #1E293B', borderRadius: 6, padding: '10px 14px', color: '#F1F5F9', fontSize: '0.85rem' }}
                required
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: 'transparent',
                border: '1px solid #1E293B',
                color: '#F1F5F9',
                borderRadius: 6,
                padding: '10px 16px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: 8
              }}
            >
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
