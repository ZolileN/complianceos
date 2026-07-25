'use client';

import React, { useState, useEffect } from 'react';
import { ScrollText } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface AuditLog {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  };
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'outline';

function actionVariant(action: string): BadgeVariant {
  if (action === 'CREATE') return 'success';
  if (action === 'UPDATE') return 'info';
  if (action === 'DELETE') return 'destructive';
  if (action === 'UPLOAD') return 'warning';
  return 'outline';
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/audit-logs');
        if (!res.ok) throw new Error('Failed to fetch audit logs');
        const data = await res.json();
        setLogs(data.data || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    void fetchLogs();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1500px] space-y-4">
        <div className="skeleton h-10 w-56" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section>
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
          <ScrollText className="size-3.5" />
          Security
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">Audit logs</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Track system activity, user actions, and changes.
        </p>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="overflow-hidden p-0">
        {logs.length === 0 ? (
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <ScrollText className="size-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-950">No audit logs found</h2>
            <p className="max-w-sm text-sm text-slate-500">
              System activity will appear here as users interact with the platform.
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  {['Timestamp', 'User', 'Action', 'Entity type', 'Details'].map((label) => (
                    <th
                      key={label}
                      className="px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  let detailsParsed: Record<string, unknown> = {};
                  try {
                    detailsParsed = JSON.parse(log.details);
                  } catch {
                    detailsParsed = {};
                  }

                  return (
                    <tr key={log.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3.5 whitespace-nowrap text-sm text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                            {log.user.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="m-0 text-sm font-semibold text-slate-900">
                              {log.user.name || 'Unknown'}
                            </p>
                            <p className="m-0 text-xs text-slate-500">{log.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={actionVariant(log.action)}>{log.action}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-sm font-medium text-slate-700">
                        {log.entityType}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1">
                          {Object.keys(detailsParsed).length === 0 ? (
                            <span className="text-xs text-slate-500">—</span>
                          ) : (
                            Object.entries(detailsParsed).map(([key, value]) => (
                              <div key={key} className="text-xs">
                                <span className="font-semibold capitalize text-slate-500">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                                </span>{' '}
                                <span className="text-slate-700">{String(value)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
