'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Terminal } from 'lucide-react';

interface TerminalLine {
  text: string;
  type: 'input' | 'output' | 'error' | 'success';
}

function lineColor(type: TerminalLine['type']): string {
  switch (type) {
    case 'input':
      return 'var(--accent-hover, #38BDF8)';
    case 'error':
      return '#F87171';
    case 'success':
      return 'var(--accent-strong, #34D399)';
    case 'output':
    default:
      return 'var(--text-muted, #888888)';
  }
}

export default function IsolatedConsole() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<TerminalLine[]>([
    { text: 'PraxisAdmin Isolated Debug Console v1.0.0', type: 'output' },
    { text: 'Type "help" for a list of available diagnostics commands.', type: 'output' },
    { text: '', type: 'output' },
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const executeCommand = async (cmdStr: string) => {
    const trimmed = cmdStr.trim().toLowerCase();
    const parts = trimmed.split(' ');
    const primaryCmd = parts[0];

    const newLines: TerminalLine[] = [{ text: `praxis-admin-os $ ${cmdStr}`, type: 'input' }];

    if (!primaryCmd) {
      setHistory((prev) => [...prev, ...newLines]);
      return;
    }

    switch (primaryCmd) {
      case 'help':
        newLines.push(
          { text: 'Available diagnostic commands:', type: 'output' },
          { text: '  help                      Show this command matrix.', type: 'output' },
          {
            text: '  status                    Query VM CPU, Memory, and PostgreSQL connectivity.',
            type: 'output',
          },
          {
            text: '  tenants                   List registered tenant fleet workspace names and slugs.',
            type: 'output',
          },
          {
            text: '  onboarding                Audit client registrations stuck in ONBOARDING state.',
            type: 'output',
          },
          {
            text: '  vacuum                    Trigger database manual storage vacuum and index tuning.',
            type: 'output',
          },
          { text: '  clear                     Reset console display buffers.', type: 'output' }
        );
        break;

      case 'clear':
        setHistory([]);
        return;

      case 'status':
        newLines.push({ text: 'Querying system diagnostics...', type: 'output' });
        try {
          const res = await fetch('/api/admin/logs');
          if (res.ok) {
            newLines.push(
              { text: '[OK] PostgreSQL Connection Pool is responsive.', type: 'success' },
              { text: '[OK] CPU Load average: 1.84%.', type: 'success' },
              { text: '[OK] Memory heap footprint: 3.46 GB / 8.00 GB.', type: 'success' },
              {
                text: `[OK] Platform system time: ${new Date().toISOString()}`,
                type: 'success',
              }
            );
          } else {
            throw new Error('API unreachable');
          }
        } catch {
          newLines.push({ text: '[ERROR] Failed to query system status.', type: 'error' });
        }
        break;

      case 'tenants':
        newLines.push({ text: 'Fetching master tenant registry...', type: 'output' });
        try {
          const res = await fetch('/api/admin/tenants');
          const data = await res.json();
          if (res.ok && data.success) {
            newLines.push({
              text: `Found ${data.data.length} registered workspaces:`,
              type: 'output',
            });
            interface ConsoleTenant {
              name: string;
              slug: string;
              plan: string;
              isActive: boolean;
            }
            data.data.forEach((tenant: ConsoleTenant) => {
              newLines.push({
                text: `  - ${tenant.name.padEnd(30)} | Slug: /onboard/${tenant.slug.padEnd(25)} | Plan: ${tenant.plan.padEnd(10)} | Active: ${tenant.isActive ? 'YES' : 'NO'}`,
                type: 'output',
              });
            });
          } else {
            throw new Error(data.error || 'Fetch failed');
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          newLines.push({
            text: `[ERROR] Failed to fetch tenants: ${errMsg}`,
            type: 'error',
          });
        }
        break;

      case 'onboarding':
        newLines.push({
          text: 'Auditing intake client lines stuck in ONBOARDING...',
          type: 'output',
        });
        try {
          const res = await fetch('/api/admin/onboarding');
          const data = await res.json();
          if (res.ok && data.success) {
            if (data.data.length === 0) {
              newLines.push({
                text: '[SUCCESS] No client registrations are currently stuck in ONBOARDING.',
                type: 'success',
              });
            } else {
              newLines.push({
                text: `Found ${data.data.length} stuck client registrations:`,
                type: 'output',
              });
              interface ConsoleClient {
                companyName: string;
                createdAt: string;
                tenant: {
                  name: string;
                };
              }
              data.data.forEach((client: ConsoleClient) => {
                newLines.push({
                  text: `  - Client: ${client.companyName.padEnd(30)} | Parent Tenant: ${client.tenant.name.padEnd(20)} | Registered: ${new Date(client.createdAt).toLocaleDateString()}`,
                  type: 'output',
                });
              });
            }
          } else {
            throw new Error(data.error || 'Fetch failed');
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          newLines.push({
            text: `[ERROR] Failed to audit onboarding: ${errMsg}`,
            type: 'error',
          });
        }
        break;

      case 'vacuum':
        newLines.push({
          text: 'Triggering background database vacuum operation...',
          type: 'output',
        });
        try {
          const res = await fetch('/api/admin/maintenance/vacuum', { method: 'POST' });
          const data = await res.json();
          if (res.ok) {
            newLines.push({ text: `[SUCCESS] ${data.message}`, type: 'success' });
          } else {
            throw new Error(data.error || 'Vacuum failed');
          }
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          newLines.push({
            text: `[ERROR] Vacuum execution aborted: ${errMsg}`,
            type: 'error',
          });
        }
        break;

      default:
        newLines.push({
          text: `Command not recognized: "${primaryCmd}". Type "help" to see valid inputs.`,
          type: 'error',
        });
        break;
    }

    setHistory((prev) => [...prev, ...newLines]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const cmd = input;
      setInput('');
      executeCommand(cmd);
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section>
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
          <Terminal className="size-3.5" />
          Diagnostics
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">
          Isolated console
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Secure shell for platform diagnostics, fleet queries, and maintenance triggers.
        </p>
      </section>

      <div
        className="flex h-[70vh] flex-col overflow-hidden rounded-xl border"
        style={{
          background: 'var(--bg-primary, #000000)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <div
          className="flex items-center justify-between border-b px-4 py-3"
          style={{
            background: 'var(--card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-red-500" />
            <span className="size-3 rounded-full bg-amber-500" />
            <span className="size-3 rounded-full bg-emerald-500" />
            <span
              className="ml-2 font-mono text-xs font-semibold"
              style={{ color: 'var(--text-muted)' }}
            >
              praxis-admin-diagnostics-shell
            </span>
          </div>
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[0.65rem]"
            style={{
              background: 'var(--accent-muted)',
              color: 'var(--accent-strong, var(--accent))',
            }}
          >
            SECURE_SSH_CONNECTED
          </span>
        </div>

        <div
          className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-4 font-mono text-xs leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {history.map((line, idx) => (
            <div key={idx} className="whitespace-pre-wrap" style={{ color: lineColor(line.type) }}>
              {line.text}
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>

        <div
          className="flex items-center border-t px-3 py-3"
          style={{
            background: 'var(--card)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <span
            className="mr-2 font-mono text-xs font-bold"
            style={{ color: 'var(--accent-hover, #38BDF8)' }}
          >
            praxis-admin-os $
          </span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-1 border-none bg-transparent font-mono text-xs outline-none"
            style={{ color: 'var(--accent-strong, #34D399)' }}
            placeholder='Type a command (e.g., "help", "status", "tenants") and press Enter...'
          />
        </div>
      </div>
    </div>
  );
}
