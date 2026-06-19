'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Client, Task, Document as Doc, ComplianceItem, ClientWorkflow, WorkflowTemplate, WorkflowStepProgress } from '@/types';
import DocumentViewerModal from '@/components/DocumentViewerModal';
import { WORKFLOW_CATEGORIES } from '@/lib/constants';

type TabType = 'overview' | 'documents' | 'compliance' | 'tasks' | 'workflows';

export default function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, tenant } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [client, setClient] = useState<Client | null>(null);
  const [tab, setTab] = useState<TabType>('overview');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeViewDoc, setActiveViewDoc] = useState<Doc | null>(null);

  // Compliance update states
  const [editingItem, setEditingItem] = useState<ComplianceItem | null>(null);
  const [editStatus, setEditStatus] = useState<string>('compliant');
  const [editDueDate, setEditDueDate] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [updatingCompliance, setUpdatingCompliance] = useState(false);

  // Workflow states
  const [clientWorkflows, setClientWorkflows] = useState<ClientWorkflow[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [assigningWorkflow, setAssigningWorkflow] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStepProgress | null>(null);
  const [editStepStatus, setEditStepStatus] = useState<string>('pending');
  const [editStepNotes, setEditStepNotes] = useState<string>('');
  const [savingStep, setSavingStep] = useState(false);

  useEffect(() => {
    if (!tenant || !id) return;
    async function load() {
      try {
        const [clientRes, tasksRes, docsRes, complianceRes, workflowsRes, templatesRes] = await Promise.all([
          fetch(`/api/clients/${id}`),
          fetch(`/api/tasks?client_id=${id}`), 
          fetch(`/api/documents?client_id=${id}`),
          fetch(`/api/clients/${id}/compliance`),
          fetch(`/api/clients/${id}/workflows`),
          fetch('/api/workflows')
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

        if (complianceRes.ok) {
          const { data } = await complianceRes.json();
          setComplianceItems(data as ComplianceItem[]);
        }

        if (workflowsRes.ok) {
          const { data } = await workflowsRes.json();
          setClientWorkflows(data as ClientWorkflow[]);
        }

        if (templatesRes.ok) {
          const { data } = await templatesRes.json();
          setTemplates(data || []);
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
    const m: Record<string, string> = { 
      active: 'badge-green', 
      inactive: 'badge-gray', 
      onboarding: 'badge-blue', 
      new: 'badge-purple', 
      waiting_on_client: 'badge-amber', 
      processing: 'badge-blue', 
      submitted: 'badge-purple', 
      completed: 'badge-green', 
      overdue: 'badge-red',
      compliant: 'badge-green',
      action_required: 'badge-amber',
      critical: 'badge-red',
      not_applicable: 'badge-gray'
    };
    return m[s] || 'badge-gray';
  };

  const handleArchive = async () => {
    const ok = await confirm({
      title: 'Archive Client',
      message: 'Are you sure you want to archive this client? They will be marked inactive and hidden from active lists. You can reactivate them later.',
      confirmText: 'Archive',
      cancelText: 'Cancel',
      type: 'warning'
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to archive client');
      toast('Client archived successfully');
      router.push('/dashboard/clients');
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : 'Failed to archive client', 'error');
    }
  };

  const handleEditCompliance = (item: ComplianceItem) => {
    setEditingItem(item);
    setEditStatus(item.status);
    setEditDueDate(item.due_date ? item.due_date.substring(0, 10) : '');
    setEditNotes(item.notes || '');
  };

  const handleSaveCompliance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setUpdatingCompliance(true);
    try {
      const res = await fetch(`/api/clients/${id}/compliance`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingItem.id,
          status: editStatus,
          due_date: editDueDate || null,
          notes: editNotes
        })
      });
      if (!res.ok) throw new Error('Failed to update compliance item');
      const { data } = await res.json();
      setComplianceItems(prev => prev.map(item => item.id === data.id ? (data as ComplianceItem) : item));
      toast('Compliance status updated successfully');
      setEditingItem(null);
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : 'Failed to update compliance item', 'error');
    } finally {
      setUpdatingCompliance(false);
    }
  };

  const handleAssignWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) return;
    setAssigningWorkflow(true);
    try {
      const res = await fetch(`/api/clients/${id}/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplateId })
      });
      if (!res.ok) throw new Error('Failed to assign workflow');
      const { data } = await res.json();
      setClientWorkflows(prev => [data, ...prev]);
      toast('Workflow assigned successfully');
      setSelectedTemplateId('');
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : 'Failed to assign workflow', 'error');
    } finally {
      setAssigningWorkflow(false);
    }
  };

  const handleEditStep = (stepProg: WorkflowStepProgress) => {
    setEditingStep(stepProg);
    setEditStepStatus(stepProg.status);
    setEditStepNotes(stepProg.notes || '');
  };

  const handleSaveStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStep) return;
    setSavingStep(true);
    try {
      const res = await fetch(`/api/clients/${id}/workflows`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progressId: editingStep.id,
          status: editStepStatus,
          notes: editStepNotes
        })
      });
      if (!res.ok) throw new Error('Failed to update step progress');
      const { data } = await res.json();
      
      setClientWorkflows(prev => prev.map(w => {
        if (w.id === data.workflow.id) {
          const updatedProgress = w.progress?.map(p => 
            p.id === data.step.id 
              ? { ...p, status: data.step.status, notes: data.step.notes, completed_by: data.step.completed_by, completed_at: data.step.completed_at }
              : p
          );
          return {
            ...w,
            status: data.workflow.status,
            completed_at: data.workflow.completed_at,
            progress: updatedProgress
          };
        }
        return w;
      }));

      toast('Step progress updated successfully');
      setEditingStep(null);
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : 'Failed to update step progress', 'error');
    } finally {
      setSavingStep(false);
    }
  };

  if (loading) return <div className="flex-center" style={{ padding: 80 }}><span className="spinner" style={{ width: 40, height: 40 }} /></div>;
  if (!client) return <div className="empty-state"><h3>Client not found</h3></div>;

  const directors = Array.isArray(client.directors) ? client.directors : [];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user?.role !== 'client' && (
            <Link href="/dashboard/clients" className="btn btn-ghost btn-icon">←</Link>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 className="page-title">{client.company_name}</h1>
              <span className={`badge ${statusBadge(client.status)}`}>{client.status}</span>
            </div>
            <p className="page-subtitle">{client.registration_number || 'No registration number'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {user?.role !== 'client' && (
            <Link href={`/dashboard/clients/${id}/edit`} className="btn btn-secondary">✏️ Edit</Link>
          )}
          {(user?.role === 'administrator' || user?.role === 'operations_manager') && (
            <button className="btn btn-secondary" style={{ color: 'var(--amber)', borderColor: 'var(--border)' }} onClick={handleArchive}>📦 Archive</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {(['overview', 'documents', 'compliance', 'tasks', 'workflows'] as TabType[]).map((t) => (
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
                ['Address', client.address],
                ['Consultant', client.assigned_consultant?.full_name || 'Unassigned'],
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
                <thead><tr><th>Name</th><th>Category</th><th>Type</th><th>Uploaded</th><th>Actions</th></tr></thead>
                <tbody>
                  {documents.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <button 
                          onClick={() => setActiveViewDoc(d)}
                          style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', fontWeight: 500, color: 'inherit', textAlign: 'left' }}
                        >
                          {d.name}
                        </button>
                      </td>
                      <td><span className="badge badge-blue">{d.category.replace('_', ' ')}</span></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{d.file_type || '—'}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{new Date(d.created_at).toLocaleDateString('en-GB')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }} onClick={() => setActiveViewDoc(d)}>View</button>
                          <a href={d.file_path} download={d.name} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', textDecoration: 'none' }}>Download</a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'compliance' && (
        <div className="stack animate-in" style={{ gap: 24 }}>
          {['SARS', 'CIPC', 'Labour', 'BEE'].map(category => {
            const categoryItems = complianceItems.filter(item => item.category === category);
            return (
              <div key={category} className="card">
                <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 16, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8, color: '#5EEAD4' }}>
                  {category} Requirements
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                  {categoryItems.map(item => (
                    <div key={item.id} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--border-primary)' }}>
                      <div>
                        <div className="flex-between" style={{ marginBottom: 10, alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</span>
                          <span className={`badge ${statusBadge(item.status)}`}>
                            {item.status.replace('_', ' ')}
                          </span>
                        </div>
                        {item.due_date && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                            <strong>Due/Expiry:</strong> {new Date(item.due_date).toLocaleDateString('en-GB')}
                          </p>
                        )}
                        {item.notes && (
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '6px 10px', borderRadius: 4, fontStyle: 'italic', marginBottom: 12 }}>
                            {item.notes}
                          </p>
                        )}
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          Checked: {new Date(item.last_checked).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                      {user?.role !== 'client' && (
                        <button onClick={() => handleEditCompliance(item)} className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start', marginTop: 12 }}>
                          ⚙️ Update Status
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Editing Modal */}
          {editingItem && (
            <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
              <div className="card" style={{ width: 440, maxWidth: '90%', padding: 24, zIndex: 101 }}>
                <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}>Update {editingItem.category} — {editingItem.name}</h3>
                <form onSubmit={handleSaveCompliance} className="stack" style={{ gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="select">
                      <option value="compliant">Compliant</option>
                      <option value="action_required">Action Required</option>
                      <option value="critical">Critical</option>
                      <option value="not_applicable">Not Applicable</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due / Expiry Date</label>
                    <input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} className="input" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} className="textarea" placeholder="Enter compliance remarks, instructions, or reference details..." />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                    <button type="button" onClick={() => setEditingItem(null)} className="btn btn-secondary" disabled={updatingCompliance}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={updatingCompliance}>
                      {updatingCompliance ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </div>
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
                      {t.due_date && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Due: {new Date(t.due_date).toLocaleDateString('en-GB')}</div>}
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
        <div className="stack animate-in" style={{ gap: 24 }}>
          {/* Assignment Card */}
          {user?.role !== 'client' && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16 }}>Assign New Workflow</h3>
              <form onSubmit={handleAssignWorkflow} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: 1, minWidth: 250, marginBottom: 0 }}>
                  <label className="form-label">Workflow Template</label>
                  <select 
                    value={selectedTemplateId} 
                    onChange={e => setSelectedTemplateId(e.target.value)} 
                    className="select"
                    required
                  >
                    <option value="">Select a template...</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.category.replace('_', ' ')})</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" disabled={assigningWorkflow || !selectedTemplateId}>
                  {assigningWorkflow ? 'Assigning...' : '➕ Assign Workflow'}
                </button>
              </form>
            </div>
          )}

          {/* Active Workflows */}
          {clientWorkflows.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon">⑂</div>
                <h3>No workflows assigned</h3>
                <p>Assign a compliance or onboarding workflow template to get started.</p>
              </div>
            </div>
          ) : (
            <div className="stack" style={{ gap: 20 }}>
              {clientWorkflows.map(w => {
                const totalSteps = w.progress?.length || 0;
                const completedSteps = w.progress?.filter(p => p.status === 'completed' || p.status === 'skipped').length || 0;
                const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
                const categoryColor = WORKFLOW_CATEGORIES.find(c => c.value === w.template?.category)?.color || 'var(--accent)';
                
                return (
                  <div key={w.id} className="card" style={{ padding: 24, borderLeft: `4px solid ${categoryColor}` }}>
                    <div className="flex-between" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{w.template?.name}</h3>
                          <span className={`badge ${statusBadge(w.status)}`}>
                            {w.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                          {w.template?.description || 'No description provided'}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.875rem' }}>
                        <span style={{ fontWeight: 600 }}>{completedSteps} / {totalSteps}</span> steps completed
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: 6, background: 'var(--bg-secondary)', borderRadius: 3, marginBottom: 20, overflow: 'hidden' }}>
                      <div style={{ width: `${progressPct}%`, height: '100%', background: categoryColor, transition: 'width 0.4s ease' }} />
                    </div>

                    {/* Steps list */}
                    <div className="table-container" style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '8px 0' }}>
                      <table className="table" style={{ background: 'transparent' }}>
                        <thead>
                          <tr>
                            <th style={{ width: 60, textAlign: 'center' }}>Step</th>
                            <th>Name</th>
                            <th>Status</th>
                            <th>Due/SLA</th>
                            <th>Notes</th>
                            {user?.role !== 'client' && <th style={{ textAlign: 'right' }}>Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {w.progress?.map((p, index) => (
                            <tr key={p.id} style={{ borderBottom: index === (w.progress?.length || 0) - 1 ? 'none' : '1px solid var(--border-subtle)' }}>
                              <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>
                                {p.step?.step_order || index + 1}
                              </td>
                              <td style={{ fontWeight: 500 }}>{p.step?.name}</td>
                              <td>
                                <span className={`badge ${statusBadge(p.status)}`}>
                                  {p.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                {p.step?.sla_days ? `${p.step.sla_days} days SLA` : '—'}
                              </td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.notes || ''}>
                                {p.notes || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No notes</span>}
                              </td>
                              {user?.role !== 'client' && (
                                <td style={{ textAlign: 'right' }}>
                                  <button onClick={() => handleEditStep(p)} className="btn btn-secondary btn-sm" style={{ padding: '2px 8px' }}>
                                    ✏️ Edit
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Edit Step Modal */}
          {editingStep && (
            <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
              <div className="card" style={{ width: 440, maxWidth: '90%', padding: 24, zIndex: 101 }}>
                <h3 style={{ marginBottom: 16, fontSize: '1.1rem' }}>Update Step — {editingStep.step?.name}</h3>
                <form onSubmit={handleSaveStep} className="stack" style={{ gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select value={editStepStatus} onChange={e => setEditStepStatus(e.target.value)} className="select">
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="skipped">Skipped</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea 
                      value={editStepNotes} 
                      onChange={e => setEditStepNotes(e.target.value)} 
                      className="textarea" 
                      placeholder="Add update notes, links, or issues for this step..." 
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                    <button type="button" onClick={() => setEditingStep(null)} className="btn btn-secondary" disabled={savingStep}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={savingStep}>
                      {savingStep ? 'Saving...' : 'Save Progress'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Document Viewer Modal */}
      {activeViewDoc && (
        <DocumentViewerModal 
          document={activeViewDoc} 
          onClose={() => setActiveViewDoc(null)} 
        />
      )}
    </div>
  );
}
