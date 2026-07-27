'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { ArrowLeft, CreditCard, Moon, Sun } from 'lucide-react';

import Logo from '@/components/Logo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

  const planDef = getPlanDefinition(plan);
  const isTrialPlan = plan === 'starter';
  const isPaidPlan = plan === 'growth' || plan === 'professional';

  const [firmName, setFirmName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Payment redirects arrive as full page loads, so initializing from the URL
  // params is sufficient (no setState-in-effect needed).
  const [pendingSignupId, setPendingSignupId] = useState(pendingParam);
  const [paid, setPaid] = useState(
    () => billingParam === 'success' && Boolean(pendingParam)
  );
  const [error, setError] = useState(() => {
    if (billingParam === 'cancelled')
      return 'Payment was cancelled. You can try again when ready.';
    if (billingParam === 'error')
      return 'Payment could not be completed. Please try again.';
    return '';
  });
  const [loading, setLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    if (plan === 'enterprise') {
      router.replace('/#contact-sales');
    }
  }, [plan, router]);

  useEffect(() => {
    if (!pendingParam) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/auth/signup/pending?id=${encodeURIComponent(pendingParam)}`);
        const data = await res.json();
        if (!res.ok || cancelled) return;
        const pending = data.data;
        if (pending?.firmName) setFirmName(pending.firmName);
        if (pending?.fullName) setFullName(pending.fullName);
        if (pending?.email) setEmail(pending.email);
        if (pending?.paid) setPaid(true);
        if (pending?.pendingSignupId) setPendingSignupId(pending.pendingSignupId);
      } catch {
        /* ignore — user can fill manually */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pendingParam]);

  const formValid = useMemo(
    () =>
      firmName.trim() &&
      fullName.trim() &&
      email.trim() &&
      password.length >= 6 &&
      password === confirmPassword,
    [firmName, fullName, email, password, confirmPassword]
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
      if (data.data?.pendingSignupId) {
        setPendingSignupId(data.data.pendingSignupId);
        setPaid(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Payment setup failed');
    } finally {
      setPayLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (isPaidPlan && !paid) {
      setError('Please complete payment before creating your workspace.');
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
          plan: isTrialPlan ? 'starter' : plan,
          pendingSignupId: isPaidPlan ? pendingSignupId : undefined,
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
                : `Subscribe to ${planDef.name} — pay first, then create your account.`}
            </CardDescription>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge variant="info">{planDef.name}</Badge>
              {isTrialPlan && <Badge variant="success">14-day trial</Badge>}
              {isPaidPlan && paid && <Badge variant="success">Payment received</Badge>}
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

            {isPaidPlan && !paid && (
              <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
                  <CreditCard className="size-4" />
                  Step 1 — Pay for your plan
                </div>
                <p className="mb-3 text-xs text-amber-800/80 dark:text-amber-200/80">
                  Complete secure payment before creating your workspace. No card details
                  stored on PraxisOne — you&apos;ll pay via Ozow.
                </p>
                <Button
                  type="button"
                  className="w-full"
                  disabled={!formValid || payLoading}
                  onClick={handlePay}
                >
                  {payLoading
                    ? 'Redirecting…'
                    : `Pay ${formatZarFromCents(planDef.priceZarCents)} / mo`}
                </Button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="stack">
              {isPaidPlan && paid && (
                <p className="mb-2 text-xs font-medium text-teal-700 dark:text-teal-400">
                  Step 2 — Create your workspace
                </p>
              )}
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
                <input
                  className="input"
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                className="mt-2 w-full"
                disabled={
                  loading ||
                  !formValid ||
                  (isPaidPlan && !paid)
                }
              >
                {loading
                  ? 'Creating…'
                  : isTrialPlan
                    ? 'Start free trial'
                    : 'Create workspace'}
              </Button>
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
