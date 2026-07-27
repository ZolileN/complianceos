'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CreditCard } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  formatZarFromCents,
  GRACE_PERIOD_DAYS,
  type TenantPlan,
} from '@/lib/plans';

type Entitlements = {
  plan: TenantPlan;
  planName: string;
  status: string;
  readOnly: boolean;
  aiEnabled: boolean;
  maxUsers: number | null;
  maxClients: number | null;
  messagesPerMonthSoft: number;
  usage: {
    users: number;
    clients: number;
    messagesThisMonth: number;
    documents: number;
  };
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  priceZarCents: number | null;
};

type CatalogPlan = {
  id: TenantPlan;
  name: string;
  priceZarCents: number | null;
  maxUsers: number | null;
  maxClients: number | null;
  aiEnabled: boolean;
  marketingBullets: string[];
  trialDays?: number;
};

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'outline';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function statusBadge(
  entitlements: Entitlements,
  inGrace: boolean
): { label: string; variant: BadgeVariant } {
  if (inGrace) return { label: 'In grace', variant: 'warning' };
  switch (entitlements.status) {
    case 'trialing':
      return { label: 'Trialing', variant: 'info' };
    case 'active':
      return { label: 'Active', variant: 'success' };
    case 'past_due':
      return { label: 'Past due', variant: 'destructive' };
    case 'canceled':
      return { label: 'Canceled', variant: 'outline' };
    case 'incomplete':
      return { label: 'Incomplete', variant: 'warning' };
    default:
      return { label: entitlements.status, variant: 'outline' };
  }
}

function isInGrace(entitlements: Entitlements): boolean {
  if (entitlements.status !== 'active' || !entitlements.currentPeriodEnd) {
    return false;
  }
  const end = new Date(entitlements.currentPeriodEnd).getTime();
  const now = Date.now();
  if (end > now) return false;
  const graceMs = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  return now - end <= graceMs;
}

function UsageBar({
  label,
  current,
  limit,
}: {
  label: string;
  current: number;
  limit: number | null;
}) {
  const pct =
    limit == null || limit <= 0
      ? 0
      : Math.min(100, Math.round((current / limit) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600 dark:text-slate-400">{label}</span>
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {current.toLocaleString()}
          {limit == null ? ' / Unlimited' : ` / ${limit.toLocaleString()}`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded ${pct >= 90 ? 'bg-amber-500' : 'bg-teal-600'}`}
          style={{ width: `${limit == null ? 8 : pct}%` }}
        />
      </div>
    </div>
  );
}

export default function BillingPlanTab({
  onToast,
}: {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}) {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  // Stable "now" so render stays pure (trial-window check tolerance is days).
  const [mountedAtTs] = useState(() => Date.now());
  const [catalog, setCatalog] = useState<CatalogPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/entitlements');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load plan');
      setEntitlements(data.data);
      setCatalog(data.catalog || []);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to load plan', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/entitlements');
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || 'Failed to load plan');
        setEntitlements(data.data);
        setCatalog(data.catalog || []);
      } catch (err) {
        if (!cancelled) {
          onToast(
            err instanceof Error ? err.message : 'Failed to load plan',
            'error'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkout = async (plan: TenantPlan) => {
    setCheckingOut(plan);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      if (data.data?.checkoutUrl) {
        window.location.href = data.data.checkoutUrl;
        return;
      }
      onToast('Plan updated', 'success');
      await load();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Checkout failed', 'error');
    } finally {
      setCheckingOut(null);
    }
  };

  const runSubscriptionAction = async (
    action: 'cancel' | 'resume_cancel',
    successMsg: string
  ) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/billing/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      onToast(successMsg, 'success');
      await load();
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !entitlements) {
    return (
      <div className="flex-center py-16">
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  const inGrace = isInGrace(entitlements);
  const badge = statusBadge(entitlements, inGrace);
  const needsPayment =
    entitlements.readOnly ||
    inGrace ||
    entitlements.status === 'past_due' ||
    entitlements.status === 'incomplete' ||
    (entitlements.status === 'trialing' &&
      !!entitlements.trialEndsAt &&
      new Date(entitlements.trialEndsAt).getTime() <
        mountedAtTs + 3 * 24 * 60 * 60 * 1000);

  return (
    <div className="space-y-6">
      {(entitlements.readOnly || inGrace) && (
        <Card
          className={
            entitlements.readOnly
              ? 'border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20'
              : 'border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20'
          }
        >
          <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle
                className={`mt-0.5 size-5 shrink-0 ${
                  entitlements.readOnly ? 'text-red-600' : 'text-amber-600'
                }`}
              />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {entitlements.readOnly
                    ? 'Workspace is read-only'
                    : `Grace period — ${GRACE_PERIOD_DAYS} days after period end`}
                </p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  {entitlements.readOnly
                    ? 'Pay to restore full access. Creating clients, users, and messages is blocked until then.'
                    : `Your paid period ended on ${formatDate(entitlements.currentPeriodEnd)}. Pay before the grace window closes to avoid read-only mode.`}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              disabled={!!checkingOut}
              onClick={() => checkout(entitlements.plan)}
            >
              {checkingOut === entitlements.plan ? 'Starting…' : 'Pay now'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5" />
            Current plan
          </CardTitle>
          <CardDescription>
            Month-to-month billing with a {GRACE_PERIOD_DAYS}-day grace window after each
            paid period. Limits apply to seats, clients, and AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl font-semibold">{entitlements.planName}</span>
            <Badge variant={badge.variant}>{badge.label}</Badge>
            {entitlements.aiEnabled && <Badge variant="info">AI enabled</Badge>}
            {entitlements.cancelAtPeriodEnd && (
              <Badge variant="warning">
                Cancels {formatDate(entitlements.currentPeriodEnd)}
              </Badge>
            )}
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Price
              </div>
              <div className="mt-0.5 font-medium">
                {formatZarFromCents(entitlements.priceZarCents)}
                {entitlements.priceZarCents != null ? '/mo' : ''}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {entitlements.status === 'trialing' ? 'Trial ends' : 'Period ends'}
              </div>
              <div className="mt-0.5 font-medium">
                {entitlements.status === 'trialing'
                  ? formatDate(entitlements.trialEndsAt)
                  : formatDate(entitlements.currentPeriodEnd)}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Status
              </div>
              <div className="mt-0.5 font-medium capitalize">
                {entitlements.status.replace('_', ' ')}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Billing
              </div>
              <div className="mt-0.5 font-medium">Month to month</div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <UsageBar
              label="Team seats"
              current={entitlements.usage.users}
              limit={entitlements.maxUsers}
            />
            <UsageBar
              label="Clients"
              current={entitlements.usage.clients}
              limit={entitlements.maxClients}
            />
            <UsageBar
              label="WhatsApp messages (this month)"
              current={entitlements.usage.messagesThisMonth}
              limit={entitlements.messagesPerMonthSoft}
            />
            <UsageBar
              label="Documents"
              current={entitlements.usage.documents}
              limit={null}
            />
          </div>

          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
            {needsPayment && !entitlements.readOnly && !inGrace && (
              <Button
                size="sm"
                disabled={!!checkingOut}
                onClick={() => checkout(entitlements.plan)}
              >
                {checkingOut === entitlements.plan ? 'Starting…' : 'Renew / Pay now'}
              </Button>
            )}
            {entitlements.status === 'active' &&
              !entitlements.cancelAtPeriodEnd &&
              !inGrace && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading}
                  onClick={() => {
                    if (
                      !confirm(
                        `Cancel ${entitlements.planName} at the end of the current period (${formatDate(entitlements.currentPeriodEnd)})? You keep access until then.`
                      )
                    ) {
                      return;
                    }
                    runSubscriptionAction(
                      'cancel',
                      'Cancellation scheduled for period end'
                    );
                  }}
                >
                  Cancel at period end
                </Button>
              )}
            {entitlements.cancelAtPeriodEnd &&
              (entitlements.status === 'active' ||
                entitlements.status === 'trialing') && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionLoading}
                  onClick={() =>
                    runSubscriptionAction(
                      'resume_cancel',
                      'Cancellation withdrawn — subscription continues'
                    )
                  }
                >
                  Keep my subscription
                </Button>
              )}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
          Plans
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {catalog.map((plan) => {
            const isCurrent = plan.id === entitlements.plan;
            const ctaLabel = entitlements.readOnly
              ? isCurrent
                ? 'Pay now'
                : 'Switch & pay'
              : isCurrent
                ? 'Current plan'
                : plan.priceZarCents != null &&
                    entitlements.priceZarCents != null &&
                    plan.priceZarCents > entitlements.priceZarCents
                  ? 'Upgrade'
                  : 'Choose plan';

            const bullets = [
              ...plan.marketingBullets,
              ...(plan.aiEnabled &&
              !plan.marketingBullets.some((b) => /ai features/i.test(b))
                ? ['AI features']
                : []),
            ];

            return (
              <Card
                key={plan.id}
                className={`flex h-full flex-col ${
                  isCurrent ? 'border-teal-400 shadow-sm' : ''
                }`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <CardDescription>
                    {formatZarFromCents(plan.priceZarCents)}
                    {plan.priceZarCents != null ? '/mo' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <ul className="flex-1 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                    {bullets.map((b) => (
                      <li key={b}>• {b}</li>
                    ))}
                  </ul>
                  {plan.id === 'enterprise' ? (
                    <Button variant="outline" className="mt-auto w-full" asChild>
                      <a href="mailto:support@mlkcomputer.com">Contact sales</a>
                    </Button>
                  ) : (
                    <Button
                      className="mt-auto w-full"
                      variant={isCurrent && !entitlements.readOnly ? 'outline' : 'default'}
                      disabled={
                        (isCurrent && !entitlements.readOnly && !inGrace) ||
                        checkingOut === plan.id
                      }
                      onClick={() => checkout(plan.id)}
                    >
                      {checkingOut === plan.id ? 'Starting…' : ctaLabel}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
