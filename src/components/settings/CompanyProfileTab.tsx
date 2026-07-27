'use client';

import React from 'react';
import type { CompanyData, CompanyProfileForm } from './types';

interface CompanyProfileTabProps {
  company: CompanyData;
  profileForm: CompanyProfileForm;
  setProfileForm: React.Dispatch<React.SetStateAction<CompanyProfileForm>>;
  saving: boolean;
  onSave: (e: React.FormEvent) => void;
  onCopyOnboardingLink: () => void;
  onboardingUrl: string;
  inboundEmailDomain?: string | null;
  onCopy: (value: string, successMessage: string) => void;
}

export default function CompanyProfileTab({
  company,
  profileForm,
  setProfileForm,
  saving,
  onSave,
  onCopyOnboardingLink,
  onboardingUrl,
  inboundEmailDomain,
  onCopy,
}: CompanyProfileTabProps) {
  const slugChanged = profileForm.slug !== company.slug;
  const inboundAddress = inboundEmailDomain
    ? `${profileForm.slug}@${inboundEmailDomain}`
    : null;

  return (
    <div className="stack">
      <div
        className="card"
        style={{ border: '1px solid rgba(20, 184, 166, 0.2)', background: 'rgba(20, 184, 166, 0.03)' }}
      >
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 8 }}>Workspace identifiers</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
          Your workspace slug routes client onboarding, and your inbound email address delivers mail into
          Inbox → Email for this firm.
        </p>
        <div className="stack" style={{ gap: 12 }}>
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              background: 'rgba(0,0,0,0.15)',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                Workspace slug
              </div>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  color: 'var(--accent)',
                  wordBreak: 'break-all',
                }}
              >
                {profileForm.slug || '—'}
              </span>
            </div>
            {profileForm.slug ? (
              <button
                type="button"
                onClick={() => onCopy(profileForm.slug, 'Workspace slug copied to clipboard')}
                className="btn btn-secondary btn-sm"
                style={{ flexShrink: 0 }}
              >
                Copy
              </button>
            ) : null}
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              background: 'rgba(0,0,0,0.15)',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                Inbound email address
              </div>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  color: 'var(--accent)',
                  wordBreak: 'break-all',
                }}
              >
                {inboundAddress || 'Inbound email not configured — contact your platform admin'}
              </span>
              {slugChanged && inboundAddress ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Preview — save profile changes to apply a new slug.
                </div>
              ) : null}
            </div>
            {inboundAddress ? (
              <button
                type="button"
                onClick={() => onCopy(inboundAddress, 'Inbound email address copied to clipboard')}
                className="btn btn-secondary btn-sm"
                style={{ flexShrink: 0 }}
              >
                Copy
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>🏢 Profile Details</h3>
        <form onSubmit={onSave} className="stack">
          <div className="form-group">
            <label className="form-label">Firm/Company Name</label>
            <input
              type="text"
              className="input"
              value={profileForm.name}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. PraxisOne Advisory"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Firm URL Slug / Workspace Address</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                praxis.mlkcomputer.com/onboard/
              </span>
              <input
                type="text"
                className="input"
                value={profileForm.slug}
                onChange={(e) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                  }))
                }
                placeholder="firm-slug"
                required
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              This slug defines your firm&apos;s unique workspace URL and public client onboarding portal.
            </span>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Contact Email Address</label>
              <input
                type="email"
                className="input"
                value={profileForm.email}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="e.g. info@firm.co.za"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Telephone Number</label>
              <input
                type="tel"
                className="input"
                value={profileForm.contactNumber}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, contactNumber: e.target.value }))}
                placeholder="e.g. +27 11 123 4567"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Website URL</label>
            <input
              type="url"
              className="input"
              value={profileForm.website}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, website: e.target.value }))}
              placeholder="e.g. https://www.firm.co.za"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Physical Address</label>
            <textarea
              className="textarea"
              value={profileForm.address}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="e.g. 123 Main Road, Sandton, Johannesburg, 2196"
              rows={3}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ border: '1px solid rgba(59, 130, 246, 0.2)', background: 'rgba(59, 130, 246, 0.02)' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 8 }}>🚀 Public Client Onboarding Portal</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
          Share this secure link with new clients. When they visit this page, they can fill in their details and immediately
          onboard into your compliance workspace.
        </p>
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            background: 'rgba(0,0,0,0.15)',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <span
            style={{
              flex: 1,
              fontFamily: 'monospace',
              fontSize: '0.85rem',
              color: 'var(--accent)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {onboardingUrl}
          </span>
          <button onClick={onCopyOnboardingLink} className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
            📋 Copy Link
          </button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>💳 Account & Subscription</h3>
        <div className="stack" style={{ gap: 12 }}>
          <div className="flex-between" style={{ fontSize: '0.9rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Subscription Plan</span>
            <span className="badge badge-green" style={{ textTransform: 'capitalize' }}>
              {company.plan} Plan
            </span>
          </div>
          <div className="flex-between" style={{ fontSize: '0.9rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
            <span style={{ color: 'var(--text-secondary)' }}>Registration Date</span>
            <span style={{ fontWeight: 500 }}>
              {new Date(company.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
            </span>
          </div>
          <div className="flex-between" style={{ fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>WhatsApp Connection</span>
            <span className={`badge ${company.whatsappSetupComplete ? 'badge-green' : 'badge-gray'}`}>
              {company.whatsappSetupComplete ? 'Connected (Twilio)' : 'Not Connected'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
