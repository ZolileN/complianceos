'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Copy, Plus, Search, UsersRound } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getOnboardingUrl } from '@/lib/appUrl';
import type { Client } from '@/types';

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'outline';

function statusVariant(status: string): BadgeVariant {
  const variants: Record<string, BadgeVariant> = {
    active: 'success',
    inactive: 'outline',
    onboarding: 'info',
  };
  return variants[status] || 'default';
}

export default function ClientsPage() {
  const { user, tenant } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!tenant) return;
    fetch('/api/dashboard')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.tenant?.slug) setTenantSlug(d.tenant.slug);
      })
      .catch(() => null);
  }, [tenant]);

  const handleCopyInviteLink = async () => {
    if (!tenantSlug) return;
    const url = getOnboardingUrl(tenantSlug);
    try {
      await navigator.clipboard.writeText(url);
      toast('Invite link copied to clipboard! Share it with your clients.', 'success');
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      toast('Invite link copied!', 'success');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });
    const url = debouncedSearch
      ? `/api/clients?search=${encodeURIComponent(debouncedSearch)}`
      : `/api/clients`;
    fetch(url)
      .then((res) => res.json())
      .then(({ data }) => {
        if (!cancelled) setClients(data || []);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenant, debouncedSearch]);

  const canAddClient =
    user?.role === 'administrator' || user?.role === 'operations_manager';

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        eyebrow={
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
            <UsersRound className="size-3.5" />
            Portfolio
          </div>
        }
        title="Clients"
        description={`${clients.length} ${clients.length === 1 ? 'company' : 'companies'} in your workspace`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {tenantSlug && (
              <Button
                variant={linkCopied ? 'secondary' : 'outline'}
                size="sm"
                onClick={handleCopyInviteLink}
                title={`Share: /onboard/${tenantSlug}`}
              >
                {linkCopied ? <Check /> : <Copy />}
                {linkCopied ? 'Link copied' : 'Share invite link'}
              </Button>
            )}
            {canAddClient && (
              <Button asChild variant="primary">
                <Link href="/dashboard/clients/new">
                  <Plus />
                  Add client
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input"
          placeholder="Search clients by name..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setLoading(true);
          }}
          style={{ paddingLeft: 40 }}
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-14" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <UsersRound className="size-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-950">No clients found</h2>
            <p className="max-w-sm text-sm text-slate-500">
              {search
                ? 'Try a different search term.'
                : 'Add your first client or share an invite link to get started.'}
            </p>
            {!search && canAddClient && (
              <Button asChild variant="primary" className="mt-2">
                <Link href="/dashboard/clients/new">
                  <Plus />
                  Add client
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  {['Company', 'Reg number', 'Tax number', 'Contact', 'Consultant', 'Status'].map(
                    (label) => (
                      <th
                        key={label}
                        className="px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase"
                      >
                        {label}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/80"
                    onClick={() => router.push(`/dashboard/clients/${c.id}`)}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                          {c.company_name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-900">{c.company_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">
                      {c.registration_number || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{c.tax_number || '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">
                      {c.email || c.phone || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">
                      {(c.assigned_consultant as unknown as { name?: string })?.name || 'Unassigned'}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant={statusVariant(c.status)} className="capitalize">
                        {c.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
