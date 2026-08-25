'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ArrowLeft, CreditCard, Loader2, Moon, Sun } from 'lucide-react';

import Logo from '@/components/Logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useTheme } from '@/hooks/useTheme';
import {
  formatZarFromCents,
  getPlanDefinition,
  isTenantPlan,
  type TenantPlan,
} from '@/lib/plans';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();

  const planParam = searchParams.get('plan') || 'starter';
  const plan: TenantPlan = isTenantPlan(planParam) ? planParam : 'starter';
  const pendingParam = searchParams.get('pending') || '';
  const billingParam = searchParams.get('billing');
  const reasonParam = searchParams.get('reason');

  const planDef = getPlanDefinition(plan);
  const isTrialPlan = plan === 'starter';
  const isPaidPlan = plan === 'growth' || plan === 'professional';
  const isRecoveringPaidSignup =
    Boolean(pendingParam) &&
    (billingParam === 'success' ||
      (billingParam === 'error' && reasonParam === 'provision_failed'));

  const [firmName, setFirmName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState(() => {
    if (billingParam === 'cancelled')
      return 'Payment was cancelled. You can try again when ready.';
    if (billingParam === 'error' && reasonParam !== 'provision_failed') {
      return 'Payment could not be completed. Please try again.';
    }
    return '';
  });
  const [loading, setLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [provisioning, setProvisioning] = useState(isRecoveringPaidSignup);

  useEffect(() => {
    if (plan === 'enterprise') {
      router.replace('/#contact-sales');
    }
  }, [plan, router]);

  useEffect(() => {
    if (!isRecoveringPaidSignup) return;
    let cancelled = false;

    const finalize = async (attempt = 0) => {
      setProvisioning(true);
      setError('');
      try {
        const res = await fetch('/api/auth/signup/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pendingSignupId: pendingParam }),
        });
        const data = await res.json();
        if (!res.ok) {
          const retryable =
            res.status === 400 &&
            String(data.error || '').includes('Payment required') &&
            attempt < 5;
          if (retryable) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
            if (!cancelled) return finalize(attempt + 1);
            return;
          }
          throw new Error(data.error || 'Could not create your workspace');
        }
        const loginEmail = data.data?.email || '';
        router.replace(
          `/login?registered=1&email=${encodeURIComponent(loginEmail)}`
        );
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Could not create your workspace'
          );
          setProvisioning(false);
        }
      }
    };

    void finalize();
    return () => {
      cancelled = true;
    };
  }, [isRecoveringPaidSignup, pendingParam, router]);

  const formValid = useMemo(
    () =>
      firmName.trim() &&
      fullName.trim() &&
      email.trim() &&
      password.length >= 6 &&
      password === confirmPassword &&
      acceptedTerms,
    [firmName, fullName, email, password, confirmPassword, acceptedTerms]
  );

  const handlePay = async () => {
    setError('');
    if (!formValid) {
      setError('Please complete all fields correctly before payment.');
      return;
    }
    setPayLoading(true);
    try {
      const res = await fetch('/api/auth/signup/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firmName, fullName, email, password, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment setup failed');
      if (data.data?.checkoutUrl) {
        window.location.assign(data.data.checkoutUrl);
        return;
      }
      setPayLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment setup failed');
      setPayLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTrialPlan) return;

    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firmName,
          fullName,
          email,
          password,
          plan: 'starter',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');

      const signInResult = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (signInResult?.error) throw new Error(signInResult.error);

      router.push('/dashboard');
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  if (provisioning) {
    return (
      <div className={`precision-ops min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
        <div className="flex min-h-screen items-center justify-center px-4 py-12">
          <Card className="w-full max-w-[480px]">
            <CardHeader className="text-center">
              <div className="mb-3 flex justify-center">
                <Logo size={40} showText tone={theme === 'dark' ? 'dark' : 'light'} />
              </div>
              <CardTitle>Creating your workspace</CardTitle>
              <CardDescription>
                Payment received. We&apos;re setting up your account — you&apos;ll be
                redirected to sign in shortly.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-6">
              <Loader2 className="size-8 animate-spin text-teal-600" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={`precision-ops min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="absolute left-4 top-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/#pricing">
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>
      </div>
      <div className="absolute right-4 top-4">
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

      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <Card className="w-full max-w-[480px]">
          <CardHeader className="text-center">
            <div className="mb-3 flex justify-center">
              <Logo size={40} showText tone={theme === 'dark' ? 'dark' : 'light'} />
            </div>
            <CardTitle>Create your workspace</CardTitle>
            <CardDescription>
              {isTrialPlan
                ? 'Start your 14-day Starter trial — no credit card required.'
                : `Subscribe to ${planDef.name} — pay securely, then sign in to your workspace.`}
            </CardDescription>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge variant="info">{planDef.name}</Badge>
              {isTrialPlan && <Badge variant="success">14-day trial</Badge>}
              {planDef.priceZarCents != null && (
                <Badge variant="outline">
                  {formatZarFromCents(planDef.priceZarCents)}/mo
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </div>
            )}

            {isPaidPlan && (
              <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
                  <CreditCard className="size-4" />
                  Secure payment checkout
                </div>
                <p className="mb-3 text-xs text-amber-800/80 dark:text-amber-200/80">
                  Complete payment with Paystack. After payment you&apos;ll be redirected
                  to sign in with the password you choose below.
                </p>
                <Button
                  type="button"
                  className="w-full"
                  disabled={!formValid || payLoading}
                  onClick={handlePay}
                >
                  {payLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Redirecting to payment…
                    </>
                  ) : (
                    `Pay ${formatZarFromCents(planDef.priceZarCents)} / mo`
                  )}
                </Button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="stack">
              <div className="form-group">
                <label className="form-label">Firm name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Your firm name"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Your full name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="you@firm.co.za"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <PasswordInput
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm password</label>
                <PasswordInput
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  className="mt-1 size-4 rounded border-[var(--border-primary)]"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  required
                />
                <span>
                  I agree to the{' '}
                  <Link
                    href="/terms"
                    target="_blank"
                    className="text-teal-700 hover:underline dark:text-teal-400"
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="text-teal-700 hover:underline dark:text-teal-400"
                  >
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {isTrialPlan && (
                <Button
                  type="submit"
                  variant="primary"
                  className="mt-2 w-full"
                  disabled={loading || !formValid}
                >
                  {loading ? 'Creating…' : 'Start free trial'}
                </Button>
              )}
            </form>

            <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
              Already have an account?{' '}
              <Link href="/login" className="text-teal-700 hover:underline dark:text-teal-400">
                Sign in
              </Link>
            </p>
            {plan !== 'starter' && (
              <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
                <Link href="/signup?plan=starter">Start with a free Starter trial instead</Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-center min-h-screen">
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
