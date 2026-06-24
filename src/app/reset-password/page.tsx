'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isLinkInvalid = !token || !email;
  const displayError = error || (isLinkInvalid ? 'Invalid or expired password reset link. Please request a new one.' : '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
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
        <p className="auth-title">Choose new password</p>
        <p className="auth-subtitle">Set a secure password for your account</p>

        {displayError && (
          <div className="card" style={{ marginBottom: 20, color: 'var(--red)', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>⚠️</span>
            <span>{displayError}</span>
          </div>
        )}

        {success ? (
          <div className="stack text-center" style={{ gap: 16 }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: 16, borderRadius: 'var(--radius-md)' }}>
              <p style={{ color: 'var(--green)', fontSize: '0.9rem', marginBottom: 0 }}>
                ✓ Password successfully reset! Redirecting to login page…
              </p>
            </div>
            <Link 
              href="/login"
              style={{ 
                display: 'block',
                background: 'var(--accent)', 
                color: 'white', 
                padding: '10px 16px', 
                borderRadius: 'var(--radius-sm)', 
                textDecoration: 'none',
                fontWeight: 600
              }}
            >
              Sign In Now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="stack">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                className="input" 
                type="text" 
                value={email} 
                disabled 
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input 
                className="input" 
                type="password" 
                placeholder="Min. 6 characters" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                disabled={!token || !email}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input 
                className="input" 
                type="password" 
                placeholder="••••••••" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
                disabled={!token || !email}
              />
            </div>

            <button 
              className="btn btn-primary btn-lg" 
              type="submit" 
              disabled={loading || !token || !email} 
              style={{ width: '100%', marginTop: 8 }}
            >
              {loading ? <span className="spinner" /> : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="auth-page">
        <div className="auth-card card card-glass flex-center" style={{ padding: 80 }}>
          <span className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
