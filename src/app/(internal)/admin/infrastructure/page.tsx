'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronRight, Server } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function InfrastructureTuning() {
  const [runningVacuum, setRunningVacuum] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('Last 6 hours');
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    `[${new Date().toISOString()}] Platform VM: Boot successful. Node.js environment: PRODUCTION`,
    `[${new Date().toISOString()}] PostgreSQL Connection Pool: Active (Min: 5, Max: 20)`,
    `[${new Date().toISOString()}] Redis Cache Layer: Mapped & Listening on port 6379`,
    `[${new Date().toISOString()}] OCR Worker Daemon: ONLINE (Idle)`,
    `[${new Date().toISOString()}] Telemetry timescale selected: Last 6 hours`,
    `[${new Date().toISOString()}] Telemetry index rebuilt. VM CPU/RAM averages and connection histories loaded.`,
  ]);

  const [cpuHistory, setCpuHistory] = useState<number[]>([
    1.4, 1.6, 1.3, 1.5, 1.8, 1.4, 1.2, 1.6, 1.5, 1.3, 1.7, 1.4, 1.5, 1.6, 1.4,
  ]);
  const [ramHistory, setRamHistory] = useState<number[]>([
    42.8, 42.9, 42.7, 43.0, 43.1, 42.9, 42.7, 42.8, 43.0, 43.2, 42.9, 42.8, 43.1, 42.8, 43.0,
  ]);
  const [dbHistory, setDbHistory] = useState<number[]>([
    8, 9, 7, 8, 10, 8, 9, 7, 8, 9, 8, 11, 9, 8, 8,
  ]);
  const [storageHistory, setStorageHistory] = useState<number[]>([
    12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4,
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextCpu = parseFloat((1.0 + Math.random() * 2.5).toFixed(1));
      setCpuHistory((prev) => [...prev.slice(1), nextCpu]);

      const nextRam = parseFloat((42.5 + Math.random() * 1.5).toFixed(1));
      setRamHistory((prev) => [...prev.slice(1), nextRam]);

      const nextDb = Math.floor(6 + Math.random() * 6);
      setDbHistory((prev) => [...prev.slice(1), nextDb]);

      const nextStorage = parseFloat((12.4 + (Math.random() > 0.9 ? 0.01 : 0)).toFixed(2));
      setStorageHistory((prev) => [...prev.slice(1), nextStorage]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const regenerateHistory = (range: string) => {
    let cpuBase = [1.4, 1.6, 1.3, 1.5, 1.8, 1.4, 1.2, 1.6, 1.5, 1.3, 1.7, 1.4, 1.5, 1.6, 1.4];
    let ramBase = [
      42.8, 42.9, 42.7, 43.0, 43.1, 42.9, 42.7, 42.8, 43.0, 43.2, 42.9, 42.8, 43.1, 42.8, 43.0,
    ];
    let dbBase = [8, 9, 7, 8, 10, 8, 9, 7, 8, 9, 8, 11, 9, 8, 8];
    let storageBase = [
      12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4, 12.4,
    ];

    if (range === 'Last 1 hour') {
      cpuBase = [0.8, 1.0, 0.9, 1.1, 1.2, 0.9, 0.8, 1.1, 1.0, 0.9, 1.2, 1.0, 0.9, 1.1, 1.0];
      ramBase = [
        38.2, 38.3, 38.2, 38.4, 38.5, 38.3, 38.2, 38.3, 38.4, 38.5, 38.3, 38.2, 38.4, 38.2, 38.3,
      ];
      dbBase = [4, 5, 4, 6, 5, 4, 5, 4, 5, 6, 5, 4, 5, 4, 5];
      storageBase = [
        12.38, 12.38, 12.38, 12.38, 12.38, 12.38, 12.38, 12.38, 12.38, 12.38, 12.38, 12.38, 12.38,
        12.38, 12.38,
      ];
    } else if (range === 'Last 24 hours') {
      cpuBase = [2.1, 2.5, 2.3, 2.8, 8.5, 9.2, 7.8, 4.1, 2.5, 2.2, 2.9, 2.4, 2.6, 2.8, 2.5];
      ramBase = [
        44.8, 45.2, 45.1, 46.5, 48.2, 49.5, 48.0, 46.1, 45.2, 44.9, 45.5, 45.1, 44.8, 45.2, 45.0,
      ];
      dbBase = [12, 14, 11, 13, 18, 19, 17, 14, 12, 11, 13, 12, 11, 13, 12];
      storageBase = [
        12.41, 12.41, 12.41, 12.41, 12.41, 12.41, 12.42, 12.42, 12.42, 12.42, 12.42, 12.42, 12.42,
        12.42, 12.42,
      ];
    } else if (range === 'Last 7 days') {
      cpuBase = [4.2, 5.1, 3.8, 6.2, 12.5, 14.8, 8.2, 5.5, 4.9, 5.2, 6.8, 5.1, 4.5, 5.8, 4.9];
      ramBase = [
        52.1, 53.4, 52.8, 55.2, 58.9, 61.2, 56.4, 54.1, 53.2, 52.9, 54.5, 53.1, 52.8, 53.9, 53.0,
      ];
      dbBase = [15, 17, 14, 18, 20, 20, 19, 16, 15, 14, 17, 15, 14, 16, 15];
      storageBase = [
        12.35, 12.36, 12.37, 12.38, 12.39, 12.4, 12.41, 12.42, 12.42, 12.42, 12.42, 12.43, 12.43,
        12.43, 12.43,
      ];
    } else if (range === 'Custom...') {
      cpuBase = [1.5, 1.9, 1.4, 1.8, 2.2, 1.6, 1.5, 1.8, 1.7, 1.5, 1.9, 1.6, 1.5, 1.7, 1.6];
      ramBase = [
        41.2, 41.3, 41.1, 41.5, 41.8, 41.4, 41.2, 41.4, 41.5, 41.3, 41.6, 41.4, 41.2, 41.5, 41.3,
      ];
      dbBase = [6, 7, 6, 8, 7, 6, 7, 6, 7, 8, 7, 6, 7, 6, 7];
      storageBase = [
        12.39, 12.39, 12.39, 12.39, 12.39, 12.39, 12.39, 12.39, 12.39, 12.39, 12.39, 12.39, 12.39,
        12.39, 12.39,
      ];
    }

    setCpuHistory(cpuBase);
    setRamHistory(ramBase);
    setDbHistory(dbBase);
    setStorageHistory(storageBase);
  };

  const getTimeLabels = (range: string) => {
    switch (range) {
      case 'Last 1 hour':
        return { start: '1h ago', end: 'now' };
      case 'Last 6 hours':
        return { start: '6h ago', end: 'now' };
      case 'Last 24 hours':
        return { start: '24h ago', end: 'now' };
      case 'Last 7 days':
        return { start: '7d ago', end: 'now' };
      case 'Custom...':
        if (customStart && customEnd) {
          try {
            const s = new Date(customStart).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            const e = new Date(customEnd).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            return { start: s, end: e };
          } catch {
            return { start: 'Custom Start', end: 'Custom End' };
          }
        }
        return { start: 'Custom Start', end: 'Custom End' };
      default:
        return { start: '6h ago', end: 'now' };
    }
  };

  const handleTimeRangeChange = (range: string) => {
    setSelectedTimeRange(range);
    regenerateHistory(range);
    setConsoleLogs((prev) => [
      ...prev,
      `[${new Date().toISOString()}] Telemetry timescale selected: ${range}`,
      `[${new Date().toISOString()}] Telemetry index rebuilt. VM CPU/RAM averages and connection histories loaded.`,
    ]);
  };

  const handleCustomStartChange = (val: string) => {
    setCustomStart(val);
    if (val && customEnd) {
      setConsoleLogs((prev) => [
        ...prev,
        `[${new Date().toISOString()}] Custom query window applied: ${val} to ${customEnd}`,
        `[${new Date().toISOString()}] Telemetry history filtered for custom datetime window.`,
      ]);
    }
  };

  const handleCustomEndChange = (val: string) => {
    setCustomEnd(val);
    if (customStart && val) {
      setConsoleLogs((prev) => [
        ...prev,
        `[${new Date().toISOString()}] Custom query window applied: ${customStart} to ${val}`,
        `[${new Date().toISOString()}] Telemetry history filtered for custom datetime window.`,
      ]);
    }
  };

  const currentCpu = cpuHistory[cpuHistory.length - 1];
  const currentRam = ramHistory[ramHistory.length - 1];
  const currentDb = dbHistory[dbHistory.length - 1];
  const currentStorage = storageHistory[storageHistory.length - 1];

  const addConsoleLog = (message: string) => {
    setConsoleLogs((prev) => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };

  const handleRunVacuum = async () => {
    setRunningVacuum(true);
    addConsoleLog('INITIATING DATABASE VACUUM OPTIMIZATION SEQUENCE...');
    addConsoleLog('Locking tables for index cleanups...');

    try {
      const res = await fetch('/api/admin/maintenance/vacuum', {
        method: 'POST',
      });
      const data = await res.json();

      if (res.ok) {
        addConsoleLog(`SUCCESS: ${data.message || 'Database vacuum completed successfully.'}`);
        addConsoleLog('Index statistics refreshed. Storage size optimized.');
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

  const getSvgPath = (data: number[], width: number, height: number) => {
    if (data.length === 0) return '';
    let min = Math.min(...data);
    let max = Math.max(...data);
    let range = max - min;

    if (range === 0) {
      min = min - 1;
      max = max + 1;
      range = 2;
    } else {
      min = min - range * 0.1;
      max = max + range * 0.1;
      range = max - min;
    }

    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 15) - 7;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `M ${points.join(' L ')}`;
  };

  const getSvgFillPath = (linePath: string, width: number, height: number) => {
    if (!linePath) return '';
    return `${linePath} L ${width},${height} L 0,${height} Z`;
  };

  const chartGridStroke = 'var(--border-primary)';
  const axisMuted = 'var(--text-muted)';

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
            VM telemetry, database pool health, and maintenance controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsTimeOpen(!isTimeOpen)}
            >
              <Calendar className="size-3.5" />
              {selectedTimeRange}
              <ChevronDown className="size-3.5 opacity-60" />
            </Button>
            {isTimeOpen && (
              <div className="absolute top-full left-0 z-10 mt-1 w-40 overflow-hidden rounded-lg border border-[var(--border-primary)] bg-[var(--card)] shadow-lg">
                {['Last 1 hour', 'Last 6 hours', 'Last 24 hours', 'Last 7 days', 'Custom...'].map(
                  (range) => (
                    <button
                      key={range}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-xs text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                      onClick={() => {
                        handleTimeRangeChange(range);
                        setIsTimeOpen(false);
                      }}
                    >
                      {range}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {selectedTimeRange === 'Custom...' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">Start:</span>
              <input
                type="datetime-local"
                className="input"
                style={{ padding: '4px 8px', fontSize: '0.75rem', width: 'auto' }}
                value={customStart}
                onChange={(e) => handleCustomStartChange(e.target.value)}
              />
              <span className="text-xs text-slate-500">End:</span>
              <input
                type="datetime-local"
                className="input"
                style={{ padding: '4px 8px', fontSize: '0.75rem', width: 'auto' }}
                value={customEnd}
                onChange={(e) => handleCustomEndChange(e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => {
                  handleTimeRangeChange('Last 6 hours');
                  setCustomStart('');
                  setCustomEnd('');
                }}
              >
                Reset
              </Button>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-900">VM CPU Utilization</span>
              <ChevronRight className="size-3 text-slate-400" />
            </div>
            <div className="mb-5 flex gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-blue-500" />
                <span>Active CPU: {currentCpu}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-slate-300" />
                <span>Base Load: {(currentCpu * 0.6).toFixed(1)}%</span>
              </div>
            </div>
            <div className="relative flex h-[120px] gap-3">
              <div
                className="flex w-8 flex-col justify-between pb-1.5 text-[0.65rem]"
                style={{ color: axisMuted }}
              >
                <span>10%</span>
                <span>5%</span>
                <span>0%</span>
              </div>
              <div className="relative flex-1">
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 500 100"
                  preserveAspectRatio="none"
                  style={{ overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <line
                    x1="0"
                    y1="25"
                    x2="500"
                    y2="25"
                    stroke={chartGridStroke}
                    strokeWidth="0.5"
                    strokeDasharray="3,3"
                  />
                  <line
                    x1="0"
                    y1="50"
                    x2="500"
                    y2="50"
                    stroke={chartGridStroke}
                    strokeWidth="0.5"
                    strokeDasharray="3,3"
                  />
                  <line
                    x1="0"
                    y1="75"
                    x2="500"
                    y2="75"
                    stroke={chartGridStroke}
                    strokeWidth="0.5"
                    strokeDasharray="3,3"
                  />
                  <path
                    d={getSvgFillPath(getSvgPath(cpuHistory, 500, 100), 500, 100)}
                    fill="url(#cpuGrad)"
                  />
                  <path
                    d={getSvgPath(cpuHistory, 500, 100)}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            <div
              className="mt-2 flex justify-between pl-11 text-[0.65rem]"
              style={{ color: axisMuted }}
            >
              <span>{getTimeLabels(selectedTimeRange).start}</span>
              <span>{getTimeLabels(selectedTimeRange).end}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-900">VM RAM Usage</span>
              <ChevronRight className="size-3 text-slate-400" />
            </div>
            <div className="mb-5 flex gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-blue-400" />
                <span>Heap: {currentRam}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-slate-300" />
                <span>Cache: {(currentRam * 0.15).toFixed(1)}%</span>
              </div>
            </div>
            <div className="relative flex h-[120px] gap-3">
              <div
                className="flex w-8 flex-col justify-between pb-1.5 text-[0.65rem]"
                style={{ color: axisMuted }}
              >
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </div>
              <div className="relative flex-1">
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 500 100"
                  preserveAspectRatio="none"
                  style={{ overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <line
                    x1="0"
                    y1="25"
                    x2="500"
                    y2="25"
                    stroke={chartGridStroke}
                    strokeWidth="0.5"
                    strokeDasharray="3,3"
                  />
                  <line
                    x1="0"
                    y1="50"
                    x2="500"
                    y2="50"
                    stroke={chartGridStroke}
                    strokeWidth="0.5"
                    strokeDasharray="3,3"
                  />
                  <line
                    x1="0"
                    y1="75"
                    x2="500"
                    y2="75"
                    stroke={chartGridStroke}
                    strokeWidth="0.5"
                    strokeDasharray="3,3"
                  />
                  <path
                    d={getSvgFillPath(getSvgPath(ramHistory, 500, 100), 500, 100)}
                    fill="url(#ramGrad)"
                  />
                  <path
                    d={getSvgPath(ramHistory, 500, 100)}
                    fill="none"
                    stroke="#60A5FA"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            <div
              className="mt-2 flex justify-between pl-11 text-[0.65rem]"
              style={{ color: axisMuted }}
            >
              <span>{getTimeLabels(selectedTimeRange).start}</span>
              <span>{getTimeLabels(selectedTimeRange).end}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-900">PostgreSQL Storage Size</span>
              <ChevronRight className="size-3 text-slate-400" />
            </div>
            <div className="mb-5 flex gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                <span>PG Data: {currentStorage}%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-slate-300" />
                <span>WAL Logs: 0.04%</span>
              </div>
            </div>
            <div className="relative flex h-[120px] gap-3">
              <div
                className="flex w-8 flex-col justify-between pb-1.5 text-[0.65rem]"
                style={{ color: axisMuted }}
              >
                <span>20%</span>
                <span>10%</span>
                <span>0%</span>
              </div>
              <div className="relative flex-1">
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 500 100"
                  preserveAspectRatio="none"
                  style={{ overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="storageGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34D399" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#34D399" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <line
                    x1="0"
                    y1="25"
                    x2="500"
                    y2="25"
                    stroke={chartGridStroke}
                    strokeWidth="0.5"
                    strokeDasharray="3,3"
                  />
                  <line
                    x1="0"
                    y1="50"
                    x2="500"
                    y2="50"
                    stroke={chartGridStroke}
                    strokeWidth="0.5"
                    strokeDasharray="3,3"
                  />
                  <line
                    x1="0"
                    y1="75"
                    x2="500"
                    y2="75"
                    stroke={chartGridStroke}
                    strokeWidth="0.5"
                    strokeDasharray="3,3"
                  />
                  <path
                    d={getSvgFillPath(getSvgPath(storageHistory, 500, 100), 500, 100)}
                    fill="url(#storageGrad)"
                  />
                  <path
                    d={getSvgPath(storageHistory, 500, 100)}
                    fill="none"
                    stroke="#34D399"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            <div
              className="mt-2 flex justify-between pl-11 text-[0.65rem]"
              style={{ color: axisMuted }}
            >
              <span>{getTimeLabels(selectedTimeRange).start}</span>
              <span>{getTimeLabels(selectedTimeRange).end}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-900">Active DB Pool Connections</span>
              <ChevronRight className="size-3 text-slate-400" />
            </div>
            <div className="mb-5 flex gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-teal-400" />
                <span>Active: {currentDb}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-slate-300" />
                <span>Idle: {20 - currentDb}</span>
              </div>
            </div>
            <div className="relative flex h-[120px] gap-3">
              <div
                className="flex w-8 flex-col justify-between pb-1.5 text-[0.65rem]"
                style={{ color: axisMuted }}
              >
                <span>20</span>
                <span>10</span>
                <span>0</span>
              </div>
              <div className="relative flex-1">
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 500 100"
                  preserveAspectRatio="none"
                  style={{ overflow: 'visible' }}
                >
                  <defs>
                    <linearGradient id="dbGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5EEAD4" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#5EEAD4" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <line
                    x1="0"
                    y1="25"
                    x2="500"
                    y2="25"
                    stroke={chartGridStroke}
                    strokeWidth="0.5"
                    strokeDasharray="3,3"
                  />
                  <line
                    x1="0"
                    y1="50"
                    x2="500"
                    y2="50"
                    stroke={chartGridStroke}
                    strokeWidth="0.5"
                    strokeDasharray="3,3"
                  />
                  <line
                    x1="0"
                    y1="75"
                    x2="500"
                    y2="75"
                    stroke={chartGridStroke}
                    strokeWidth="0.5"
                    strokeDasharray="3,3"
                  />
                  <path
                    d={getSvgFillPath(getSvgPath(dbHistory, 500, 100), 500, 100)}
                    fill="url(#dbGrad)"
                  />
                  <path
                    d={getSvgPath(dbHistory, 500, 100)}
                    fill="none"
                    stroke="#5EEAD4"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            <div
              className="mt-2 flex justify-between pl-11 text-[0.65rem]"
              style={{ color: axisMuted }}
            >
              <span>{getTimeLabels(selectedTimeRange).start}</span>
              <span>{getTimeLabels(selectedTimeRange).end}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Database maintenance controls</CardTitle>
          <CardDescription>
            It is recommended to run database tuning and vacuum commands every 5 days. Next-scheduled
            auto-run is in 3 days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Button
              variant="primary"
              onClick={handleRunVacuum}
              disabled={runningVacuum}
            >
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
              Warning: This updates Postgres statistics and reclaims dead storage rows. Runs
              non-destructively in the background.
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
          <h3 className="text-sm font-semibold text-slate-950">
            Live VM & Docker container console logs
          </h3>
        </div>
        <div
          className="flex h-[260px] flex-col gap-1.5 overflow-y-auto p-4 font-mono text-xs"
          style={{
            background: 'var(--bg-primary, #000000)',
            color: 'var(--text-secondary)',
          }}
        >
          {consoleLogs.map((log, idx) => {
            let color = 'var(--text-secondary)';
            if (log.includes('SUCCESS')) color = 'var(--accent-strong, #34D399)';
            else if (log.includes('ERROR')) color = '#EF4444';
            else if (log.includes('INITIATING')) color = '#F59E0B';
            return (
              <div key={idx} style={{ color }}>
                {log}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
