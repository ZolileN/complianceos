'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  Copy,
  CreditCard,
  MessageSquare,
  ScrollText,
  Shield,
  Trash2,
  UsersRound,
  X,
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

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const TENANT_PLANS = ['starter', 'growth', 'professional', 'enterprise'] as const;
const USER_ROLES = ['administrator', 'operations_manager', 'consultant', 'client'] as const;

interface ClientItem {
  id: string;
  companyName: string;
  registrationNumber: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
}

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  settings?: string | null;
  whatsappSetupComplete: boolean;
  whatsappPhoneNumber: string | null;
  email: string | null;
  contactNumber: string | null;
  address: string | null;
  website: string | null;
  createdAt: string;
  users: UserItem[];
  clients: ClientItem[];
  _count?: {
    conversations: number;
    documents: number;
    tasks: number;
    complianceItems?: number;
  };
}

interface InspectorEntity {
  type: 'User' | 'Client';
  id: string;
  name: string;
  details: Record<string, string | null>;
}

interface TenantLog {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  payload?: Record<string, unknown>;
}

interface BillingSnapshot {
  tenantId: string;
  plan: string;
  planName: string;
  priceZarCents: number | null;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  provider: string;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  limitsOverride: string;
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'outline';
type TabType = 'members' | 'clients' | 'logs';

function roleVariant(role: string): BadgeVariant {
  switch (role) {
    case 'administrator':
      return 'destructive';
    case 'operations_manager':
      return 'info';
    case 'consultant':
      return 'default';
    default:
      return 'outline';
  }
}

function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'active':
    case 'compliant':
      return 'success';
    case 'onboarding':
      return 'info';
    case 'action_required':
      return 'warning';
    default:
      return 'destructive';
  }
}

function logTypeVariant(type: string): BadgeVariant {
  switch (type) {
    case 'webhook':
      return 'info';
    case 'system':
      return 'warning';
    case 'error':
      return 'destructive';
    default:
      return 'outline';
  }
}

function billingStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'active':
      return 'success';
    case 'trialing':
      return 'info';
    case 'past_due':
    case 'canceled':
      return 'destructive';
    case 'incomplete':
      return 'warning';
    default:
      return 'outline';
  }
}

function parseLimitsOverride(raw: string | null | undefined): {
  maxUsers: string;
  maxClients: string;
  aiEnabled: '' | 'true' | 'false';
} {
  try {
    const o = JSON.parse(raw || '{}') as Record<string, unknown>;
    return {
      maxUsers:
        o.maxUsers === null
          ? 'null'
          : typeof o.maxUsers === 'number'
            ? String(o.maxUsers)
            : '',
      maxClients:
        o.maxClients === null
          ? 'null'
          : typeof o.maxClients === 'number'
            ? String(o.maxClients)
            : '',
      aiEnabled:
        typeof o.aiEnabled === 'boolean'
          ? o.aiEnabled
            ? 'true'
            : 'false'
          : '',
    };
  } catch {
    return { maxUsers: '', maxClients: '', aiEnabled: '' };
  }
}

export default function TenantProfile() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [error, setError] = useState<string | null>(null);

  // Danger Zone State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationSlug, setDeleteConfirmationSlug] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Redis Logs State
  const [logs, setLogs] = useState<TenantLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // Poll Redis Logs when tab is active
  useEffect(() => {
    if (activeTab !== 'logs') return;

    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/admin/tenants/${id}/logs`);
        const data = await res.json();
        if (res.ok && data.success) {
          setLogs(data.data);
        }
      } catch (err) {
        console.error('Failed to retrieve logs:', err);
      } finally {
        setLogsLoading(false);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [activeTab, id]);

  // Inspector Modal State
  const [inspectionEntity, setInspectionEntity] = useState<InspectorEntity | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // Plan & settings editor
  const [editPlan, setEditPlan] = useState('');
  const [planSaving, setPlanSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Subscription / billing
  const [billing, setBilling] = useState<BillingSnapshot | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingActionLoading, setBillingActionLoading] = useState(false);
  const [overrideForm, setOverrideForm] = useState({
    maxUsers: '',
    maxClients: '',
    aiEnabled: '' as '' | 'true' | 'false',
  });
  const [overrideSaving, setOverrideSaving] = useState(false);

  // Member action loading
  const [userActionLoading, setUserActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBilling = async () => {
    try {
      const res = await fetch(`/api/admin/tenants/${id}/subscription`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load subscription');
      setBilling(data.data);
      setOverrideForm(parseLimitsOverride(data.data.limitsOverride));
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setBillingLoading(false);
    }
  };

  const fetchTenantDetail = async () => {
    try {
      const res = await fetch(`/api/admin/tenants/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to retrieve tenant details');
      setTenant(data.data);
      setEditPlan(data.data.plan);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Defer a tick so no state is set synchronously in the effect.
    const t = setTimeout(() => {
      fetchTenantDetail();
      fetchBilling();
    }, 0);
    return () => clearTimeout(t);
  }, [id]);

  const parseSettings = (settings?: string | null): Record<string, unknown> => {
    if (!settings) return {};
    try {
      return JSON.parse(settings) as Record<string, unknown>;
    } catch {
      return {};
    }
  };

  const whatsappEnabled = tenant
    ? parseSettings(tenant.settings).whatsapp_enabled !== false
    : true;

  const handleSavePlan = async () => {
    if (!tenant || editPlan === tenant.plan) return;
    setPlanSaving(true);
    try {
      const res = await fetch(`/api/admin/tenants/${id}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_plan', plan: editPlan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update plan');
      showToast('Plan updated successfully');
      await Promise.all([fetchTenantDetail(), fetchBilling()]);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update plan', 'error');
    } finally {
      setPlanSaving(false);
    }
  };

  const handleToggleWhatsappSetting = async () => {
    setSettingsSaving(true);
    try {
      const res = await fetch(`/api/admin/tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { whatsapp_enabled: !whatsappEnabled } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');
      showToast(`WhatsApp feature ${!whatsappEnabled ? 'enabled' : 'disabled'}`);
      await fetchTenantDetail();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update settings', 'error');
    } finally {
      setSettingsSaving(false);
    }
  };

  const runBillingAction = async (
    body: Record<string, unknown>,
    successMsg: string
  ) => {
    setBillingActionLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${id}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      showToast(successMsg);
      await Promise.all([fetchTenantDetail(), fetchBilling()]);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error');
    } finally {
      setBillingActionLoading(false);
    }
  };

  const handleSaveOverride = async () => {
    setOverrideSaving(true);
    try {
      const override: Record<string, unknown> = {};
      if (overrideForm.maxUsers === 'null') override.maxUsers = null;
      else if (overrideForm.maxUsers.trim() !== '') {
        const n = Number(overrideForm.maxUsers);
        if (!Number.isFinite(n)) throw new Error('maxUsers must be a number or null');
        override.maxUsers = n;
      }
      if (overrideForm.maxClients === 'null') override.maxClients = null;
      else if (overrideForm.maxClients.trim() !== '') {
        const n = Number(overrideForm.maxClients);
        if (!Number.isFinite(n)) throw new Error('maxClients must be a number or null');
        override.maxClients = n;
      }
      if (overrideForm.aiEnabled === 'true') override.aiEnabled = true;
      if (overrideForm.aiEnabled === 'false') override.aiEnabled = false;

      const res = await fetch(`/api/admin/tenants/${id}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'override', override }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save override');
      showToast('Limits override saved');
      await fetchBilling();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to save override', 'error');
    } finally {
      setOverrideSaving(false);
    }
  };

  const handleUserUpdate = async (
    userId: string,
    payload: { isActive?: boolean; role?: string; forceLogout?: boolean }
  ) => {
    const actionKey = `${userId}-${Object.keys(payload).join('-')}`;
    setUserActionLoading(actionKey);
    try {
      const res = await fetch(`/api/admin/tenants/${id}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      showToast('User updated successfully');
      await fetchTenantDetail();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to update user', 'error');
    } finally {
      setUserActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-sm text-[var(--text-secondary)]">
          <span className="spinner size-9" />
          <span>Retrieving workspace metadata...</span>
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="mx-auto max-w-[1500px] space-y-6">
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="size-4" />
              Error Loading Tenant
            </CardTitle>
            <CardDescription>{error || 'Tenant not found.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="link" className="h-auto px-0">
              <Link href="/admin">
                <ArrowLeft />
                Back to Fleet Overview
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'members',
      label: `Firm Members (${tenant.users.length})`,
      icon: <UsersRound className="size-3.5" />,
    },
    {
      id: 'clients',
      label: `Registered Clients (${tenant.clients.length})`,
      icon: <Building2 className="size-3.5" />,
    },
    {
      id: 'logs',
      label: 'Live System Logs',
      icon: <ScrollText className="size-3.5" />,
    },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[9999] rounded-lg border px-5 py-3 text-sm font-semibold shadow-lg ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Top Header Navigation */}
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon" className="mt-1 shrink-0">
            <Link href="/admin" aria-label="Back to Fleet Overview">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
              <Building2 className="size-3.5" />
              Tenant
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[var(--text-primary)]">
                {tenant.name}
              </h1>
              <Badge variant={tenant.isActive ? 'success' : 'destructive'}>
                {tenant.isActive ? 'Active' : 'Suspended'}
              </Badge>
              <Badge variant="info" className="uppercase">
                Tier: {tenant.plan}
              </Badge>
            </div>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
              System-level metadata for workspace firm{' '}
              <code className="rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 text-xs">
                /onboard/{tenant.slug}
              </code>
              .
            </p>
          </div>
        </div>

        <Card className="w-full shrink-0 lg:w-auto lg:min-w-[280px]">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text-secondary)]">
              Plan &amp; Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <select
                value={editPlan}
                onChange={(e) => setEditPlan(e.target.value)}
                className="select h-9 flex-1 text-sm"
              >
                {TENANT_PLANS.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={handleSavePlan}
                disabled={planSaving || editPlan === tenant.plan}
              >
                {planSaving ? '...' : 'Save'}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-[var(--text-secondary)]">WhatsApp enabled</span>
              <Button
                variant={whatsappEnabled ? 'outline' : 'primary'}
                size="sm"
                onClick={handleToggleWhatsappSetting}
                disabled={settingsSaving}
              >
                {settingsSaving ? '...' : whatsappEnabled ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* POPIA Privacy Shield Alert Banner */}
      <Card className="border-blue-200 bg-blue-50/40 dark:border-blue-900/40 dark:bg-blue-950/20">
        <CardContent className="flex items-start gap-4 pt-5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
            <Shield className="size-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">
              POPIA Privacy Shield Enabled
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
              In compliance with the{' '}
              <strong>Protection of Personal Information Act (POPIA)</strong>, platform
              administration access is restricted to tenant-level configuration and high-level
              directory directories. Direct access to client document vaults, secure message
              histories, tax identification items, and client workflows remains locked to the
              tenant workspace.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Subscription / Billing */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="size-4 text-teal-700" />
              Subscription
            </CardTitle>
            <CardDescription>
              Status, billing period, and limits override for this tenant.
            </CardDescription>
          </div>
          {billing && (
            <Badge variant={billingStatusVariant(billing.status)} className="capitalize">
              {billing.status.replace('_', ' ')}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          {billingLoading ? (
            <p className="text-sm text-[var(--text-muted)]">Loading subscription…</p>
          ) : !billing ? (
            <p className="text-sm text-[var(--text-muted)]">
              No subscription snapshot available.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Plan', billing.planName],
                  [
                    'Trial ends',
                    billing.trialEndsAt
                      ? new Date(billing.trialEndsAt).toLocaleDateString('en-GB')
                      : '—',
                  ],
                  [
                    'Period ends',
                    billing.currentPeriodEnd
                      ? new Date(billing.currentPeriodEnd).toLocaleDateString('en-GB')
                      : '—',
                  ],
                  ['Provider', billing.provider],
                ].map(([label, val]) => (
                  <div key={label as string}>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      {label}
                    </div>
                    <div className="mt-0.5 text-sm font-medium capitalize text-[var(--text-primary)]">
                      {val}
                    </div>
                  </div>
                ))}
              </div>

              {(billing.providerCustomerId || billing.providerSubscriptionId) && (
                <div className="grid gap-2 rounded-lg bg-[var(--bg-secondary)] p-3 font-mono text-xs text-[var(--text-secondary)] sm:grid-cols-2">
                  <div>
                    <span className="text-[var(--text-muted)]">Customer: </span>
                    {billing.providerCustomerId || '—'}
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Subscription: </span>
                    {billing.providerSubscriptionId || '—'}
                  </div>
                </div>
              )}

              {billing.cancelAtPeriodEnd && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Cancellation scheduled at period end.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={billingActionLoading}
                  onClick={() =>
                    runBillingAction(
                      { action: 'activate', plan: billing.plan },
                      'Subscription activated'
                    )
                  }
                >
                  Activate (payment)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={billingActionLoading}
                  onClick={() =>
                    runBillingAction(
                      { action: 'start_trial', plan: 'starter' },
                      'Trial started'
                    )
                  }
                >
                  Start trial
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={billingActionLoading}
                  onClick={() =>
                    runBillingAction({ action: 'past_due' }, 'Marked past due')
                  }
                >
                  Mark past due
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={billingActionLoading}
                  onClick={() => {
                    if (!confirm('Cancel at period end?')) return;
                    runBillingAction(
                      { action: 'cancel', immediately: false },
                      'Cancellation scheduled'
                    );
                  }}
                >
                  Cancel at period end
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={billingActionLoading}
                  onClick={() => {
                    if (!confirm('Cancel immediately?')) return;
                    runBillingAction(
                      { action: 'cancel', immediately: true },
                      'Subscription canceled'
                    );
                  }}
                >
                  Cancel now
                </Button>
              </div>

              <div className="border-t border-[var(--border-primary)] pt-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text-secondary)]">
                  Limits override
                </h4>
                <p className="mb-3 text-xs text-[var(--text-muted)]">
                  Leave blank to use plan defaults. Use <code>null</code> for unlimited.
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs text-[var(--text-secondary)]">
                      maxUsers
                    </label>
                    <input
                      className="input h-9 w-full text-sm"
                      placeholder="e.g. 5 or null"
                      value={overrideForm.maxUsers}
                      onChange={(e) =>
                        setOverrideForm((f) => ({ ...f, maxUsers: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[var(--text-secondary)]">
                      maxClients
                    </label>
                    <input
                      className="input h-9 w-full text-sm"
                      placeholder="e.g. 200 or null"
                      value={overrideForm.maxClients}
                      onChange={(e) =>
                        setOverrideForm((f) => ({ ...f, maxClients: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-[var(--text-secondary)]">
                      aiEnabled
                    </label>
                    <select
                      className="select h-9 w-full text-sm"
                      value={overrideForm.aiEnabled}
                      onChange={(e) =>
                        setOverrideForm((f) => ({
                          ...f,
                          aiEnabled: e.target.value as '' | 'true' | 'false',
                        }))
                      }
                    >
                      <option value="">Plan default</option>
                      <option value="true">Force on</option>
                      <option value="false">Force off</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveOverride}
                    disabled={overrideSaving}
                  >
                    {overrideSaving ? 'Saving…' : 'Save override'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={overrideSaving}
                    onClick={() =>
                      runBillingAction(
                        { action: 'override', override: {} },
                        'Override cleared'
                      ).then(() =>
                        setOverrideForm({ maxUsers: '', maxClients: '', aiEnabled: '' })
                      )
                    }
                  >
                    Clear override
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Tenant Metadata Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text-secondary)]">
              Registration Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ['Workspace URL Slug', tenant.slug, true],
              ['Creation Date', new Date(tenant.createdAt).toLocaleDateString('en-GB'), false],
              ['Internal ID Reference', tenant.id, true],
            ].map(([label, val, mono]) => (
              <div key={label as string} className="flex justify-between gap-4 text-sm">
                <span className="text-[var(--text-secondary)]">{label}</span>
                <span
                  className={`text-right font-medium text-[var(--text-primary)] ${
                    mono ? 'font-mono text-xs' : ''
                  }`}
                >
                  {val}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text-secondary)]">
              <MessageSquare className="size-3.5" />
              WhatsApp (Twilio)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-[var(--text-secondary)]">WhatsApp Linkage:</span>
              <Badge variant={tenant.whatsappSetupComplete ? 'success' : 'outline'}>
                {tenant.whatsappSetupComplete ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>
            {tenant.whatsappPhoneNumber && (
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-[var(--text-secondary)]">WhatsApp Phone Number:</span>
                <span className="font-mono font-medium text-[var(--text-primary)]">
                  {tenant.whatsappPhoneNumber}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-[var(--text-secondary)]">System Users Active:</span>
              <span className="font-semibold text-[var(--text-primary)]">{tenant.users.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text-secondary)]">
              Firm Directory Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ['Business Email', tenant.email || 'N/A'],
              ['Contact Number', tenant.contactNumber || 'N/A'],
              ['Active Client Count', String(tenant.clients.length)],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between gap-4 text-sm">
                <span className="text-[var(--text-secondary)]">{label}:</span>
                <span className="text-right font-medium text-[var(--text-primary)]">{val}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {tenant._count && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text-secondary)]">
                Aggregate Counts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                ['Conversations', tenant._count.conversations],
                ['Documents', tenant._count.documents],
                ['Tasks', tenant._count.tasks],
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between gap-4 text-sm">
                  <span className="text-[var(--text-secondary)]">{label}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{val}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Directory Selector tabs */}
      <div className="flex flex-wrap gap-1 border-b border-[var(--border-primary)] pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              activeTab === t.id
                ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Active Tab View */}
      {activeTab === 'members' ? (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/80">
                  {['Name', 'Email Address', 'Role', 'Status', 'Joined Date', 'Actions'].map(
                    (label) => (
                      <th
                        key={label}
                        className={`px-4 py-3 text-xs font-semibold tracking-wide text-[var(--text-secondary)] uppercase ${
                          label === 'Actions' ? 'text-right' : ''
                        }`}
                      >
                        {label}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {tenant.users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-[var(--text-secondary)] italic"
                    >
                      No workspace members registered.
                    </td>
                  </tr>
                ) : (
                  tenant.users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-[var(--border-subtle)] last:border-0"
                    >
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() =>
                            setInspectionEntity({
                              type: 'User',
                              id: user.id,
                              name: user.name || 'Unnamed Member',
                              details: {
                                'Email Address': user.email,
                                'System Permission Role': user.role
                                  .replace('_', ' ')
                                  .toUpperCase(),
                                Status: user.isActive ? 'Active' : 'Disabled',
                                'Joined Date': new Date(user.createdAt).toLocaleDateString(
                                  'en-GB'
                                ),
                              },
                            })
                          }
                          className="text-sm font-semibold text-teal-700 hover:underline dark:text-teal-400"
                        >
                          {user.name || 'Unnamed'}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-[var(--text-secondary)]">
                        {user.email}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={roleVariant(user.role)} className="capitalize">
                          {user.role.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={user.isActive ? 'success' : 'destructive'}>
                          {user.isActive ? 'Active' : 'Disabled'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-[var(--text-secondary)]">
                        {new Date(user.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <Button
                            variant={user.isActive ? 'outline' : 'primary'}
                            size="sm"
                            disabled={userActionLoading !== null}
                            onClick={() =>
                              handleUserUpdate(user.id, { isActive: !user.isActive })
                            }
                          >
                            {userActionLoading === `${user.id}-isActive`
                              ? '...'
                              : user.isActive
                                ? 'Disable'
                                : 'Enable'}
                          </Button>
                          <select
                            value={user.role}
                            onChange={(e) =>
                              handleUserUpdate(user.id, { role: e.target.value })
                            }
                            disabled={userActionLoading !== null}
                            className="select h-8 max-w-[140px] px-2 text-xs"
                          >
                            {USER_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r.replace('_', ' ')}
                              </option>
                            ))}
                          </select>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={userActionLoading !== null}
                            onClick={() => {
                              if (!confirm(`Force logout ${user.email}?`)) return;
                              handleUserUpdate(user.id, { forceLogout: true });
                            }}
                          >
                            {userActionLoading === `${user.id}-forceLogout`
                              ? '...'
                              : 'Logout'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : activeTab === 'clients' ? (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/80">
                  {[
                    'Client Name',
                    'Registration Number',
                    'Email Address',
                    'Contact Phone',
                    'Status',
                    'Onboarded Date',
                  ].map((label) => (
                    <th
                      key={label}
                      className="px-4 py-3 text-xs font-semibold tracking-wide text-[var(--text-secondary)] uppercase"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tenant.clients.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-[var(--text-secondary)] italic"
                    >
                      No clients registered under this workspace.
                    </td>
                  </tr>
                ) : (
                  tenant.clients.map((client) => (
                    <tr
                      key={client.id}
                      className="border-b border-[var(--border-subtle)] last:border-0"
                    >
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() =>
                            setInspectionEntity({
                              type: 'Client',
                              id: client.id,
                              name: client.companyName,
                              details: {
                                'Registration Number': client.registrationNumber || 'N/A',
                                'Contact Email': client.email || 'N/A',
                                'Contact Phone': client.phone || 'N/A',
                                'Current Status': client.status.toUpperCase(),
                                'Onboarded Date': new Date(client.createdAt).toLocaleDateString(
                                  'en-GB'
                                ),
                              },
                            })
                          }
                          className="text-sm font-semibold text-teal-700 hover:underline dark:text-teal-400"
                        >
                          {client.companyName}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-sm text-[var(--text-secondary)]">
                        {client.registrationNumber || 'N/A'}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-[var(--text-secondary)]">
                        {client.email || 'N/A'}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-[var(--text-secondary)]">
                        {client.phone || 'N/A'}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={statusVariant(client.status)} className="capitalize">
                          {client.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-[var(--text-secondary)]">
                        {new Date(client.createdAt).toLocaleDateString('en-GB')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">
              Redis Live Capped Message &amp; Status Logs
            </CardTitle>
            <Badge variant="success" className="shrink-0">
              ● Auto-polling (5s)
            </Badge>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-[var(--text-secondary)]">
                <span className="spinner size-4" />
                Loading log stream...
              </div>
            ) : logs.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--text-secondary)] italic">
                No telemetry logs found for this tenant. Logs appear as system events occur
                (suspension, WhatsApp disconnects, WhatsApp webhooks).
              </p>
            ) : (
              <div className="max-h-[400px] overflow-y-auto rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3 font-mono text-xs">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] py-1.5 last:border-0"
                  >
                    <span className="shrink-0 text-[var(--text-muted)]">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    <Badge
                      variant={logTypeVariant(log.type)}
                      className="h-5 shrink-0 uppercase"
                    >
                      {log.type}
                    </Badge>
                    <span className="flex-1 break-all text-[var(--text-primary)]">
                      {log.message}
                    </span>
                    {log.payload && (
                      <span className="text-[var(--text-muted)] italic">
                        {JSON.stringify(log.payload)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="border-red-200 bg-red-50/30 dark:border-red-900/40 dark:bg-red-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertTriangle className="size-4" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-red-600/80 dark:text-red-300/70">
            Deleting a tenant will permanently erase all of its data, including users, clients,
            tasks, and audit logs. This action cannot be undone. Master tenants cannot be deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setShowDeleteModal(true)}>
            <Trash2 />
            Delete Tenant
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal max-w-[500px] border-red-300 dark:border-red-900/60">
            <div className="modal-header">
              <h2 className="modal-title flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertTriangle className="size-5" />
                Are you absolutely sure?
              </h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationSlug('');
                  setDeleteError(null);
                }}
              >
                <X />
              </Button>
            </div>
            <div className="modal-body space-y-4">
              <p className="text-sm leading-relaxed text-[var(--text-primary)]">
                This action <strong>cannot</strong> be undone. This will permanently delete the{' '}
                <strong>{tenant.name}</strong> tenant, its users, and all related data.
              </p>
              <p className="text-sm text-[var(--text-primary)]">
                Please type <strong>{tenant.slug}</strong> to confirm.
              </p>
              {deleteError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                  <AlertTriangle className="size-4 shrink-0" />
                  {deleteError}
                </div>
              )}
              <input
                type="text"
                value={deleteConfirmationSlug}
                onChange={(e) => setDeleteConfirmationSlug(e.target.value)}
                className="input w-full"
                autoFocus
              />
              <Button
                variant="destructive"
                className="w-full"
                disabled={deleteConfirmationSlug !== tenant.slug || isDeleting}
                onClick={async () => {
                  if (deleteConfirmationSlug !== tenant.slug) return;
                  setIsDeleting(true);
                  setDeleteError(null);
                  try {
                    const res = await fetch(`/api/admin/tenants/${id}`, { method: 'DELETE' });
                    const data = await res.json();
                    if (data.success) {
                      router.push('/admin');
                    } else {
                      setDeleteError(data.error || 'Failed to delete tenant');
                      setIsDeleting(false);
                    }
                  } catch {
                    setDeleteError('An internal server error occurred during deletion.');
                    setIsDeleting(false);
                  }
                }}
              >
                <Trash2 />
                {isDeleting
                  ? 'Deleting...'
                  : 'I understand the consequences, delete this tenant'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Troubleshooting Inspector Modal */}
      {inspectionEntity && (
        <div className="modal-overlay">
          <div className="modal max-w-[500px]">
            <div className="modal-header">
              <div>
                <Badge variant="info" className="mb-2 uppercase">
                  {inspectionEntity.type} Entity
                </Badge>
                <h2 className="modal-title">{inspectionEntity.name}</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close"
                onClick={() => {
                  setInspectionEntity(null);
                  setCopiedId(false);
                }}
              >
                <X />
              </Button>
            </div>
            <div className="modal-body space-y-5">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3.5 py-3">
                <div className="min-w-0 flex-1 pr-3">
                  <div className="text-[0.65rem] font-semibold tracking-wide text-[var(--text-secondary)] uppercase">
                    Database Primary Key ID
                  </div>
                  <div className="mt-1 break-all font-mono text-sm text-[var(--text-primary)]">
                    {inspectionEntity.id}
                  </div>
                </div>
                <Button
                  variant={copiedId ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(inspectionEntity.id);
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                  }}
                >
                  {copiedId ? <Check /> : <Copy />}
                  {copiedId ? 'Copied' : 'Copy ID'}
                </Button>
              </div>

              <div className="flex flex-col gap-3">
                {Object.entries(inspectionEntity.details).map(([label, val]) => (
                  <div
                    key={label}
                    className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-2 text-sm last:border-0"
                  >
                    <span className="text-[var(--text-secondary)]">{label}:</span>
                    <span className="text-right font-medium text-[var(--text-primary)]">
                      {val}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                {inspectionEntity.type === 'User' ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      if (
                        !confirm(
                          "Are you sure you want to force reset this user's password?"
                        )
                      )
                        return;
                      try {
                        const res = await fetch(
                          `/api/admin/users/${inspectionEntity.id}/reset-password`,
                          { method: 'POST' }
                        );
                        const data = await res.json();
                        if (data.success) {
                          prompt(
                            'Password reset successfully. Please copy the temporary password securely:',
                            data.temporaryPassword
                          );
                        } else {
                          alert(data.error || 'Failed to reset password');
                        }
                      } catch {
                        alert('An error occurred during password reset.');
                      }
                    }}
                  >
                    Force Reset Password
                  </Button>
                ) : (
                  <div />
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInspectionEntity(null);
                    setCopiedId(false);
                  }}
                >
                  Close Inspector
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
