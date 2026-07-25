'use client';

import React, { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatZarFromCents, type TenantPlan } from '@/lib/plans';

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
};

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
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900">
          {current.toLocaleString()}
          {limit == null ? ' / Unlimited' : ` / ${limit.toLocaleString()}`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-slate-100">
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
  const [catalog, setCatalog] = useState<CatalogPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

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
    load();
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

  if (loading || !entitlements) {
    return (
      <div className="flex-center py-16">
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5" />
            Current plan
          </CardTitle>
          <CardDescription>
            Limits are enforced on seats, clients, and AI. Message caps are soft guidance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl font-semibold">{entitlements.planName}</span>
            <Badge variant={entitlements.readOnly ? 'destructive' : 'success'}>
              {entitlements.status}
            </Badge>
            {entitlements.aiEnabled && <Badge variant="info">AI enabled</Badge>}
            {entitlements.readOnly && (
              <Badge variant="warning">Read-only until payment</Badge>
            )}
          </div>
          <p className="text-sm text-slate-500">
            {formatZarFromCents(entitlements.priceZarCents)}
            {entitlements.priceZarCents != null ? '/mo' : ''}
            {entitlements.trialEndsAt
              ? ` · Trial ends ${new Date(entitlements.trialEndsAt).toLocaleDateString()}`
              : ''}
          </p>
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
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {catalog.map((plan) => {
          const isCurrent = plan.id === entitlements.plan;
          return (
            <Card
              key={plan.id}
              className={isCurrent ? 'border-teal-400 shadow-sm' : undefined}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{plan.name}</CardTitle>
                <CardDescription>
                  {formatZarFromCents(plan.priceZarCents)}
                  {plan.priceZarCents != null ? '/mo' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1 text-sm text-slate-600">
                  {plan.marketingBullets.map((b) => (
                    <li key={b}>• {b}</li>
                  ))}
                  {plan.aiEnabled && <li>• AI features</li>}
                </ul>
                {plan.id === 'enterprise' ? (
                  <Button variant="outline" className="w-full" asChild>
                    <a href="mailto:support@mlkcomputer.com">Contact sales</a>
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={isCurrent ? 'outline' : 'default'}
                    disabled={isCurrent || checkingOut === plan.id}
                    onClick={() => checkout(plan.id)}
                  >
                    {isCurrent
                      ? 'Current plan'
                      : checkingOut === plan.id
                        ? 'Starting…'
                        : 'Choose plan'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
