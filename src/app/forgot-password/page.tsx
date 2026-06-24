'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to request password reset');
      }

      setSuccess(true);
      if (data.devResetUrl) {
        setDevResetUrl(data.devResetUrl);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card card card-glass animate-in" style={{ maxWidth: 450 }}>
        <div className="auth-logo" style={{ justifyContent: 'center', marginBottom: 12 }}>
          <Logo size={42} showText={true} />
        </div>
        <p className="auth-title">Reset password</p>
        <p className="auth-subtitle">Enter your email address to receive a password reset link</p>

        {error && (
          <div className="card" style={{ marginBottom: 20, color: 'var(--red)', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="stack" style={{ gap: 16 }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: 16, borderRadius: 'var(--radius-md)' }}>
              <p style={{ color: 'var(--green)', fontSize: '0.9rem', marginBottom: 0 }}>
                ✓ If an account exists with that email, a password reset link has been generated.
              </p>
            </div>

            {devResetUrl && (
              <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: 16, borderRadius: 'var(--radius-md)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
                  🔧 Development Environment Preview Link:
                </p>
                <Link 
                  href={devResetUrl}
                  style={{ 
                    display: 'block',
                    textAlign: 'center',
                    background: 'var(--accent)', 
                    color: 'white', 
                    padding: '8px 12px', 
                    borderRadius: 'var(--radius-sm)', 
                    textDecoration: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 600
                  }}
                >
                  Go to Password Reset Page
                </Link>
              </div>
            )}

            <p style={{ textAlign: 'center', marginTop: 12 }}>
              <Link href="/login" style={{ fontSize: '0.9rem', color: 'var(--accent)', textDecoration: 'none' }}>
                Return to Login
              </Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="stack">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                className="input" 
                type="email" 
                placeholder="tony@starkindustries.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
              {loading ? <span className="spinner" /> : 'Send Reset Link'}
            </button>
            <p style={{ textAlign: 'center', marginTop: 16 }}>
              <Link href="/login" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                Back to Sign In
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
