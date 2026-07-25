'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Copy,
  Gauge,
  MessageSquare,
  Plus,
  UsersRound,
  Webhook,
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
import { getOnboardingUrl } from '@/lib/appUrl';

interface TenantItem {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  whatsappPhoneNumber: string | null;
  whatsappSetupComplete: boolean;
  whatsappProvider: string | null;
  _count: {
    users: number;
    clients: number;
  };
}

interface OnboardingClient {
  id: string;
  companyName: string;
  registrationNumber: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  tenant: {
    name: string;
    slug: string;
  };
}

const TENANT_PLANS = ['starter', 'growth', 'professional', 'enterprise'] as const;

export default function FleetOverview() {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [onboardingClients, setOnboardingClients] = useState<OnboardingClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [queueDepth, setQueueDepth] = useState<number>(0);

  // Provision workspace dialog
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionForm, setProvisionForm] = useState({
    firmName: '',
    fullName: '',
    email: '',
    password: '',
    plan: 'starter',
  });
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  // Card filter state
  const [filterType, setFilterType] = useState<
    'all' | 'active' | 'suspended' | 'whatsapp'
  >('all');
  const stuckRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    try {
      const [tenantsRes, onboardingRes, diagnosticsRes] = await Promise.all([
        fetch('/api/admin/tenants'),
        fetch('/api/admin/onboarding'),
        fetch('/api/admin/diagnostics'),
      ]);

      const tenantsData = await tenantsRes.json();
      const onboardingData = await onboardingRes.json();
      const diagnosticsData = await diagnosticsRes.json();

      if (tenantsData.success) setTenants(tenantsData.data);
      if (onboardingData.success) setOnboardingClients(onboardingData.data);
      if (diagnosticsData.success) {
        setQueueDepth(diagnosticsData.queueDepth);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to retrieve fleet data.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchData();
    };
    init();

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/diagnostics');
        const data = await res.json();
        if (data.success) {
          setQueueDepth(data.queueDepth);
        }
      } catch (err) {
        console.error('Failed to poll diagnostics:', err);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleToggleActive = async (tenantId: string, currentStatus: boolean) => {
    setActionLoading(tenantId + '-toggle');
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update tenant status');
      showToast(`Tenant successfully ${!currentStatus ? 'activated' : 'suspended'}`);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      showToast(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionLoading(true);
    setProvisionError(null);
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(provisionForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to provision workspace');
      showToast(`Workspace "${provisionForm.firmName}" provisioned successfully`);
      setShowProvisionModal(false);
      setProvisionForm({ firmName: '', fullName: '', email: '', password: '', plan: 'starter' });
      fetchData();
    } catch (err: unknown) {
      setProvisionError(err instanceof Error ? err.message : 'Provisioning failed');
    } finally {
      setProvisionLoading(false);
    }
  };

  const handleOnboardingAction = async (clientId: string, action: 'complete' | 'reject') => {
    setActionLoading(`${clientId}-${action}`);
    try {
      const res = await fetch('/api/admin/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} onboarding`);
      showToast(`Client onboarding ${action === 'complete' ? 'completed' : 'rejected'}`);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      showToast(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleForceRevoke = async (tenantId: string) => {
    if (
      !confirm(
        'Are you sure you want to force disconnect WhatsApp for this tenant? This resets their Twilio WhatsApp setup.'
      )
    ) {
      return;
    }
    setActionLoading(tenantId + '-revoke');
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/revoke-token`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke WhatsApp connection');
      showToast('WhatsApp connection successfully revoked and reset!');
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      showToast(msg, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-sm text-[var(--text-secondary)]">
        <span className="spinner size-8" />
        <span>Polling workspace status...</span>
      </div>
    );
  }

  // Calculate metrics
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((tenant) => tenant.isActive).length;
  const suspendedTenants = totalTenants - activeTenants;
  const whatsappConnected = tenants.filter((tenant) => tenant.whatsappSetupComplete).length;
  const pendingIntake = onboardingClients.length;

  // Filter tenants array
  const filteredTenants = tenants.filter((tenant) => {
    if (filterType === 'active') return tenant.isActive;
    if (filterType === 'suspended') return !tenant.isActive;
    if (filterType === 'whatsapp') return tenant.whatsappSetupComplete;
    return true;
  });

  const filterLabel =
    filterType === 'active'
      ? 'Active'
      : filterType === 'suspended'
        ? 'Suspended'
        : 'WhatsApp Linked';

  const metrics = [
    {
      label: 'Total tenant workspaces',
      value: totalTenants,
      detail: 'Across the managed fleet',
      icon: Building2,
      iconClass: 'bg-teal-50 text-teal-700',
      filter: 'all' as const,
    },
    {
      label: 'Active workspaces',
      value: activeTenants,
      detail: 'Available to their teams',
      icon: UsersRound,
      iconClass: 'bg-emerald-50 text-emerald-700',
      filter: 'active' as const,
    },
    {
      label: 'Suspended workspaces',
      value: suspendedTenants,
      detail: 'Access currently paused',
      icon: AlertTriangle,
      iconClass: 'bg-amber-50 text-amber-700',
      filter: 'suspended' as const,
    },
    {
      label: 'WhatsApp connected',
      value: whatsappConnected,
      detail: `${whatsappConnected} of ${totalTenants} linked`,
      icon: MessageSquare,
      iconClass: 'bg-blue-50 text-blue-700',
      filter: 'whatsapp' as const,
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

      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
            <Gauge className="size-3.5" />
            Control plane
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">
            Fleet overview
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Monitor workspace health, connectivity, and onboarding across the tenant fleet.
          </p>
        </div>
        <Button onClick={() => setShowProvisionModal(true)}>
          <Plus />
          Provision workspace
        </Button>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const selected = filterType === metric.filter;

          return (
            <Card
              key={metric.label}
              onClick={() => setFilterType(metric.filter)}
              className={`cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${
                selected ? 'border-teal-500 ring-1 ring-teal-500/20' : ''
              }`}
            >
              <CardContent className="p-5">
                <div className="mb-5 flex items-start justify-between">
                  <div
                    className={`flex size-10 items-center justify-center rounded-lg ${metric.iconClass}`}
                  >
                    <Icon className="size-[18px]" />
                  </div>
                  <ArrowRight className="size-4 text-slate-300" />
                </div>
                <div className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                  {metric.value}
                </div>
                <div className="mt-1 text-sm font-medium text-slate-700">{metric.label}</div>
                <div className="mt-0.5 text-xs text-slate-400">{metric.detail}</div>
              </CardContent>
            </Card>
          );
        })}

        <Card
          onClick={() => stuckRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="cursor-pointer transition-all hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md"
        >
          <CardContent className="p-5">
            <div className="mb-5 flex items-start justify-between">
              <div className="flex size-10 items-center justify-center rounded-lg bg-red-50 text-red-700">
                <AlertTriangle className="size-[18px]" />
              </div>
              <ArrowRight className="size-4 text-slate-300" />
            </div>
            <div className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              {pendingIntake}
            </div>
            <div className="mt-1 text-sm font-medium text-slate-700">Stuck intake lines</div>
            <div className="mt-0.5 text-xs text-slate-400">Onboarding requires review</div>
          </CardContent>
        </Card>

        <Link href="/admin/webhooks" className="group">
          <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-blue-300 group-hover:shadow-md">
            <CardContent className="p-5">
              <div className="mb-5 flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <Webhook className="size-[18px]" />
                </div>
                <ArrowRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                {queueDepth}
              </div>
              <div className="mt-1 text-sm font-medium text-slate-700">
                Webhook queue backlog
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                {queueDepth === 1 ? '1 payload queued' : `${queueDepth} payloads queued`}
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>

      <Card className="overflow-hidden p-0">
        <CardHeader className="flex-row items-start justify-between border-b border-[var(--border-primary)] px-5 pb-5">
          <div>
            <CardTitle className="text-base">
              Master tenant registry
              {filterType !== 'all' && (
                <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
                  ({filterLabel} filter active)
                </span>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Control status, subscription tiers, and WhatsApp configurations across the active
              fleet.
            </CardDescription>
          </div>
          {filterType !== 'all' && (
            <Button variant="outline" size="sm" onClick={() => setFilterType('all')}>
              Clear filter
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/80">
                  {[
                    'Workspace name & slug',
                    'Tier',
                    'Members',
                    'Clients',
                    'Setup date',
                    'Status',
                    'WhatsApp',
                    'Actions',
                  ].map((label) => (
                    <th
                      key={label}
                      className={`px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] ${
                        label === 'Actions' ? 'text-right' : ''
                      }`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTenants.length === 0 ? (
                  <tr className="border-t border-[var(--border-primary)]">
                    <td
                      colSpan={8}
                      className="px-5 py-10 text-center text-sm italic text-[var(--text-muted)]"
                    >
                      No workspaces match the current active filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      className="border-t border-[var(--border-primary)] transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/tenants/${tenant.id}`}
                          className="text-sm font-semibold text-teal-700 hover:underline"
                        >
                          {tenant.name}
                        </Link>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="font-mono text-xs text-[var(--text-muted)]">
                            /onboard/{tenant.slug}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => {
                              navigator.clipboard.writeText(getOnboardingUrl(tenant.slug));
                              showToast('Onboarding URL copied to clipboard');
                            }}
                            title="Copy Onboarding URL"
                          >
                            <Copy />
                            Copy
                          </Button>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          variant={tenant.plan === 'enterprise' ? 'info' : 'outline'}
                          className="capitalize"
                        >
                          {tenant.plan}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                        {tenant._count.users}
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                        {tenant._count.clients}
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--text-muted)]">
                        {new Date(tenant.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={tenant.isActive ? 'success' : 'destructive'}>
                          {tenant.isActive ? 'Active' : 'Suspended'}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        {tenant.whatsappSetupComplete ? (
                          <div className="flex flex-col items-start gap-1">
                            <Badge variant="success">Linked</Badge>
                            {tenant.whatsappPhoneNumber && (
                              <span className="font-mono text-xs text-[var(--text-muted)]">
                                {tenant.whatsappPhoneNumber}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline">Unlinked</Badge>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant={tenant.isActive ? 'outline' : 'primary'}
                            size="sm"
                            onClick={() => handleToggleActive(tenant.id, tenant.isActive)}
                            disabled={actionLoading !== null}
                          >
                            {actionLoading === tenant.id + '-toggle'
                              ? '...'
                              : tenant.isActive
                                ? 'Suspend'
                                : 'Activate'}
                          </Button>
                          {tenant.whatsappSetupComplete && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleForceRevoke(tenant.id)}
                              disabled={actionLoading !== null}
                            >
                              {actionLoading === tenant.id + '-revoke'
                                ? '...'
                                : 'Force disconnect'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card
        id="stuck-intake-section"
        ref={stuckRef}
        className="scroll-mt-6 overflow-hidden p-0"
      >
        <CardHeader className="border-b border-[var(--border-primary)] px-5 pb-5">
          <CardTitle className="text-base">Client intake deep-dive</CardTitle>
          <CardDescription>
            Review client registrations that have not completed verification or remain in
            onboarding.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {onboardingClients.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <UsersRound className="size-5" />
              </div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                Fleet is healthy
              </div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                No onboarding client sessions are currently stuck.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/80">
                    {[
                      'Client company name',
                      'Parent tenant',
                      'Email address',
                      'Contact info',
                      'Reg number',
                      'Intake initiated',
                      'Status block',
                      'Actions',
                    ].map((label) => (
                      <th
                        key={label}
                        className={`px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] ${
                          label === 'Actions' ? 'text-right' : ''
                        }`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {onboardingClients.map((client) => (
                    <tr
                      key={client.id}
                      className="border-t border-[var(--border-primary)]"
                    >
                      <td className="px-5 py-4 text-sm font-semibold text-[var(--text-primary)]">
                        {client.companyName}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm text-[var(--text-primary)]">
                          {client.tenant.name}
                        </div>
                        <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                          {client.tenant.slug}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                        {client.email || 'N/A'}
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                        {client.phone || 'N/A'}
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--text-secondary)]">
                        {client.registrationNumber || 'N/A'}
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--text-muted)]">
                        {new Date(client.createdAt).toLocaleDateString('en-GB')}{' '}
                        {new Date(client.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="warning">Onboarding</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={actionLoading !== null}
                            onClick={() => handleOnboardingAction(client.id, 'complete')}
                          >
                            {actionLoading === `${client.id}-complete` ? '...' : 'Complete'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={actionLoading !== null}
                            onClick={() => handleOnboardingAction(client.id, 'reject')}
                          >
                            {actionLoading === `${client.id}-reject` ? '...' : 'Reject'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showProvisionModal && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal max-w-[480px]">
            <div className="modal-header">
              <h2 className="modal-title">Provision workspace</h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close"
                onClick={() => {
                  setShowProvisionModal(false);
                  setProvisionError(null);
                }}
              >
                <X />
              </Button>
            </div>
            <form onSubmit={handleProvision} className="modal-body space-y-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Create a new tenant workspace with an administrator account.
              </p>
              {provisionError && (
                <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                  <AlertTriangle className="size-4 shrink-0" />
                  {provisionError}
                </div>
              )}
              {(
                [
                  ['firmName', 'Firm name', 'text'],
                  ['fullName', 'Admin full name', 'text'],
                  ['email', 'Admin email', 'email'],
                  ['password', 'Admin password', 'password'],
                ] as const
              ).map(([key, label, type]) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    {label}
                  </label>
                  <input
                    type={type}
                    required
                    minLength={key === 'password' ? 6 : undefined}
                    value={provisionForm[key]}
                    onChange={(e) =>
                      setProvisionForm((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="input w-full"
                  />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  Plan
                </label>
                <select
                  value={provisionForm.plan}
                  onChange={(e) =>
                    setProvisionForm((prev) => ({ ...prev, plan: e.target.value }))
                  }
                  className="select w-full"
                >
                  {TENANT_PLANS.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={provisionLoading}>
                {provisionLoading ? 'Provisioning...' : 'Create workspace'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
