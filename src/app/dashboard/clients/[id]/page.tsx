'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Client, Task, Document as Doc } from '@/types';

type TabType = 'overview' | 'documents' | 'tasks' | 'workflows';

export default function ClientDetailPage() {
  const { id } = useParams();
  const { tenant } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [tab, setTab] = useState<TabType>('overview');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant || !id) return;
    async function load() {
      try {
        const [clientRes, tasksRes, docsRes] = await Promise.all([
          fetch(`/api/clients/${id}`),
          fetch(`/api/tasks?client_id=${id}`), // The backend might need an update to filter by client_id if requested
          fetch(`/api/documents?client_id=${id}`) // Assuming the backend supports this
        ]);

        if (clientRes.ok) {
          const { data } = await clientRes.json();
          if (data && typeof data.directors === 'string') {
            try { data.directors = JSON.parse(data.directors); } catch { data.directors = []; }
          }
          setClient(data as Client);
        }

        if (tasksRes.ok) {
          const { data } = await tasksRes.json();
          setTasks(data.filter((t: { client?: { id?: string } }) => t.client?.id === id) as Task[]);
        }

        if (docsRes.ok) {
          const { data } = await docsRes.json();
          setDocuments(data.filter((d: { client?: { id?: string } }) => d.client?.id === id) as Doc[]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenant, id]);

  const statusBadge = (s: string) => {
    const m: Record<string, string> = { active: 'badge-green', inactive: 'badge-gray', onboarding: 'badge-blue', new: 'badge-purple', waiting_on_client: 'badge-amber', processing: 'badge-blue', submitted: 'badge-purple', completed: 'badge-green', overdue: 'badge-red' };
    return m[s] || 'badge-gray';
  };

  if (loading) return <div className="flex-center" style={{ padding: 80 }}><span className="spinner" style={{ width: 40, height: 40 }} /></div>;
  if (!client) return <div className="empty-state"><h3>Client not found</h3></div>;

  const directors = Array.isArray(client.directors) ? client.directors : [];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/dashboard/clients" className="btn btn-ghost btn-icon">←</Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 className="page-title">{client.company_name}</h1>
              <span className={`badge ${statusBadge(client.status)}`}>{client.status}</span>
            </div>
            <p className="page-subtitle">{client.registration_number || 'No registration number'}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {(['overview', 'documents', 'tasks', 'workflows'] as TabType[]).map((t) => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="content-grid grid-2 animate-in">
          <div className="card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Company Information</h3>
            <div className="stack" style={{ gap: 12 }}>
              {[
                ['Registration', client.registration_number],
                ['Tax Number', client.tax_number],
                ['VAT Number', client.vat_number],
                ['Email', client.email],
                ['Phone', client.phone],
                ['WhatsApp', client.whatsapp_number],
              ].map(([label, val]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontWeight: 500 }}>{val || '—'}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16 }}>Directors</h3>
            {directors.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No directors added</p>
            ) : (
              <div className="stack" style={{ gap: 8 }}>
                {directors.map((d, i) => (
                  <div key={i} style={{ padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: 600 }}>{d.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>ID: {d.id_number || '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className="animate-in">
          {documents.length === 0 ? (
            <div className="card"><div className="empty-state"><div className="empty-icon">📁</div><h3>No documents</h3><p>Upload documents for this client</p></div></div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead><tr><th>Name</th><th>Category</th><th>Type</th><th>Uploaded</th></tr></thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 500 }}><a href={d.file_path} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{d.name}</a></td>
                      <td><span className="badge badge-blue">{d.category}</span></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{d.file_type || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(d.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'tasks' && (
        <div className="animate-in">
          {tasks.length === 0 ? (
            <div className="card"><div className="empty-state"><div className="empty-icon">☑</div><h3>No tasks</h3><p>Create tasks for this client</p></div></div>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {tasks.map((t) => (
                <div key={t.id} className="card" style={{ padding: 16 }}>
                  <div className="flex-between">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.title}</div>
                      {t.due_date && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Due: {new Date(t.due_date).toLocaleDateString()}</div>}
                    </div>
                    <span className={`badge ${statusBadge(t.status)}`}>{t.status.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'workflows' && (
        <div className="card animate-in">
          <div className="empty-state">
            <div className="empty-icon">⑂</div>
            <h3>No active workflows</h3>
            <p>Start a workflow for this client from the Workflows page</p>
          </div>
        </div>
      )}
    </div>
  );
}
