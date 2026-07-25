'use client';

import React from 'react';
import type { CompanyData } from './types';

interface WhatsAppTabProps {
  company: CompanyData;
  saving: boolean;
  connectPhone: string;
  setConnectPhone: (value: string) => void;
  otpCode: string;
  setOtpCode: (value: string) => void;
  connectStep: 'phone' | 'otp';
  setConnectStep: (step: 'phone' | 'otp') => void;
  onSendOtp: (e: React.FormEvent) => void;
  onVerifyOtp: (e: React.FormEvent) => void;
  onDisconnect: () => void;
}

export default function WhatsAppTab({
  company,
  saving,
  connectPhone,
  setConnectPhone,
  otpCode,
  setOtpCode,
  connectStep,
  setConnectStep,
  onSendOtp,
  onVerifyOtp,
  onDisconnect,
}: WhatsAppTabProps) {
  if (company.whatsappSetupComplete) {
    return (
      <div className="stack">
        <div className="card" style={{ border: '1px solid rgba(16, 185, 129, 0.2)', background: 'rgba(16, 185, 129, 0.02)' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ fontSize: '2rem' }}>✅</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 4 }}>WhatsApp Connected via Twilio</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>
                Your WhatsApp number is verified and connected. Incoming messages will appear automatically in the Inbox.
              </p>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  background: 'rgba(0,0,0,0.15)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  width: 'fit-content',
                  marginBottom: 16,
                  fontSize: '0.85rem',
                }}
              >
                {company.whatsappPhoneNumber && (
                  <div>
                    <strong style={{ color: 'var(--text-muted)' }}>WhatsApp Number:</strong>{' '}
                    <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>{company.whatsappPhoneNumber}</span>
                  </div>
                )}
                <div>
                  <strong style={{ color: 'var(--text-muted)' }}>Provider:</strong>{' '}
                  <span className="badge badge-green" style={{ textTransform: 'capitalize' }}>
                    Twilio
                  </span>
                </div>
                <div>
                  <strong style={{ color: 'var(--text-muted)' }}>Status:</strong>{' '}
                  <span className="badge badge-green">Active</span>
                </div>
              </div>

              <div
                style={{
                  padding: '10px 14px',
                  background: 'rgba(59,130,246,0.07)',
                  border: '1px solid rgba(59,130,246,0.15)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  marginBottom: 16,
                }}
              >
                💡 <strong>Sandbox Mode:</strong> Messages are routed through the Twilio Sandbox number. Clients must first
                join the sandbox by sending the join code to the Twilio sandbox number before messages can be received.
              </div>

              <button
                className="btn btn-secondary"
                style={{ color: 'var(--red)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                onClick={onDisconnect}
                disabled={saving}
              >
                Disconnect WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 8 }}>Connect Your WhatsApp Number</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>
          Link your WhatsApp number to start receiving and sending messages directly from PraxisOne. We&apos;ll verify your
          number with a one-time code.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>1️⃣</span>
            <span>Enter your WhatsApp phone number below.</span>
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>2️⃣</span>
            <span>Receive a verification code via SMS.</span>
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>3️⃣</span>
            <span>Enter the code — your WhatsApp is instantly connected to PraxisOne.</span>
          </div>
        </div>

        {connectStep === 'phone' ? (
          <form onSubmit={onSendOtp} className="stack">
            <div className="form-group">
              <label className="form-label">WhatsApp Phone Number</label>
              <input
                className="input"
                type="tel"
                required
                value={connectPhone}
                onChange={(e) => setConnectPhone(e.target.value)}
                placeholder="e.g. +27 82 531 9901"
                style={{ maxWidth: 340 }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Enter your number with country code. We&apos;ll send a verification code via SMS.
              </span>
            </div>
            <div style={{ marginTop: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {saving ? <span className="spinner" /> : '📱 Send Verification Code'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={onVerifyOtp} className="stack">
            <div
              style={{
                padding: '10px 14px',
                background: 'rgba(16,185,129,0.07)',
                border: '1px solid rgba(16,185,129,0.15)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                color: 'var(--text-secondary)',
                marginBottom: 8,
              }}
            >
              ✅ Verification code sent to <strong style={{ color: 'var(--text-primary)' }}>{connectPhone}</strong>
            </div>
            <div className="form-group">
              <label className="form-label">Verification Code</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Enter 6-digit code"
                style={{ maxWidth: 200, letterSpacing: '0.3em', fontSize: '1.2rem', textAlign: 'center', fontWeight: 600 }}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {saving ? <span className="spinner" /> : '✓ Verify & Connect'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setConnectStep('phone');
                  setOtpCode('');
                }}
              >
                ← Change Number
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="card" style={{ background: 'rgba(59,130,246,0.02)', border: '1px solid rgba(59,130,246,0.12)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8 }}>ℹ️ Twilio Sandbox Setup</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>
          PraxisOne uses the Twilio WhatsApp Sandbox for development. To test messaging, your clients need to:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <span>1.</span>
            <span>
              Save the Twilio Sandbox number{' '}
              <strong style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>+1 (415) 523-8886</strong> in their
              contacts.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span>2.</span>
            <span>
              Send the sandbox join code (e.g. <code>join &lt;your-code&gt;</code>) to that number via WhatsApp.
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span>3.</span>
            <span>Once joined, all their messages to the sandbox number will arrive in your PraxisOne Inbox.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
