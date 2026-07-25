'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Webhook } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface AdminLog {
  id: string;
  timestamp: string;
  type: 'system' | 'webhook' | 'finops';
  message: string;
  payload?: Record<string, unknown>;
}

export default function WebhooksAndMetering() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLog, setActiveLog] = useState<AdminLog | null>(null);
  const [finops, setFinops] = useState<{
    totalMessages: number;
    topTenant: { name: string; plan: string; tokens: number; limit: number };
  } | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/logs');
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error('Error fetching admin logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFinOps = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/finops');
      const data = await res.json();
      if (data.success) {
        setFinops({
          totalMessages: data.totalMessages,
          topTenant: data.topTenant,
        });
      }
    } catch (err) {
      console.error('Error fetching finops:', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchLogs();
      await fetchFinOps();
    };
    init();

    const interval = setInterval(() => {
      fetchLogs();
      fetchFinOps();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs, fetchFinOps]);

  const totalWebhooks = logs.filter((l) => l.type === 'webhook').length;
  const totalSystem = logs.filter((l) => l.type === 'system').length;

  const tokenPct = finops
    ? Math.min((finops.topTenant.tokens / finops.topTenant.limit) * 100, 100)
    : 0;
  const tokenOverNearLimit =
    finops != null && finops.topTenant.tokens > finops.topTenant.limit * 0.9;
  const messagesPct = finops ? Math.min((finops.totalMessages / 15000) * 100, 100) : 0;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section>
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
          <Webhook className="size-3.5" />
          FinOps
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">
          Webhooks & metering
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Real-time usage statistics and live webhook event inspection across all workspace plans.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>FinOps token & credit metering</CardTitle>
          <CardDescription>
            Limits are enforced based on subscription tier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-elevated,transparent)] p-4">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-900">Workspace API credits metering</span>
                <span className="text-teal-700">
                  {finops
                    ? `${finops.topTenant.tokens.toLocaleString()} / ${finops.topTenant.limit.toLocaleString()} tokens`
                    : 'Loading...'}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded bg-slate-100">
                <div
                  className={`h-full rounded ${tokenOverNearLimit ? 'bg-red-500' : 'bg-teal-600'}`}
                  style={{ width: `${tokenPct}%` }}
                />
              </div>
              <p className="mt-2 text-[0.65rem] text-slate-500">
                {finops ? (
                  <>
                    {((finops.topTenant.tokens / finops.topTenant.limit) * 100).toFixed(1)}% capacity
                    consumed.
                    {finops.topTenant.tokens > 0
                      ? ` Top consumer: ${finops.topTenant.name} (${finops.topTenant.plan} plan).`
                      : ''}
                  </>
                ) : (
                  'Calculating capacity...'
                )}
              </p>
            </div>

            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-elevated,transparent)] p-4">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-900">Total WhatsApp messages metered</span>
                <span className="text-blue-600">
                  {finops ? `${finops.totalMessages.toLocaleString()} messages` : 'Loading...'}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded bg-slate-100">
                <div
                  className="h-full rounded bg-blue-500"
                  style={{ width: `${messagesPct}%` }}
                />
              </div>
              <p className="mt-2 text-[0.65rem] text-slate-500">
                Rate limit ceiling: 15,000 / day. Current queue handling: Healthy.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="flex h-[500px] flex-col overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">Live event & webhook stream</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Click any event log to inspect payloads.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Badge variant="success">{totalWebhooks} Webhooks</Badge>
              <Badge variant="info">{totalSystem} System</Badge>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
            {loading ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                Loading log stream...
              </div>
            ) : logs.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500 italic">
                No logs recorded yet.
              </div>
            ) : (
              logs.map((log) => {
                const isSelected = activeLog?.id === log.id;
                return (
                  <button
                    key={log.id}
                    type="button"
                    onClick={() => setActiveLog(log)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      isSelected
                        ? 'border-teal-300 bg-teal-50/60'
                        : 'border-slate-100 bg-slate-50/40 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <Badge
                        variant={
                          log.type === 'webhook'
                            ? 'success'
                            : log.type === 'finops'
                              ? 'info'
                              : 'warning'
                        }
                        className="uppercase"
                      >
                        {log.type}
                      </Badge>
                      <span className="text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="mt-2 text-xs font-semibold text-slate-800">{log.message}</div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="flex h-[500px] flex-col overflow-hidden p-0">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-950">Webhook payload inspector</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Inspect JSON bodies of incoming WhatsApp webhook events.
            </p>
          </div>
          <div
            className="flex-1 overflow-auto p-4 font-mono text-xs"
            style={{
              background: 'var(--bg-primary, var(--card))',
              color: 'var(--text-secondary)',
            }}
          >
            {activeLog ? (
              <div>
                <div className="mb-3 border-b border-[var(--border-primary)] pb-3">
                  <div className="font-semibold text-[var(--text-primary)]">
                    Event: {activeLog.message}
                  </div>
                  <div className="mt-1 text-[0.65rem] text-[var(--text-muted)]">
                    Timestamp: {new Date(activeLog.timestamp).toISOString()}
                  </div>
                </div>
                {activeLog.payload ? (
                  <pre
                    className="whitespace-pre-wrap break-all"
                    style={{ color: 'var(--accent-strong, var(--accent))' }}
                  >
                    {JSON.stringify(activeLog.payload, null, 2)}
                  </pre>
                ) : (
                  <div className="text-[var(--text-muted)] italic">
                    No structured payload attached to this log entry.
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[var(--text-muted)] italic">
                Select a log on the left to inspect its payload details.
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
