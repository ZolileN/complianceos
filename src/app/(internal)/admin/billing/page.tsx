'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  MoreHorizontal,
  RefreshCw,
  Search,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/contexts/ToastContext';
import { TENANT_PLANS } from '@/lib/plans';

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'outline';

type BillingRow = {
  tenantId: string;
  name: string;
  slug: string;
  isActive: boolean;
  isPlatformTenant: boolean;
  plan: string;
  planName: string;
  priceZarCents: number | null;
  status: string;
  inGrace: boolean;
  trialEndingSoon: boolean;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  provider: string;
  hasSubscription: boolean;
};

type BillingSummary = {
  mrrCents: number;
  mrrFormatted: string;
  counts: {
    trialing: number;
    active: number;
    past_due: number;
    canceled: number;
    incomplete: number;
    other: number;
  };
  inGrace: number;
  trialsEndingSoon: number;
  gracePeriodDays: number;
  totalTenants: number;
};

type StatusFilter =
  | 'all'
  | 'trialing'
  | 'active'
  | 'in_grace'
  | 'past_due'
  | 'canceled';

function statusBadge(row: BillingRow): { label: string; variant: BadgeVariant } {
  if (row.inGrace) return { label: 'In grace', variant: 'warning' };
  switch (row.status) {
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
      return { label: row.status, variant: 'outline' };
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

async function patchSubscription(
  tenantId: string,
  body: Record<string, unknown>
) {
  const res = await fetch(`/api/admin/tenants/${tenantId}/subscription`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Action failed');
  return data;
}

export default function AdminBillingPage() {
  const { toast } = useToast();
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [rows, setRows] = useState<BillingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [activatePlan, setActivatePlan] = useState<Record<string, string>>({});

  const loadBilling = useCallback(async (showErrors = true) => {
    try {
      const res = await fetch('/api/admin/billing');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load billing');
      }
      setSummary(data.summary);
      setRows(data.rows || []);
    } catch (err: unknown) {
      if (showErrors) {
        toast(
          err instanceof Error ? err.message : 'Failed to load billing',
          'error'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/billing');
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load billing');
        }
        setSummary(data.summary);
        setRows(data.rows || []);
      } catch (err: unknown) {
        if (!cancelled) {
          toast(
            err instanceof Error ? err.message : 'Failed to load billing',
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
  }, [toast]);

  useEffect(() => {
    if (!openMenuId) return;
    const onClick = () => setOpenMenuId(null);
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [openMenuId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (r.isPlatformTenant) return false;
      if (statusFilter === 'in_grace' && !r.inGrace) return false;
      if (
        statusFilter !== 'all' &&
        statusFilter !== 'in_grace' &&
        r.status !== statusFilter
      ) {
        return false;
      }
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        r.plan.toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  const runAction = async (
    tenantId: string,
    body: Record<string, unknown>,
    successMsg: string
  ) => {
    setActionLoading(tenantId);
    setOpenMenuId(null);
    try {
      await patchSubscription(tenantId, body);
      toast(successMsg, 'success');
      await loadBilling(false);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const filters: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'trialing', label: 'Trialing' },
    { id: 'active', label: 'Active' },
    { id: 'in_grace', label: 'In grace' },
    { id: 'past_due', label: 'Past due' },
    { id: 'canceled', label: 'Canceled' },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
            <CreditCard className="size-3.5" />
            Billing
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[var(--text-primary)]">
            Subscriptions
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
            Fleet-wide subscription status, trials, and month-to-month grace
            windows. Manage activations and overrides per tenant.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            loadBilling();
          }}
          disabled={loading}
        >
          <RefreshCw className={`mr-1.5 size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>MRR (active)</CardDescription>
            <CardTitle className="text-2xl">
              {summary?.mrrFormatted ?? '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-[var(--text-muted)]">
            Excludes platform-admin tenants &amp; grace-period lapses
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl">
              {summary?.counts.active ?? '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-[var(--text-muted)]">
            Paid month-to-month
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Trialing</CardDescription>
            <CardTitle className="text-2xl">
              {summary?.counts.trialing ?? '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-[var(--text-muted)]">
            {summary?.trialsEndingSoon ?? 0} ending within 7 days
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Past due / In grace</CardDescription>
            <CardTitle className="text-2xl">
              {(summary?.counts.past_due ?? 0) + (summary?.inGrace ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-[var(--text-muted)]">
            {summary?.inGrace ?? 0} in {summary?.gracePeriodDays ?? 7}-day grace ·{' '}
            {summary?.counts.past_due ?? 0} past due
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Tenant subscriptions</CardTitle>
            <CardDescription>
              {filtered.length} shown
              {summary ? ` of ${summary.totalTenants} billable` : ''}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                className="input h-9 w-full pl-8 text-sm sm:w-56"
                placeholder="Search tenant…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <Button
                key={f.id}
                size="sm"
                variant={statusFilter === f.id ? 'primary' : 'outline'}
                onClick={() => setStatusFilter(f.id)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-[var(--text-muted)]">
              <span className="spinner mr-3" style={{ width: 20, height: 20 }} />
              Loading subscriptions…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--text-muted)]">
              No subscriptions match this filter.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[var(--border-primary)]">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[var(--bg-secondary)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Tenant</th>
                    <th className="px-4 py-3 font-semibold">Plan</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Trial / Period end</th>
                    <th className="px-4 py-3 font-semibold">Provider</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const badge = statusBadge(row);
                    const busy = actionLoading === row.tenantId;
                    return (
                      <tr
                        key={row.tenantId}
                        className="border-t border-[var(--border-primary)]"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/tenants/${row.tenantId}`}
                            className="font-medium text-teal-700 hover:underline"
                          >
                            {row.name}
                          </Link>
                          <div className="font-mono text-xs text-[var(--text-muted)]">
                            {row.slug}
                          </div>
                        </td>
                        <td className="px-4 py-3 capitalize">{row.planName}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                            {row.trialEndingSoon && (
                              <Badge variant="warning">Trial ending</Badge>
                            )}
                            {row.cancelAtPeriodEnd && (
                              <Badge variant="outline">Canceling</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">
                          {row.status === 'trialing'
                            ? formatDate(row.trialEndsAt)
                            : formatDate(row.currentPeriodEnd)}
                        </td>
                        <td className="px-4 py-3 capitalize text-[var(--text-secondary)]">
                          {row.provider}
                        </td>
                        <td className="relative px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(
                                openMenuId === row.tenantId ? null : row.tenantId
                              );
                            }}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                          {openMenuId === row.tenantId && (
                            <div
                              className="absolute right-4 z-20 mt-1 w-56 rounded-lg border border-[var(--border-primary)] bg-[var(--card)] p-2 shadow-lg"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="mb-2 space-y-1.5 border-b border-[var(--border-primary)] pb-2">
                                <label className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                  Activate as
                                </label>
                                <select
                                  className="select h-8 w-full text-xs"
                                  value={
                                    activatePlan[row.tenantId] || row.plan
                                  }
                                  onChange={(e) =>
                                    setActivatePlan((prev) => ({
                                      ...prev,
                                      [row.tenantId]: e.target.value,
                                    }))
                                  }
                                >
                                  {TENANT_PLANS.map((p) => (
                                    <option key={p} value={p}>
                                      {p.charAt(0).toUpperCase() + p.slice(1)}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-[var(--bg-secondary)]"
                                  onClick={() =>
                                    runAction(
                                      row.tenantId,
                                      {
                                        action: 'activate',
                                        plan:
                                          activatePlan[row.tenantId] || row.plan,
                                      },
                                      'Subscription activated'
                                    )
                                  }
                                >
                                  Activate (record payment)
                                </button>
                              </div>
                              <button
                                type="button"
                                className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-[var(--bg-secondary)]"
                                onClick={() =>
                                  runAction(
                                    row.tenantId,
                                    { action: 'start_trial', plan: 'starter' },
                                    'Trial started'
                                  )
                                }
                              >
                                Start trial
                              </button>
                              <button
                                type="button"
                                className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-[var(--bg-secondary)]"
                                onClick={() =>
                                  runAction(
                                    row.tenantId,
                                    { action: 'past_due' },
                                    'Marked past due'
                                  )
                                }
                              >
                                Mark past due
                              </button>
                              <button
                                type="button"
                                className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-[var(--bg-secondary)]"
                                onClick={() => {
                                  if (
                                    !confirm(
                                      `Cancel ${row.name} at period end?`
                                    )
                                  )
                                    return;
                                  runAction(
                                    row.tenantId,
                                    { action: 'cancel', immediately: false },
                                    'Cancellation scheduled'
                                  );
                                }}
                              >
                                Cancel at period end
                              </button>
                              <button
                                type="button"
                                className="w-full rounded px-2 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => {
                                  if (
                                    !confirm(
                                      `Cancel ${row.name} immediately? This is irreversible from the billing UI.`
                                    )
                                  )
                                    return;
                                  runAction(
                                    row.tenantId,
                                    { action: 'cancel', immediately: true },
                                    'Subscription canceled'
                                  );
                                }}
                              >
                                Cancel immediately
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
