'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface CompanyData {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
  whatsappSetupComplete: boolean;
  whatsappPhoneNumberId: string | null;
  whatsappVerifiedName: string | null;
  whatsappPhoneNumber: string | null;
  email: string | null;
  contactNumber: string | null;
  address: string | null;
  website: string | null;
}

interface PersonalData {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  image: string | null;
  contactNumber: string | null;
  createdAt: string;
}

function SettingsPageContent() {
  const { user, tenant, updateUser } = useAuth();
  const { toast } = useToast();
  
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const codeParam = searchParams.get('code');

  const [activeTab, setActiveTab] = useState<'profile' | 'whatsapp' | 'personal'>('personal');

  const isAdminOrOps = user?.role === 'administrator' || user?.role === 'operations_manager';

  useEffect(() => {
    if (user) {
      if (user.role !== 'administrator' && user.role !== 'operations_manager') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveTab('personal');
      } else {
        if (tabParam === 'personal') {
          setActiveTab('personal');
        } else if (tabParam === 'whatsapp' || codeParam) {
          setActiveTab('whatsapp');
        } else {
          setActiveTab('profile');
        }
      }
    }
  }, [user, tabParam, codeParam]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [personal, setPersonal] = useState<PersonalData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    slug: '',
    email: '',
    contactNumber: '',
    address: '',
    website: '',
  });

  // Personal Profile Form State
  const [personalForm, setPersonalForm] = useState({
    name: '',
    email: '',
    contactNumber: '',
    image: '',
  });

  // Manual WhatsApp Form State
  const [manualForm, setManualForm] = useState({
    phoneNumberId: '',
    accessToken: '',
  });

  // Fetch all company, WhatsApp, and personal settings
  useEffect(() => {
    if (!tenant) return;
    let isMounted = true;

    const fetchSettings = async () => {
      try {
        const [compRes, persRes] = await Promise.all([
          fetch('/api/settings/company'),
          fetch('/api/settings/profile')
        ]);

        if (compRes.ok && persRes.ok) {
          const compDataObj = await compRes.json();
          const persDataObj = await persRes.json();

          if (isMounted) {
            const compData = compDataObj.data;
            const persData = persDataObj.data;

            setCompany(compData);
            setProfileForm({
              name: compData.name || '',
              slug: compData.slug || '',
              email: compData.email || '',
              contactNumber: compData.contactNumber || '',
              address: compData.address || '',
              website: compData.website || '',
            });

            setPersonal(persData);
            setPersonalForm({
              name: persData.name || '',
              email: persData.email || '',
              contactNumber: persData.contactNumber || '',
              image: persData.image || '',
            });
          }
        } else {
          toast('Failed to load settings', 'error');
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
        toast('Failed to load settings', 'error');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, [tenant, toast, refreshKey]);

  // Handle URL code exchange if returning from Facebook OAuth
  const exchangeCode = useCallback(async (code: string, redirectUri: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to exchange token');
      toast('WhatsApp Business successfully connected!', 'success');
      // Refresh settings to get updated connection details
      setRefreshKey(prev => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect WhatsApp';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }, [toast]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthCode = urlParams.get('code');
    const oauthError = urlParams.get('error');

    if (oauthError) {
      toast('Facebook authorisation cancelled or failed.', 'error');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (oauthCode) {
      window.history.replaceState({}, '', window.location.pathname);
      const redirectUri = `${window.location.origin}/dashboard/settings`;
      setTimeout(() => exchangeCode(oauthCode, redirectUri), 0);
    }
  }, [exchangeCode, toast]);

  // Save Profile Changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name.trim()) {
      toast('Company Name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileForm.name,
          slug: profileForm.slug,
          email: profileForm.email,
          contactNumber: profileForm.contactNumber,
          address: profileForm.address,
          website: profileForm.website,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      toast('Company profile updated successfully!', 'success');
      setCompany(data.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Save Personal Profile Changes
  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalForm.name.trim()) {
      toast('Name is required', 'error');
      return;
    }
    if (!personalForm.email.trim()) {
      toast('Email is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: personalForm.name,
          email: personalForm.email,
          contactNumber: personalForm.contactNumber,
          image: personalForm.image,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update personal profile');

      toast('Personal profile updated successfully!', 'success');
      setPersonal(data.data);
      if (updateUser) {
        await updateUser({
          name: data.data.name,
          email: data.data.email,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update personal profile';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast('Current password is required', 'error');
      return;
    }
    if (newPassword.length < 6) {
      toast('New password must be at least 6 characters long', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('New passwords do not match', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: personalForm.name,
          email: personalForm.email,
          contactNumber: personalForm.contactNumber,
          image: personalForm.image,
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      toast('Password updated successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to change password';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Launch Meta Sign-up redirect
  const handleMetaSignup = () => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID || '';
    const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID || '';
    const redirectUri = `${window.location.origin}/dashboard/settings`;

    if (!appId || !configId) {
      toast('WhatsApp connection is not configured correctly. Missing App ID or Config ID.', 'error');
      return;
    }

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'whatsapp_business_management,whatsapp_business_messaging',
      config_id: configId,
    });

    window.location.href = `https://www.facebook.com/dialog/oauth?${params.toString()}`;
  };

  // Save Manual WhatsApp Setup
  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.phoneNumberId || !manualForm.accessToken) {
      toast('Please fill in all manual settings fields', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/settings/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isManual: true,
          phoneNumberId: manualForm.phoneNumberId,
          accessToken: manualForm.accessToken,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save manual settings');

      toast('WhatsApp Business credentials saved successfully!', 'success');
      setManualForm({ phoneNumberId: '', accessToken: '' });
      setRefreshKey(prev => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save manual settings';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Disconnect WhatsApp
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect WhatsApp? You will no longer be able to message clients directly.')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/settings/whatsapp/status', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to disconnect');
      toast('WhatsApp successfully disconnected');
      setRefreshKey(prev => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to disconnect';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Copy Onboarding Link Helper
  const copyOnboardingLink = () => {
    if (!company) return;
    const link = `${window.location.origin}/onboard/${company.slug}`;
    navigator.clipboard.writeText(link);
    toast('Client onboarding link copied to clipboard!', 'success');
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ padding: 80 }}>
        <span className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  const onboardingUrl = company ? `${typeof window !== 'undefined' ? window.location.origin : ''}/onboard/${company.slug}` : '';

  return (
    <div style={{ maxWidth: 800 }} className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your company profile and external integrations</p>
        </div>
      </div>

      {saving && (
        <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <span className="spinner" />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Processing settings updates…</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {isAdminOrOps && (
          <>
            <button 
              className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              🏢 Company Profile
            </button>
            <button 
              className={`tab ${activeTab === 'whatsapp' ? 'active' : ''}`}
              onClick={() => setActiveTab('whatsapp')}
            >
              💬 WhatsApp Integration
            </button>
          </>
        )}
        <button 
          className={`tab ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          👤 Personal Profile
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'profile' && company && isAdminOrOps && (
        <div className="stack">
          {/* Company details editor */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>🏢 Profile Details</h3>
            <form onSubmit={handleSaveProfile} className="stack">
              <div className="form-group">
                <label className="form-label">Firm/Company Name</label>
                <input 
                  type="text" 
                  className="input" 
                  value={profileForm.name} 
                  onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. PraxisOne Advisory"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Firm URL Slug / Workspace Address</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontFamily: 'monospace' }}>praxisone.com/onboard/</span>
                  <input 
                    type="text" 
                    className="input" 
                    value={profileForm.slug} 
                    onChange={(e) => setProfileForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
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
                    onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="e.g. info@firm.co.za"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Telephone Number</label>
                  <input 
                    type="tel" 
                    className="input" 
                    value={profileForm.contactNumber} 
                    onChange={(e) => setProfileForm(prev => ({ ...prev, contactNumber: e.target.value }))}
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
                  onChange={(e) => setProfileForm(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="e.g. https://www.firm.co.za"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Physical Address</label>
                <textarea 
                  className="textarea" 
                  value={profileForm.address} 
                  onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
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

          {/* Client onboarding portal card */}
          <div className="card" style={{ border: '1px solid rgba(59, 130, 246, 0.2)', background: 'rgba(59, 130, 246, 0.02)' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 8 }}>🚀 Public Client Onboarding Portal</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
              Share this secure link with new clients. When they visit this page, they can fill in their details and immediately onboard into your compliance workspace.
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '10px 16px', borderRadius: 'var(--radius-md)' }}>
              <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {onboardingUrl}
              </span>
              <button 
                onClick={copyOnboardingLink} 
                className="btn btn-secondary btn-sm"
                style={{ flexShrink: 0 }}
              >
                📋 Copy Link
              </button>
            </div>
          </div>

          {/* Firm Subscription Details */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 16 }}>💳 Account & Subscription</h3>
            <div className="stack" style={{ gap: 12 }}>
              <div className="flex-between" style={{ fontSize: '0.9rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subscription Plan</span>
                <span className="badge badge-green" style={{ textTransform: 'capitalize' }}>{company.plan} Plan</span>
              </div>
              <div className="flex-between" style={{ fontSize: '0.9rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Registration Date</span>
                <span style={{ fontWeight: 500 }}>{new Date(company.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
              </div>
              <div className="flex-between" style={{ fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>WhatsApp Connection Status</span>
                <span className={`badge ${company.whatsappSetupComplete ? 'badge-green' : 'badge-gray'}`}>
                  {company.whatsappSetupComplete ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'whatsapp' && company && isAdminOrOps && (
        <div className="stack">
          {company.whatsappSetupComplete ? (
            <div className="card" style={{ border: '1px solid rgba(16, 185, 129, 0.2)', background: 'rgba(16, 185, 129, 0.02)' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ fontSize: '2rem' }}>✅</div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>WhatsApp Business Connected</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>
                    Clients can now message you on your connected number. Your incoming messages will appear automatically in the Inbox.
                  </p>
                  
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 8, 
                    background: 'rgba(0,0,0,0.15)', 
                    padding: '12px 16px', 
                    borderRadius: 'var(--radius-sm)', 
                    width: 'fit-content', 
                    marginBottom: 16,
                    fontSize: '0.85rem'
                  }}>
                    {company.whatsappVerifiedName && (
                      <div>
                        <strong style={{ color: 'var(--text-muted)' }}>Verified Name:</strong> <span style={{ fontWeight: 500 }}>{company.whatsappVerifiedName}</span>
                      </div>
                    )}
                    {company.whatsappPhoneNumber && (
                      <div>
                        <strong style={{ color: 'var(--text-muted)' }}>WhatsApp Number:</strong> <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>{company.whatsappPhoneNumber}</span>
                      </div>
                    )}
                    <div>
                      <strong style={{ color: 'var(--text-muted)' }}>Phone Number ID:</strong> <code>{company.whatsappPhoneNumberId}</code>
                    </div>
                  </div>

                  <button 
                    className="btn btn-secondary" 
                    style={{ color: 'var(--red)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                    onClick={handleDisconnect}
                    disabled={saving}
                  >
                    Disconnect WhatsApp
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="stack">
              {/* Connection Type Tabs */}
              <div className="card">
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 8 }}>Connect in 60 Seconds</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
                  Use Meta&apos;s secure OAuth flow to link your WhatsApp Business number. You&apos;ll be redirected to Facebook to authorise, then returned here automatically.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                  <div style={{ display: 'flex', gap: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span>1️⃣</span>
                    <span>Click <strong>Connect WhatsApp</strong> below — you&apos;ll be redirected to Facebook.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span>2️⃣</span>
                    <span>Log in and grant permissions to PraxisOne.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span>3️⃣</span>
                    <span>You&apos;ll be returned here automatically and your account will be connected.</span>
                  </div>
                </div>

                <button 
                  className="btn btn-primary" 
                  onClick={handleMetaSignup}
                  disabled={saving}
                  style={{ background: '#1877F2', borderColor: '#1877F2', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  {saving ? <span className="spinner" /> : '🔵 Connect WhatsApp Business'}
                </button>
              </div>

              <div className="card">
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 8 }}>Manual Developer Setup</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
                  If you have a developer access token and phone number ID from your Meta Developer Console, enter them directly below.
                </p>

                <form onSubmit={handleManualSave} className="stack">
                  <div className="form-group">
                    <label className="form-label">WhatsApp Phone Number ID</label>
                    <input 
                      className="input" 
                      required 
                      value={manualForm.phoneNumberId} 
                      onChange={(e) => setManualForm(p => ({ ...p, phoneNumberId: e.target.value }))}
                      placeholder="e.g. 1166894683176895"
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>The ID of your verified business phone number in Meta App console.</span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">System User / Permanent Access Token</label>
                    <textarea 
                      className="input" 
                      required 
                      rows={4}
                      value={manualForm.accessToken} 
                      onChange={(e) => setManualForm(p => ({ ...p, accessToken: e.target.value }))}
                      placeholder="EAAVGGRx7vzoBRwX..."
                      style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>A long-lived or permanent system user token with access to send messages.</span>
                  </div>

                  <div style={{ marginTop: 12 }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? <span className="spinner" /> : 'Save Settings'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'personal' && personal && (
        <div className="stack">
          {/* Personal details editor */}
          <div className="card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>👤 Personal Profile</h3>
            <form onSubmit={handleSavePersonal} className="stack">
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, background: 'rgba(0,0,0,0.15)', padding: 16, borderRadius: 'var(--radius-md)' }}>
                <div style={{ position: 'relative' }}>
                  {personalForm.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={personalForm.image} 
                      alt="Avatar" 
                      style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }} 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(personalForm.name || 'User')}`;
                      }}
                    />
                  ) : (
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'var(--text-muted)' }}>
                      👤
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>User ID (Troubleshooting)</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 600 }}>{personal.id}</div>
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
                  onChange={(e) => setPersonalForm(prev => ({ ...prev, name: e.target.value }))}
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
                    onChange={(e) => setPersonalForm(prev => ({ ...prev, email: e.target.value }))}
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
                    onChange={(e) => setPersonalForm(prev => ({ ...prev, contactNumber: e.target.value }))}
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
                  onChange={(e) => setPersonalForm(prev => ({ ...prev, image: e.target.value }))}
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

          {/* Change Password Card */}
          <div className="card" style={{ marginTop: 24 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>🔒 Change Password</h3>
            <form onSubmit={handleChangePassword} className="stack">
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input 
                  type="password" 
                  className="input" 
                  value={currentPassword} 
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input 
                    type="password" 
                    className="input" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input 
                    type="password" 
                    className="input" 
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
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <span className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    }>
      <SettingsPageContent />
    </Suspense>
  );
}
