'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ScrollText } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatAuditDetailValue } from '@/lib/format-audit-details';

interface AuditLogItem {
  id: string;
  action: 'SUSPEND_TENANT' | 'ACTIVATE_TENANT' | 'DISCONNECT_WHATSAPP' | 'VACUUM_DATABASE';
  adminId: string;
  adminEmail: string;
  targetId: string | null;
  details: string;
  createdAt: string;
  admin: {
    name: string | null;
    email: string;
  };
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'outline';

function actionVariant(action: string): BadgeVariant {
  switch (action) {
    case 'SUSPEND_TENANT':
      return 'destructive';
    case 'ACTIVATE_TENANT':
      return 'success';
    case 'DISCONNECT_WHATSAPP':
      return 'warning';
    case 'VACUUM_DATABASE':
      return 'info';
    default:
      return 'outline';
  }
}

function actionLabel(action: string): string {
  switch (action) {
    case 'DISCONNECT_WHATSAPP':
      return 'WhatsApp Disconnected';
    case 'SUSPEND_TENANT':
      return 'Suspend Tenant';
    case 'ACTIVATE_TENANT':
      return 'Activate Tenant';
    case 'VACUUM_DATABASE':
      return 'Vacuum Database';
    default:
      return action.replace(/_/g, ' ');
  }
}

const FILTER_ACTIONS = [
  'ALL',
  'SUSPEND_TENANT',
  'ACTIVATE_TENANT',
  'DISCONNECT_WHATSAPP',
  'VACUUM_DATABASE',
] as const;

export default function SystemAuditLogs() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchLogs = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs');
      const data = await res.json();
      if (res.ok && data.success) {
        setLogs(data.data);
      } else {
        throw new Error(data.error || 'Failed to retrieve logs');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve system logs';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchLogs(false);
    };
    init();
  }, [fetchLogs]);

  const filteredLogs = logs.filter(
    (log) => actionFilter === 'ALL' || log.action === actionFilter
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[1000] rounded-lg px-5 py-3 text-sm font-semibold shadow-lg ${
            toast.type === 'success'
              ? 'border border-emerald-600 bg-emerald-900 text-emerald-100'
              : 'border border-red-600 bg-red-900 text-red-100'
          }`}
        >
          {toast.message}
        </div>
      )}

      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
            <ScrollText className="size-3.5" />
            Compliance
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">
            System audit stream
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Immutable log of high-risk platform operations, mutators, and maintenance heartbeats.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchLogs(true)}
          disabled={loading}
        >
          <RefreshCw className={loading ? 'animate-spin' : undefined} />
          {loading ? 'Refreshing...' : 'Refresh logs'}
        </Button>
      </section>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-4">
          <span className="mr-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Filter action:
          </span>
          {FILTER_ACTIONS.map((action) => (
            <Button
              key={action}
              type="button"
              size="sm"
              variant={actionFilter === action ? 'primary' : 'ghost'}
              onClick={() => setActionFilter(action)}
            >
              {action === 'ALL'
                ? 'All'
                : action === 'DISCONNECT_WHATSAPP'
                  ? 'WhatsApp Disconnected'
                  : action.replace(/_/g, ' ')}
            </Button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                {['Timestamp', 'Action', 'Administrator', 'Target entity ID', 'Details & metadata'].map(
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
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-sm text-slate-500">
                      <span className="spinner size-6" />
                      <span>Reading audit records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-slate-500 italic"
                  >
                    No audit log records match the current filter selection.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  let detailsParsed: Record<string, unknown> = {};
                  try {
                    detailsParsed = JSON.parse(log.details);
                  } catch {
                    /* ignore */
                  }

                  return (
                    <tr key={log.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={actionVariant(log.action)}>
                          {actionLabel(log.action)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-sm font-semibold text-slate-900">
                          {log.admin.name || 'Unnamed Admin'}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500">{log.adminEmail}</div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
                        {log.targetId || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1">
                          {Object.keys(detailsParsed).length === 0 ? (
                            <span className="text-xs text-slate-400 italic">
                              No extra parameters
                            </span>
                          ) : (
                            Object.entries(detailsParsed).map(([key, val]) => (
                              <div key={key} className="text-xs text-slate-700">
                                <span className="font-semibold text-slate-400">{key}:</span>{' '}
                                <span className="whitespace-pre-wrap break-words font-mono">
                                  {formatAuditDetailValue(val)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
