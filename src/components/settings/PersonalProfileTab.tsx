'use client';

import React from 'react';
import { PasswordInput } from '@/components/ui/password-input';
import type { PersonalData, PersonalProfileForm } from './types';

interface PersonalProfileTabProps {
  personal: PersonalData;
  personalForm: PersonalProfileForm;
  setPersonalForm: React.Dispatch<React.SetStateAction<PersonalProfileForm>>;
  saving: boolean;
  currentPassword: string;
  setCurrentPassword: (value: string) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  onSavePersonal: (e: React.FormEvent) => void;
  onChangePassword: (e: React.FormEvent) => void;
}

export default function PersonalProfileTab({
  personal,
  personalForm,
  setPersonalForm,
  saving,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  onSavePersonal,
  onChangePassword,
}: PersonalProfileTabProps) {
  return (
    <div className="stack">
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>👤 Personal Profile</h3>
        <form onSubmit={onSavePersonal} className="stack">
          <div
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              marginBottom: 16,
              background: 'rgba(0,0,0,0.15)',
              padding: 16,
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ position: 'relative' }}>
              {personalForm.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={personalForm.image}
                  alt="Avatar"
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid var(--accent)',
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                      personalForm.name || 'User'
                    )}`;
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  👤
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>User ID (Troubleshooting)</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 600 }}>
                {personal.id}
              </div>
              <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>System Role:</span>
                <span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>
                  {personal.role.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="input"
              value={personalForm.name}
              onChange={(e) => setPersonalForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. John Doe"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="input"
                value={personalForm.email}
                onChange={(e) => setPersonalForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="e.g. johndoe@firm.co.za"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Number</label>
              <input
                type="tel"
                className="input"
                value={personalForm.contactNumber}
                onChange={(e) => setPersonalForm((prev) => ({ ...prev, contactNumber: e.target.value }))}
                placeholder="e.g. +27 72 123 4567"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Avatar / Profile Image URL</label>
            <input
              type="url"
              className="input"
              value={personalForm.image}
              onChange={(e) => setPersonalForm((prev) => ({ ...prev, image: e.target.value }))}
              placeholder="e.g. https://images.unsplash.com/... or leave blank for initials"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Provide a link to an image, or leave it blank to automatically generate an initials avatar.
            </span>
          </div>

          <div style={{ marginTop: 12 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>🔒 Change Password</h3>
        <form onSubmit={onChangePassword} className="stack">
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <PasswordInput
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">New Password</label>
              <PasswordInput
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <PasswordInput
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Updating Password...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
