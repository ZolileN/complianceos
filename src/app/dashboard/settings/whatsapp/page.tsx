'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import Script from 'next/script';

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

  useEffect(() => {
    if (!tenant) return;
    let isCancelled = false;
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
  }, [tenant]);

  // Handle Meta Embedded Signup Callback
  const handleMetaSignup = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (!win.FB) {
      toast('Facebook SDK still loading. Please try again in a few seconds.', 'error');
      return;
    }

    const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID || '864556693373307';
    
    win.FB.login((response: { authResponse?: { code: string } }) => {
      if (response.authResponse?.code) {
        const code = response.authResponse.code;
        setSaving(true);
        // Post the code to the token exchange endpoint
        fetch('/api/settings/whatsapp/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to exchange token');
          
          toast('WhatsApp Business successfully connected!', 'success');
          setStatus({
            connected: true,
            phoneNumberId: data.phoneNumberId
          });
        })
        .catch((err: Error) => {
          toast(err.message, 'error');
        })
        .finally(() => {
          setSaving(false);
        });
      } else {
        toast('Connection cancelled or failed.', 'error');
      }
    }, {
      config_id: configId,
      response_type: 'code',
      override_default_response_type: true,
      scope: 'whatsapp_business_management,whatsapp_business_messaging'
    });
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
      {/* Load FB SDK */}
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="lazyOnload"
        onLoad={() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const win = window as any;
          win.fbAsyncInit = function() {
            win.FB.init({
              appId: process.env.NEXT_PUBLIC_META_APP_ID || '864556693373307', // Fallback to config ID or default app
              cookie: true,
              xfbml: true,
              version: 'v20.0'
            });
          };
        }}
      />

      <div className="page-header">
        <div>
          <h1 className="page-title">WhatsApp Integration Settings</h1>
          <p className="page-subtitle">Configure your firm&apos;s own WhatsApp Business account for client messaging</p>
        </div>
      </div>

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
                Use Meta&apos;s secure Embedded Signup to link your WhatsApp Business number. You don&apos;t need any technical skills.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>1️⃣</span>
                  <span>Click <strong>Connect WhatsApp</strong> below to open the Facebook login popup.</span>
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>2️⃣</span>
                  <span>Select or create your Meta Business Profile and WhatsApp Business Account.</span>
                </div>
                <div style={{ display: 'flex', gap: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <span>3️⃣</span>
                  <span>Grant permissions to PraxisOne and return to this page to complete setup.</span>
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
