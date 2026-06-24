'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export default function WhatsAppSettingsPage() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ connected: boolean; phoneNumberId: string | null }>({
    connected: false,
    phoneNumberId: null
  });
  const [activeTab, setActiveTab] = useState<'guided' | 'manual'>('guided');

  // Manual configuration form inputs
  const [manualForm, setManualForm] = useState({
    phoneNumberId: '',
    accessToken: ''
  });

  // Exchange an OAuth code returned in the URL query params after the redirect flow
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
      setStatus({ connected: true, phoneNumberId: data.phoneNumberId });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect WhatsApp';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!tenant) return;
    let isCancelled = false;

    // Handle OAuth redirect callback: Facebook returns ?code=... after user authorises
    const urlParams = new URLSearchParams(window.location.search);
    const oauthCode = urlParams.get('code');
    const oauthError = urlParams.get('error');

    if (oauthError) {
      toast('Facebook authorisation cancelled or failed.', 'error');
      // Clean up the URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (oauthCode) {
      // Clean up the URL immediately so a page refresh doesn't re-trigger exchange
      window.history.replaceState({}, '', window.location.pathname);
      const redirectUri = `${window.location.origin}/dashboard/settings/whatsapp`;
      // Defer to avoid calling setState synchronously inside the effect body
      setTimeout(() => exchangeCode(oauthCode, redirectUri), 0);
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/settings/whatsapp/status');
        if (res.ok && !isCancelled) {
          const data = await res.json();
          setStatus(data);
        }
      } catch (err) {
        console.error('Failed to load status:', err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };
    fetchStatus();
    return () => {
      isCancelled = true;
    };
  }, [tenant, exchangeCode, toast]);

  // Launch the Facebook OAuth redirect flow.
  // Uses a standard redirect (not a popup) which is compatible with the "General"
  // Facebook Login for Business configuration type.
  const handleMetaSignup = () => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID || '';
    const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID || '';
    const redirectUri = `${window.location.origin}/dashboard/settings/whatsapp`;

    console.log('[WA Connect] appId:', appId, '| configId:', configId, '| redirectUri:', redirectUri);

    if (!appId || !configId) {
      toast('WhatsApp connection is not configured correctly. Missing App ID or Config ID.', 'error');
      return;
    }

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'business_management,whatsapp_business_management,whatsapp_business_messaging',
      config_id: configId,
    });

    // Redirect to Facebook's OAuth dialog. On completion, Facebook redirects back
    // to redirectUri with ?code=... which is handled in the useEffect above.
    window.location.href = `https://www.facebook.com/dialog/oauth?${params.toString()}`;
  };

  // Handle Manual Connection
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
          accessToken: manualForm.accessToken
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save manual settings');

      toast('WhatsApp Business credentials saved successfully!', 'success');
      setStatus({
        connected: true,
        phoneNumberId: manualForm.phoneNumberId
      });
      setManualForm({ phoneNumberId: '', accessToken: '' });
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
      setStatus({ connected: false, phoneNumberId: null });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to disconnect';
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex-center" style={{ padding: 80 }}><span className="spinner" style={{ width: 40, height: 40 }} /></div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">WhatsApp Integration Settings</h1>
          <p className="page-subtitle">Configure your firm&apos;s own WhatsApp Business account for client messaging</p>
        </div>
      </div>

      {saving && (
        <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}>
          <span className="spinner" />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Connecting your WhatsApp Business account…</span>
        </div>
      )}

      {status.connected ? (
        <div className="card" style={{ border: '1px solid rgba(16, 185, 129, 0.2)', background: 'rgba(16, 185, 129, 0.02)' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ fontSize: '2rem' }}>✅</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>WhatsApp Business Connected</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>
                Clients can now message you on your connected number. Your incoming messages will appear automatically in the Inbox.
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.1)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', width: 'fit-content', marginBottom: 16 }}>
                <strong>Phone Number ID:</strong> <code>{status.phoneNumberId}</code>
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
          {/* Tabs header */}
          <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid var(--border-primary)', marginBottom: 20 }}>
            <button 
              onClick={() => setActiveTab('guided')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'guided' ? '2px solid var(--accent)' : 'none',
                color: activeTab === 'guided' ? 'var(--text-primary)' : 'var(--text-muted)',
                padding: '10px 16px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🚀 Guided Connection (Meta App)
            </button>
            <button 
              onClick={() => setActiveTab('manual')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'manual' ? '2px solid var(--accent)' : 'none',
                color: activeTab === 'manual' ? 'var(--text-primary)' : 'var(--text-muted)',
                padding: '10px 16px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🛠️ Manual Developer Setup
            </button>
          </div>

          {activeTab === 'guided' ? (
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
          ) : (
            <div className="card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 8 }}>Manual Configuration</h3>
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
          )}
        </div>
      )}
    </div>
  );
}
