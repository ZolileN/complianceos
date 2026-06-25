'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(!token || !email ? 'Invalid invite link. Missing token or email parameter.' : '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !email) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept invite');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 32 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>Accept Invitation</h1>
        
        {success ? (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--green)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
              Your account is verified and your password is set!
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Redirecting to login...</p>
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24, textAlign: 'center' }}>
              Welcome! Please set a secure password for your account <strong>{email}</strong> to continue.
            </p>

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--red)', padding: 12, borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="stack">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input 
                  type="password" 
                  className="input"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input 
                  type="password" 
                  className="input"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading || !token || !email}>
                {loading ? <span className="spinner" /> : 'Set Password & Login'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="flex-center" style={{ minHeight: '100vh', background: 'var(--bg-main)' }}><span className="spinner" /></div>}>
      <AcceptInviteForm />
    </Suspense>
  );
}
