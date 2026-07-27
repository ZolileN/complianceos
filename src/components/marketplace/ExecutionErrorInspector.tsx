'use client';

import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ExecutionErrorInspectorProps {
  error: string | null | undefined;
  skillName?: string;
  executionId?: string;
}

export function ExecutionErrorInspector({
  error,
  skillName,
  executionId,
}: ExecutionErrorInspectorProps) {
  const [open, setOpen] = useState(false);

  if (!error?.trim()) return null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-red-600 hover:text-red-700"
        onClick={() => setOpen(true)}
      >
        <AlertCircle className="size-3.5" />
        View error
      </Button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div
            className="modal"
            style={{ maxWidth: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Execution error</h2>
                {skillName ? (
                  <p className="mt-1 text-sm text-slate-500">{skillName}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="modal-body space-y-3">
              {executionId ? (
                <p className="font-mono text-xs text-slate-500">Execution ID: {executionId}</p>
              ) : null}
              <pre
                className="max-h-[50vh] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-800"
              >
                {error}
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
