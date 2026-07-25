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
  createdAt: string;
}

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
  whatsappSetupComplete: boolean;
  whatsappPhoneNumber: string | null;
  email: string | null;
  contactNumber: string | null;
  address: string | null;
  website: string | null;
  createdAt: string;
  users: UserItem[];
  clients: ClientItem[];
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

  useEffect(() => {
    const fetchTenantDetail = async () => {
      try {
        const res = await fetch(`/api/admin/tenants/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to retrieve tenant details');
        setTenant(data.data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchTenantDetail();
  }, [id]);

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
      {/* Top Header Navigation */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
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

      {/* Tenant Metadata Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/80">
                  {['Name', 'Email Address', 'System Permission Role', 'Joined Date'].map(
                    (label) => (
                      <th
                        key={label}
                        className="px-4 py-3 text-xs font-semibold tracking-wide text-[var(--text-secondary)] uppercase"
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
                      colSpan={4}
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
                      <td className="px-4 py-3.5 text-sm text-[var(--text-secondary)]">
                        {new Date(user.createdAt).toLocaleDateString('en-GB')}
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
