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

type FinOpsState = {
  totalMessages: number;
  messages24h: number;
  documentsTotal: number;
  topTenant: {
    name: string;
    plan: string;
    tokens: number; // messages this month (legacy field name from API)
    limit: number; // advisory plan soft-cap, not enforced
  };
  byPlan?: Record<string, number>;
};

type DiagnosticsState = {
  queueDepth: number;
  health?: { overall?: string };
};

function MeterBar({
  pct,
  tone = 'teal',
}: {
  pct: number;
  tone?: 'teal' | 'blue' | 'amber';
}) {
  const color =
    tone === 'blue' ? 'bg-blue-500' : tone === 'amber' ? 'bg-amber-500' : 'bg-teal-600';
  return (
    <div className="mt-2 h-2 overflow-hidden rounded bg-slate-100">
      <div
        className={`h-full rounded ${color}`}
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
      />
    </div>
  );
}

export default function WebhooksAndMetering() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLog, setActiveLog] = useState<AdminLog | null>(null);
  const [finops, setFinops] = useState<FinOpsState | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsState | null>(null);

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
          messages24h: data.messages24h ?? 0,
          documentsTotal: data.documentsTotal ?? 0,
          topTenant: data.topTenant,
          byPlan: data.byPlan,
        });
      }
    } catch (err) {
      console.error('Error fetching finops:', err);
    }
  }, []);

  const fetchDiagnostics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/diagnostics');
      const data = await res.json();
      if (data.success) {
        setDiagnostics({
          queueDepth: data.queueDepth,
          health: data.health,
        });
      }
    } catch (err) {
      console.error('Error fetching diagnostics:', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchLogs(), fetchFinOps(), fetchDiagnostics()]);
    };
    init();

    const interval = setInterval(() => {
      fetchLogs();
      fetchFinOps();
      fetchDiagnostics();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs, fetchFinOps, fetchDiagnostics]);

  const totalWebhooks = logs.filter((l) => l.type === 'webhook').length;
  const totalSystem = logs.filter((l) => l.type === 'system').length;

  const monthMessages = finops?.topTenant.tokens ?? 0;
  const softCap = finops?.topTenant.limit ?? 1;
  const monthPct = finops ? Math.min((monthMessages / softCap) * 100, 100) : 0;
  const nearSoftCap = finops != null && monthMessages > softCap * 0.9;

  const queueDepth = diagnostics?.queueDepth;
  const queueLabel =
    queueDepth == null || queueDepth < 0
      ? 'Unavailable'
      : queueDepth === 0
        ? 'Idle'
        : queueDepth < 50
          ? 'Healthy'
          : queueDepth < 200
            ? 'Busy'
            : 'Backlogged';

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
          Live WhatsApp message counts from the database. Plan soft-caps are advisory only
          (not enforced yet).
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp usage metering</CardTitle>
          <CardDescription>
            Counts come from the <code className="text-xs">Message</code> table. Soft-caps are
            display guidance by plan — they do not block sends.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-elevated,transparent)] p-4">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-900">Top workspace · this month</span>
                <span className={nearSoftCap ? 'text-red-600' : 'text-teal-700'}>
                  {finops
                    ? `${monthMessages.toLocaleString()} / ${softCap.toLocaleString()} msgs`
                    : 'Loading…'}
                </span>
              </div>
              <MeterBar pct={monthPct} tone={nearSoftCap ? 'amber' : 'teal'} />
              <p className="mt-2 text-[0.65rem] text-slate-500">
                {finops ? (
                  <>
                    {((monthMessages / softCap) * 100).toFixed(1)}% of advisory{' '}
                    {finops.topTenant.plan} soft-cap.
                    {monthMessages > 0
                      ? ` Heaviest: ${finops.topTenant.name}.`
                      : ' No messages this month yet.'}
                  </>
                ) : (
                  'Loading usage…'
                )}
              </p>
            </div>

            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-elevated,transparent)] p-4">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-900">Messages · last 24 hours</span>
                <span className="text-blue-600">
                  {finops
                    ? `${finops.messages24h.toLocaleString()} msgs`
                    : 'Loading…'}
                </span>
              </div>
              <MeterBar
                pct={
                  finops
                    ? Math.min((finops.messages24h / Math.max(finops.totalMessages, 1)) * 100, 100)
                    : 0
                }
                tone="blue"
              />
              <p className="mt-2 text-[0.65rem] text-slate-500">
                {finops
                  ? `All-time stored messages: ${finops.totalMessages.toLocaleString()}. Documents on platform: ${finops.documentsTotal.toLocaleString()}.`
                  : 'Loading…'}
              </p>
            </div>

            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-elevated,transparent)] p-4">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-900">Skill event queue</span>
                <span className="text-slate-800">
                  {queueDepth == null || queueDepth < 0
                    ? '—'
                    : `${queueDepth.toLocaleString()} pending`}
                </span>
              </div>
              <MeterBar
                pct={
                  queueDepth != null && queueDepth >= 0
                    ? Math.min((queueDepth / 200) * 100, 100)
                    : 0
                }
                tone={
                  queueDepth != null && queueDepth >= 200
                    ? 'amber'
                    : 'teal'
                }
              />
              <p className="mt-2 text-[0.65rem] text-slate-500">
                Queue status: {queueLabel}
                {diagnostics?.health?.overall
                  ? ` · Platform health: ${diagnostics.health.overall}`
                  : ''}
                .
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="flex h-[500px] flex-col overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">
                Live event & webhook stream
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                In-memory process logs (reset on deploy). Click to inspect payloads.
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
                No logs recorded yet in this process.
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
                    <div className="mt-2 text-xs font-semibold text-slate-800">
                      {log.message}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="flex h-[500px] flex-col overflow-hidden p-0">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-950">Event payload inspector</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Structured payloads attached to control-plane log entries.
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
