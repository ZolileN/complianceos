'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter, useParams } from 'next/navigation';
import type { Director } from '@/types';

export default function EditClientPage() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { id } = useParams();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    company_name: '', registration_number: '', tax_number: '', vat_number: '',
    email: '', phone: '', whatsapp_number: '', address: '', status: 'active',
  });
  const [directors, setDirectors] = useState<Director[]>([{ name: '', id_number: '', email: '', phone: '' }]);
  const [consultants, setConsultants] = useState<{ id: string; full_name: string }[]>([]);
  const [assignedConsultantId, setAssignedConsultantId] = useState<string>('');

  useEffect(() => {
    if (!tenant || !id) return;
    async function load() {
      try {
        const [clientRes, usersRes] = await Promise.all([
          fetch(`/api/clients/${id}`),
          fetch('/api/users')
        ]);
        if (!clientRes.ok) throw new Error('Failed to load client');
        const { data } = await clientRes.json();
        
        setForm({
          company_name: data.company_name || '',
          registration_number: data.registration_number || '',
          tax_number: data.tax_number || '',
          vat_number: data.vat_number || '',
          email: data.email || '',
          phone: data.phone || '',
          whatsapp_number: data.whatsapp_number || '',
          address: data.address || '',
          status: data.status || 'active',
        });
        setAssignedConsultantId(data.assigned_consultant_id || '');

        if (usersRes.ok) {
          const { data: userData } = await usersRes.json();
          setConsultants(userData || []);
        }
        
        let parsedDirectors = [];
        if (data.directors) {
          try {
            parsedDirectors = typeof data.directors === 'string' ? JSON.parse(data.directors) : data.directors;
          } catch {
            parsedDirectors = [];
          }
        }
        if (parsedDirectors.length > 0) {
          setDirectors(parsedDirectors);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenant, id]);

  const updateForm = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));
  const updateDirector = (i: number, key: string, value: string) => {
    const d = [...directors]; d[i] = { ...d[i], [key]: value }; setDirectors(d);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          assigned_consultant_id: assignedConsultantId || null,
          directors: directors.filter((d) => d.name),
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update client');
      }

      toast('Client updated successfully');
      router.push(`/dashboard/clients/${id}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update client';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };


  if (loading) return <div className="flex-center" style={{ padding: 80 }}><span className="spinner" style={{ width: 40, height: 40 }} /></div>;

  return (
    <div style={{ maxWidth: 700 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Edit Client</h1>
          <p className="page-subtitle">Update company information and directors</p>
        </div>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 20, color: 'var(--red)', fontSize: '0.85rem' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Company Details</h3>
          <div className="stack">
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
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Contact Details</h3>
          <div className="stack">
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
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Assignment & Status</h3>
          <div className="stack">
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
          </div>
        </div>

        <div className="card" style={{ marginBottom: 24 }}>
          <div className="flex-between" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Directors</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDirectors([...directors, { name: '', id_number: '', email: '', phone: '' }])}>+ Add Director</button>
          </div>
          <div className="stack">
            {directors.map((d, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="input" value={d.name} onChange={(e) => updateDirector(i, 'name', e.target.value)} placeholder="e.g. James Rhodes" />
                </div>
                <div className="form-group">
                  <label className="form-label">ID Number</label>
                  <input className="input" value={d.id_number} onChange={(e) => updateDirector(i, 'id_number', e.target.value)} placeholder="ID number" />
                </div>
                <button
                  type="button"
                  onClick={() => setDirectors(directors.filter((_, idx) => idx !== i))}
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', borderRadius: 'var(--radius-md)', width: 36, height: 40, cursor: 'pointer', fontSize: '0.9rem', flexShrink: 0 }}
                  title="Remove director"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner" /> : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
