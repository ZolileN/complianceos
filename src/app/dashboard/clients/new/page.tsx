'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, UserPlus, X } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Director } from '@/types';

export default function NewClientPage() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    company_name: '', registration_number: '', tax_number: '', vat_number: '',
    email: '', phone: '', whatsapp_number: '', address: '', status: 'active',
  });
  const [directors, setDirectors] = useState<Director[]>([{ name: '', id_number: '', email: '', phone: '' }]);
  const [consultants, setConsultants] = useState<{ id: string; full_name: string }[]>([]);
  const [assignedConsultantId, setAssignedConsultantId] = useState<string>('');

  useEffect(() => {
    if (!tenant) return;
    async function loadConsultants() {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const { data } = await res.json();
          setConsultants(data || []);
        }
      } catch (err) {
        console.error('Failed to load consultants', err);
      }
    }
    loadConsultants();
  }, [tenant]);

  const updateForm = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));
  const updateDirector = (i: number, key: string, value: string) => {
    const d = [...directors]; d[i] = { ...d[i], [key]: value }; setDirectors(d);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          assigned_consultant_id: assignedConsultantId || null,
          directors: directors.filter((d) => d.name),
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create client');
      }

      toast('Client created successfully');
      router.push('/dashboard/clients');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create client';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[700px] space-y-6">
      <section>
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
          <UserPlus className="size-3.5" />
          Portfolio
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">New client</h1>
        <p className="mt-1.5 text-sm text-slate-500">Add a new client to your practice</p>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Company details</CardTitle>
          </CardHeader>
          <CardContent className="stack">
            <div className="form-group">
              <label className="form-label">Company Name *</label>
              <input className="input" required value={form.company_name} onChange={(e) => updateForm('company_name', e.target.value)} placeholder="Stark Industries (Pty) Ltd" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">CIPC Registration Number</label>
                <input className="input" value={form.registration_number} onChange={(e) => updateForm('registration_number', e.target.value)} placeholder="2024/123456/07" />
              </div>
              <div className="form-group">
                <label className="form-label">Tax Number</label>
                <input className="input" value={form.tax_number} onChange={(e) => updateForm('tax_number', e.target.value)} placeholder="9012345678" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">VAT Number</label>
              <input className="input" value={form.vat_number} onChange={(e) => updateForm('vat_number', e.target.value)} placeholder="4012345678" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact details</CardTitle>
          </CardHeader>
          <CardContent className="stack">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="input" type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} placeholder="info@starkindustries.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="input" value={form.phone} onChange={(e) => updateForm('phone', e.target.value)} placeholder="011 123 4567" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">WhatsApp Number</label>
              <input className="input" value={form.whatsapp_number} onChange={(e) => updateForm('whatsapp_number', e.target.value)} placeholder="27821234567" />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea className="input" style={{ minHeight: '80px', resize: 'vertical' }} value={form.address} onChange={(e) => updateForm('address', e.target.value)} placeholder="Physical or Registered Address" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment & status</CardTitle>
          </CardHeader>
          <CardContent className="stack">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Assigned Consultant</label>
                <select 
                  className="select" 
                  value={assignedConsultantId} 
                  onChange={(e) => setAssignedConsultantId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {consultants.map((user) => (
                    <option key={user.id} value={user.id}>{user.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select 
                  className="select" 
                  value={form.status} 
                  onChange={(e) => updateForm('status', e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="onboarding">Onboarding</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Directors</CardTitle>
            <Button type="button" variant="secondary" size="sm" onClick={() => setDirectors([...directors, { name: '', id_number: '', email: '', phone: '' }])}>
              <Plus />
              Add director
            </Button>
          </CardHeader>
          <CardContent className="stack">
            {directors.map((d, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="input" value={d.name} onChange={(e) => updateDirector(i, 'name', e.target.value)} placeholder="e.g. James Rhodes" />
                </div>
                <div className="form-group">
                  <label className="form-label">ID Number</label>
                  <input className="input" value={d.id_number} onChange={(e) => updateDirector(i, 'id_number', e.target.value)} placeholder="ID number" />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mb-0.5 text-red-600 hover:text-red-700"
                  onClick={() => setDirectors(directors.filter((_, idx) => idx !== i))}
                  title="Remove director"
                >
                  <X />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Create client'}
          </Button>
        </div>
      </form>
    </div>
  );
}
