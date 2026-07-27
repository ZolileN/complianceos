'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Banknote, Plus, Receipt, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatZar } from '@/lib/invoicing/calculations';

type Tab = 'quotes' | 'invoices' | 'retainers';

type Summary = {
  mrrCents: number;
  outstandingCents: number;
  collectedThisMonthCents: number;
  activeRetainers: number;
  overdueInvoices: number;
  openQuotes: number;
};

type Client = { id: string; company_name: string };

export default function RevenuePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>('invoices');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [quotes, setQuotes] = useState<Array<Record<string, unknown>>>([]);
  const [invoices, setInvoices] = useState<Array<Record<string, unknown>>>([]);
  const [retainers, setRetainers] = useState<Array<Record<string, unknown>>>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    clientId: '',
    title: '',
    lineDescription: '',
    unitPriceRands: '',
    dueDays: '30',
    retainerName: '',
    retainerAmountRands: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, qRes, invRes, retRes, cliRes] = await Promise.all([
        fetch('/api/revenue/summary'),
        fetch('/api/quotes'),
        fetch('/api/invoices'),
        fetch('/api/retainers'),
        fetch('/api/clients'),
      ]);
      const [sum, q, inv, ret, cli] = await Promise.all([
        sumRes.json(), qRes.json(), invRes.json(), retRes.json(), cliRes.json(),
      ]);
      if (sum.data) setSummary(sum.data);
      if (q.data) setQuotes(q.data);
      if (inv.data) setInvoices(inv.data);
      if (ret.data) setRetainers(ret.data);
      if (cli.data) setClients(cli.data);
    } catch (err) {
      console.error(err);
      toast('Failed to load revenue data', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const unitPriceCents = Math.round(parseFloat(form.unitPriceRands || '0') * 100);
  const retainerCents = Math.round(parseFloat(form.retainerAmountRands || '0') * 100);

  async function createQuote() {
    if (!form.clientId || !form.lineDescription || unitPriceCents <= 0) {
      toast('Client, description, and amount required', 'error');
      return;
    }
    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: form.clientId,
        title: form.title || form.lineDescription,
        status: 'sent',
        lineItems: [{ description: form.lineDescription, quantity: 1, unitPriceCents }],
      }),
    });
    if (!res.ok) { toast((await res.json()).error || 'Failed', 'error'); return; }
    toast('Quote created', 'success');
    setShowForm(false);
    load();
  }

  async function createInvoice() {
    if (!form.clientId || !form.lineDescription || unitPriceCents <= 0) {
      toast('Client, description, and amount required', 'error');
      return;
    }
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parseInt(form.dueDays || '30', 10));
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: form.clientId,
        title: form.title || form.lineDescription,
        status: 'sent',
        dueDate: dueDate.toISOString(),
        lineItems: [{ description: form.lineDescription, quantity: 1, unitPriceCents }],
      }),
    });
    if (!res.ok) { toast((await res.json()).error || 'Failed', 'error'); return; }
    toast('Invoice created', 'success');
    setShowForm(false);
    load();
  }

  async function createRetainer() {
    if (!form.clientId || !form.retainerName || retainerCents <= 0) {
      toast('Client, name, and monthly amount required', 'error');
      return;
    }
    const res = await fetch('/api/retainers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: form.clientId,
        name: form.retainerName,
        amountCents: retainerCents,
      }),
    });
    if (!res.ok) { toast((await res.json()).error || 'Failed', 'error'); return; }
    toast('Retainer created', 'success');
    setShowForm(false);
    load();
  }

  async function convertQuote(id: string) {
    const res = await fetch(`/api/quotes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'converted' }),
    });
    if (!res.ok) { toast('Conversion failed', 'error'); return; }
    toast('Quote converted to invoice', 'success');
    load();
  }

  async function recordPayment(invoiceId: string, totalCents: number, paidCents: number) {
    const remaining = totalCents - paidCents;
    if (remaining <= 0) return;
    const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCents: remaining, method: 'manual' }),
    });
    if (!res.ok) { toast('Payment failed', 'error'); return; }
    toast('Payment recorded', 'success');
    load();
  }

  async function billRetainer(id: string) {
    const res = await fetch('/api/retainers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ retainerId: id }),
    });
    if (!res.ok) { toast('Billing failed', 'error'); return; }
    toast('Retainer invoice generated', 'success');
    load();
  }

  if (user?.role === 'consultant') {
    return (
      <div className="py-12 text-center text-[var(--text-secondary)]">
        Revenue management is available to administrators and operations managers.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
            <Banknote className="size-3.5" />
            Revenue
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em]">Client billing</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Quotes, invoices, retainers, and collections.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={load} disabled={loading}>
            <RefreshCw className="size-4" />
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="size-4" /> New
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--text-secondary)]">MRR (retainers)</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{formatZar(summary.mrrCents)}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--text-secondary)]">Outstanding</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{formatZar(summary.outstandingCents)}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--text-secondary)]">Collected this month</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{formatZar(summary.collectedThisMonthCents)}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--text-secondary)]">Overdue invoices</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{summary.overdueInvoices}</CardContent></Card>
        </div>
      )}

      <div className="flex gap-2 border-b border-[var(--border)] pb-2">
        {(['quotes', 'invoices', 'retainers'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${tab === t ? 'bg-teal-100 text-teal-800' : 'text-[var(--text-secondary)] hover:bg-slate-100'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><span className="spinner" style={{ width: 32, height: 32 }} /></div>
      ) : tab === 'quotes' ? (
        <div className="space-y-3">
          {quotes.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No quotes yet.</p> : quotes.map((q) => (
            <Card key={String(q.id)}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <div className="font-medium">{String(q.quoteNumber)} — {(q.client as { companyName?: string })?.companyName}</div>
                  <div className="text-sm text-[var(--text-secondary)]">{formatZar(Number(q.totalCents))}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{String(q.status)}</Badge>
                  {q.status === 'sent' && (
                    <Button size="sm" variant="secondary" onClick={() => convertQuote(String(q.id))}>Convert to invoice</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tab === 'invoices' ? (
        <div className="space-y-3">
          {invoices.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No invoices yet.</p> : invoices.map((inv) => (
            <Card key={String(inv.id)}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <div className="font-medium flex items-center gap-2"><Receipt className="size-4" />{String(inv.invoiceNumber)} — {(inv.client as { companyName?: string })?.companyName}</div>
                  <div className="text-sm text-[var(--text-secondary)]">{formatZar(Number(inv.totalCents))} · paid {formatZar(Number(inv.amountPaidCents))}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{String(inv.status)}</Badge>
                  {Number(inv.amountPaidCents) < Number(inv.totalCents) && inv.status !== 'void' && (
                    <Button size="sm" onClick={() => recordPayment(String(inv.id), Number(inv.totalCents), Number(inv.amountPaidCents))}>Record payment</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {retainers.length === 0 ? <p className="text-sm text-[var(--text-muted)]">No retainers yet.</p> : retainers.map((r) => (
            <Card key={String(r.id)}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <div className="font-medium">{String(r.name)} — {(r.client as { companyName?: string })?.companyName}</div>
                  <div className="text-sm text-[var(--text-secondary)]">{formatZar(Number(r.amountCents))}/month</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{String(r.status)}</Badge>
                  {r.status === 'active' && (
                    <Button size="sm" variant="secondary" onClick={() => billRetainer(String(r.id))}>Generate invoice</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>New {tab.slice(0, -1)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <select className="input w-full" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                <option value="">Select client</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
              {tab === 'retainers' ? (
                <>
                  <input className="input w-full" placeholder="Retainer name" value={form.retainerName} onChange={(e) => setForm({ ...form, retainerName: e.target.value })} />
                  <input className="input w-full" type="number" placeholder="Monthly amount (ZAR)" value={form.retainerAmountRands} onChange={(e) => setForm({ ...form, retainerAmountRands: e.target.value })} />
                </>
              ) : (
                <>
                  <input className="input w-full" placeholder="Title (optional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  <input className="input w-full" placeholder="Line item description" value={form.lineDescription} onChange={(e) => setForm({ ...form, lineDescription: e.target.value })} />
                  <input className="input w-full" type="number" placeholder="Amount ex VAT (ZAR)" value={form.unitPriceRands} onChange={(e) => setForm({ ...form, unitPriceRands: e.target.value })} />
                  {tab === 'invoices' && (
                    <input className="input w-full" type="number" placeholder="Due in days" value={form.dueDays} onChange={(e) => setForm({ ...form, dueDays: e.target.value })} />
                  )}
                </>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button onClick={tab === 'quotes' ? createQuote : tab === 'invoices' ? createInvoice : createRetainer}>Create</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
