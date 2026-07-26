'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  executionId: string;
  status: string;
};

export function ExecutionApprovalActions({ executionId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== 'pending_approval' && status !== 'pending') {
    return null;
  }

  async function decide(decision: 'approve' | 'reject') {
    setLoading(decision);
    setError(null);
    try {
      const res = await fetch(`/api/skills/executions/${executionId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          reason: decision === 'reject' ? 'Rejected from execution log' : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => decide('approve')}
          className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading === 'approve' ? '…' : 'Approve'}
        </button>
        <button
          type="button"
          disabled={loading !== null}
          onClick={() => decide('reject')}
          className="rounded-md border border-red-200 bg-white px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-transparent dark:text-red-400"
        >
          {loading === 'reject' ? '…' : 'Reject'}
        </button>
      </div>
      {error && <p className="max-w-[220px] text-right text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
