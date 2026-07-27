'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { FileSignature, Plus } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Mandate = {
  id: string;
  title: string;
  status: string;
  signUrl?: string;
  signedAt?: string;
  signerName?: string;
};

export default function MandatePanel({ clientId, clientName, clientEmail }: {
  clientId: string;
  clientName: string;
  clientEmail?: string;
}) {
  const { toast } = useToast();
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('Power of Attorney / Mandate');
  const [description, setDescription] = useState('');
  const [signerEmail, setSignerEmail] = useState(clientEmail || '');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(`/api/mandates?client_id=${clientId}`);
    const { data } = await res.json();
    setMandates(data || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  async function createMandate() {
    const res = await fetch('/api/mandates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, title, description, signerEmail }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast(data.error || 'Failed to create mandate', 'error');
      return;
    }
    toast('Mandate created — sign link sent', 'success');
    if (data.data?.signUrl) {
      navigator.clipboard?.writeText(data.data.signUrl);
      toast('Sign link copied to clipboard', 'info');
    }
    setShowForm(false);
    load();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSignature className="size-4" /> Mandates
        </CardTitle>
        <Button size="sm" variant="secondary" onClick={() => setShowForm(!showForm)}>
          <Plus className="size-4" /> Request signature
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {showForm && (
          <div className="space-y-2 rounded-lg border p-3">
            <input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Mandate title" />
            <textarea className="input w-full" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Scope of authority (optional)" />
            <input className="input w-full" type="email" value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="Signer email" />
            <Button size="sm" onClick={createMandate}>Send for signature</Button>
          </div>
        )}
        {loading ? (
          <span className="spinner" style={{ width: 20, height: 20 }} />
        ) : mandates.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No mandates yet for {clientName}.</p>
        ) : mandates.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
            <div>
              <div className="font-medium">{m.title}</div>
              {m.signerName && m.status === 'signed' && (
                <div className="text-xs text-[var(--text-muted)]">Signed by {m.signerName}</div>
              )}
            </div>
            <Badge>{m.status}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
