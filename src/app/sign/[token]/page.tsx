'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Logo from '@/components/Logo';

export default function SignMandatePage() {
  const params = useParams();
  const token = params?.token as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mandate, setMandate] = useState<{
    title: string;
    description?: string;
    clientName: string;
    firmName: string;
    signerName?: string;
    alreadySigned?: boolean;
  } | null>(null);
  const [typedName, setTypedName] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/mandates/sign/${token}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Not found');
        setMandate(data.data);
        if (data.data.signerName) setTypedName(data.data.signerName);
        if (data.data.alreadySigned) setDone(true);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSign(e: React.FormEvent) {
    e.preventDefault();
    if (!typedName.trim() || !agreed) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/mandates/sign/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ typedName: typedName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signing failed');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signing failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e2e8f0] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center"><Logo /></div>
        {loading ? (
          <div className="text-center"><span className="spinner" /></div>
        ) : error ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 text-center text-red-300">{error}</div>
        ) : done ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
            <h1 className="text-xl font-semibold text-white mb-2">Mandate signed</h1>
            <p className="text-sm text-[var(--text-secondary)]">Thank you. {mandate?.firmName} has been notified.</p>
          </div>
        ) : mandate ? (
          <form onSubmit={handleSign} className="rounded-lg border border-[#1f1f1f] bg-[#111] p-8 space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">{mandate.firmName}</p>
              <h1 className="text-2xl font-semibold text-white mt-1">{mandate.title}</h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">For {mandate.clientName}</p>
            </div>
            {mandate.description && (
              <p className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">{mandate.description}</p>
            )}
            <div>
              <label className="text-sm font-medium">Full legal name</label>
              <input
                className="input w-full mt-1"
                required
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Type your full name to sign"
              />
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
              <span>I confirm I am authorised to sign this mandate on behalf of {mandate.clientName} and agree to the terms described above.</span>
            </label>
            <button
              type="submit"
              disabled={submitting || !agreed || !typedName.trim()}
              className="btn btn-primary w-full"
            >
              {submitting ? 'Signing…' : 'Sign mandate'}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
