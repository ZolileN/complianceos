'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Database, HardDrive, Server } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type DiagnosticsResponse = {
  success: boolean;
  queueDepth: number;
  lastVacuumTimestamp: string | null;
  health: {
    overall: 'healthy' | 'degraded';
    checkedAt: string;
    redis: {
      ok: boolean;
      latencyMs: number | null;
      configured?: boolean;
      backend?: string;
      detail?: string;
      error?: string;
    };
    database: { ok: boolean; latencyMs: number | null; tenantCount: number };
    ozow?: {
      ok: boolean;
      configured: boolean;
      siteCodeConfigured: boolean;
      detail: string;
      error?: string;
      latencyMs: number | null;
    };
    paystack?: {
      ok: boolean;
      configured: boolean;
      detail: string;
      error?: string;
      latencyMs: number | null;
    };
    process: {
      uptimeSeconds: number;
      nodeVersion: string;
      memoryRssMb: number;
      memoryHeapUsedMb: number;
    };
  };
  aggregates: {
    activeTenants: number;
    suspendedTenants: number;
    activeUsers: number;
    clients: number;
    openConversations: number;
    messages24h: number;
    documents24h: number;
    openTasks: number;
  };
};

function redisStatusLabel(redis?: DiagnosticsResponse['health']['redis']): string {
  if (!redis) return 'Unavailable';
  if (redis.ok) {
    const latency = redis.latencyMs != null ? ` · ${redis.latencyMs}ms` : '';
    return `Connected${latency}`;
  }
  if (redis.configured === false) return 'Not configured';
  return 'Unavailable';
}

function ozowStatusLabel(ozow?: DiagnosticsResponse['health']['ozow']): string {
  if (!ozow) return 'Unavailable';
  if (ozow.ok) {
    const latency = ozow.latencyMs != null ? ` · ${ozow.latencyMs}ms` : '';
    return `Merchant OK${latency}`;
  }
  if (!ozow.configured) return 'Not configured';
  if (ozow.error === 'merchant_not_found') return 'Merchant not found';
  return 'Rejected';
}

function paystackStatusLabel(paystack?: DiagnosticsResponse['health']['paystack']): string {
  if (!paystack) return 'Unavailable';
  if (paystack.ok) {
    const latency = paystack.latencyMs != null ? ` · ${paystack.latencyMs}ms` : '';
    return `API key OK${latency}`;
  }
  if (!paystack.configured) return 'Not configured';
  if (paystack.error === 'invalid_key') return 'Invalid key';
  return 'Rejected';
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function GaugeBar({
  label,
  value,
  max,
  unit,
  color,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: string;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium text-slate-900">
          {value}
          {unit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block size-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}
    />
  );
}

export default function InfrastructureTuning() {
  const [runningVacuum, setRunningVacuum] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  const addConsoleLog = useCallback((message: string) => {
    // Newest first (descending): prepend, then keep the most recent 50 lines.
    setConsoleLogs((prev) => [`[${new Date().toISOString()}] ${message}`, ...prev].slice(0, 50));
  }, []);

  const fetchDiagnostics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/diagnostics');
      const data: DiagnosticsResponse = await res.json();
      if (!res.ok) throw new Error((data as unknown as { error?: string }).error || 'Failed');

      setDiagnostics(data);
      const ts = data.health.checkedAt;
      const redisPart = data.health.redis.ok
        ? `ok (${data.health.redis.latencyMs ?? '?'}ms, ${data.health.redis.backend ?? 'redis'})`
        : data.health.redis.configured === false
          ? `not_configured (${data.health.redis.detail ?? 'missing env'})`
          : `fail (${data.health.redis.error ?? data.health.redis.detail ?? '?'})`;
      const ozowPart = data.health.ozow
        ? data.health.ozow.ok
          ? `ok (${data.health.ozow.latencyMs ?? '?'}ms)`
          : `fail (${data.health.ozow.error ?? data.health.ozow.detail})`
        : 'n/a';
      const paystackPart = data.health.paystack
        ? data.health.paystack.ok
          ? `ok (${data.health.paystack.latencyMs ?? '?'}ms)`
          : `fail (${data.health.paystack.error ?? data.health.paystack.detail})`
        : 'n/a';
      addConsoleLog(
        `Diagnostics check @ ${ts} — overall: ${data.health.overall}, redis: ${redisPart}, db: ${data.health.database.ok ? 'ok' : 'fail'} (${data.health.database.latencyMs ?? '?'}ms), ozow: ${ozowPart}, paystack: ${paystackPart}`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Diagnostics fetch failed';
      addConsoleLog(`ERROR: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, [addConsoleLog]);

  useEffect(() => {
    // Defer the initial fetch a tick so no state is set synchronously in the effect.
    const initial = setTimeout(fetchDiagnostics, 0);
    const interval = setInterval(fetchDiagnostics, 30000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [fetchDiagnostics]);

  const handleRunVacuum = async () => {
    setRunningVacuum(true);
    addConsoleLog('INITIATING DATABASE VACUUM OPTIMIZATION SEQUENCE...');

    try {
      const res = await fetch('/api/admin/maintenance/vacuum', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        addConsoleLog(`SUCCESS: ${data.message || 'Database vacuum completed successfully.'}`);
        fetchDiagnostics();
      } else {
        throw new Error(data.error || 'Vacuum optimization failed');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Vacuum optimization failed.';
      addConsoleLog(`ERROR: ${errMsg}`);
    } finally {
      setRunningVacuum(false);
    }
  };

  const health = diagnostics?.health;
  const agg = diagnostics?.aggregates;
  const process = health?.process;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-10">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
            <Server className="size-3.5" />
            Observability
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">
            Infrastructure
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Live platform health, process metrics, and maintenance controls.
          </p>
        </div>
        {health && (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
            <StatusDot ok={health.overall === 'healthy'} />
            <span className="font-medium capitalize text-slate-900">{health.overall}</span>
            <span className="text-xs text-slate-500">
              checked {new Date(health.checkedAt).toLocaleTimeString()}
            </span>
          </div>
        )}
      </section>

      {loading && !diagnostics ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton h-[160px] rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="size-4 text-blue-500" />
                  Process memory
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <GaugeBar
                  label="RSS memory"
                  value={process?.memoryRssMb ?? 0}
                  max={512}
                  unit=" MB"
                  color="#3b82f6"
                />
                <GaugeBar
                  label="Heap used"
                  value={process?.memoryHeapUsedMb ?? 0}
                  max={256}
                  unit=" MB"
                  color="#60a5fa"
                />
                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>Uptime: {formatUptime(process?.uptimeSeconds ?? 0)}</span>
                  <span>Node: {process?.nodeVersion ?? '—'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="size-4 text-teal-500" />
                  Redis & database
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusDot ok={health?.redis.ok ?? false} />
                      <span className="font-medium">Redis</span>
                    </div>
                    <span className="text-slate-600">{redisStatusLabel(health?.redis)}</span>
                  </div>
                  {!health?.redis.ok && health?.redis.detail && (
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                      {health.redis.detail}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <StatusDot ok={health?.database.ok ?? false} />
                    <span className="font-medium">PostgreSQL</span>
                  </div>
                  <span className="text-slate-600">
                    {health?.database.ok ? 'Connected' : 'Unavailable'}
                    {health?.database.latencyMs != null && ` · ${health.database.latencyMs}ms`}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusDot ok={health?.ozow?.ok ?? false} />
                      <span className="font-medium">Ozow</span>
                    </div>
                    <span className="text-slate-600">{ozowStatusLabel(health?.ozow)}</span>
                  </div>
                  {health?.ozow && !health.ozow.ok && (
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                      {health.ozow.detail}
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusDot ok={health?.paystack?.ok ?? false} />
                      <span className="font-medium">Paystack</span>
                    </div>
                    <span className="text-slate-600">{paystackStatusLabel(health?.paystack)}</span>
                  </div>
                  {health?.paystack && !health.paystack.ok && (
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                      {health.paystack.detail}
                    </p>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  Queue depth: {diagnostics?.queueDepth ?? '—'}
                  {diagnostics?.lastVacuumTimestamp && (
                    <span className="ml-3">
                      Last vacuum: {new Date(diagnostics.lastVacuumTimestamp).toLocaleString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <HardDrive className="size-4 text-emerald-500" />
                  Platform aggregates
                </CardTitle>
                <CardDescription>Counts across all tenants (live from database)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Active tenants', value: agg?.activeTenants },
                    { label: 'Suspended tenants', value: agg?.suspendedTenants },
                    { label: 'Active users', value: agg?.activeUsers },
                    { label: 'Clients', value: agg?.clients },
                    { label: 'Open conversations', value: agg?.openConversations },
                    { label: 'Messages (24h)', value: agg?.messages24h },
                    { label: 'Documents (24h)', value: agg?.documents24h },
                    { label: 'Open tasks', value: agg?.openTasks },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
                    >
                      <div className="text-[0.65rem] font-semibold tracking-wide text-slate-500 uppercase">
                        {item.label}
                      </div>
                      <div className="mt-0.5 text-xl font-semibold text-slate-900">
                        {item.value ?? '—'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Database maintenance controls</CardTitle>
          <CardDescription>
            Run a non-destructive vacuum to reclaim dead rows and refresh index statistics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Button variant="primary" onClick={handleRunVacuum} disabled={runningVacuum}>
              {runningVacuum ? (
                <>
                  <span className="spinner" />
                  Optimizing storage...
                </>
              ) : (
                'Trigger database vacuum & tune'
              )}
            </Button>
            <span className="text-xs text-slate-500">
              Warning: Updates Postgres statistics and reclaims dead storage rows.
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-950">Platform diagnostics console</h3>
          </div>
          <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Newest first
          </span>
        </div>
        <div
          className="flex h-[260px] flex-col gap-1.5 overflow-y-auto p-4 font-mono text-xs"
          style={{
            background: 'var(--bg-primary, #000000)',
            color: 'var(--text-secondary)',
          }}
        >
          {consoleLogs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>Waiting for diagnostics...</div>
          ) : (
            consoleLogs.map((log, idx) => {
              let color = 'var(--text-secondary)';
              if (log.includes('SUCCESS')) color = 'var(--accent-strong, #34D399)';
              else if (log.includes('ERROR')) color = '#EF4444';
              else if (log.includes('INITIATING')) color = '#F59E0B';
              return (
                <div key={idx} style={{ color }}>
                  {log}
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}
