'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { useTheme } from '@/hooks/useTheme';

export default function LoginPage() {
  const { theme, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();
      const user = session?.user;

      if ((['praxisone', 'mlk-computer-consulting'].includes(user?.tenantSlug as string) || ['@praxisone.com', '@mlkcomputer.com'].some(d => user?.email?.endsWith(d)))) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`auth-page precision-ops ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="absolute right-4 top-4 z-10">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>
      <div className="auth-card card card-glass animate-in">
        <div className="auth-logo" style={{ justifyContent: 'center', marginBottom: 12 }}>
          <Logo size={42} showText={true} tone={theme === 'dark' ? 'dark' : 'light'} />
        </div>
        <p className="auth-title">Welcome back</p>
        <p className="auth-subtitle">Sign in to your compliance workspace</p>

        {error && (
          <div className="animate-in" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12, 
            background: 'rgba(239, 68, 68, 0.08)', 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(239, 68, 68, 0.4)', 
            boxShadow: '0 4px 20px rgba(239, 68, 68, 0.15), inset 0 0 10px rgba(239, 68, 68, 0.05)',
            borderRadius: '12px', 
            padding: '12px 16px', 
            marginBottom: 24, 
            color: '#F87171', 
            fontSize: '0.875rem',
            fontWeight: 600
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(239, 68, 68, 0.2)',
              borderRadius: '50%',
              width: 28,
              height: 28,
              flexShrink: 0
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </div>
            <span style={{ letterSpacing: '0.3px' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="stack" suppressHydrationWarning>
          <div className="form-group" suppressHydrationWarning>
            <label className="form-label">Email</label>
            <input className="input" type="email" placeholder="tony@starkindustries.com" value={email} onChange={(e) => setEmail(e.target.value)} suppressHydrationWarning required />
          </div>
          <div className="form-group">
            <div className="flex-between">
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              <Link href="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none' }}>
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              suppressHydrationWarning
              required
            />
          </div>
          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
            {loading ? <span className="spinner" /> : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Don&apos;t have an account? <Link href="/signup">Create one</Link>
        </p>
      </div>
    </div>
  );
}
