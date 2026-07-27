'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Archive,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Circle,
  ClipboardList,
  Eye,
  FileText,
  FolderOpen,
  GitBranch,
  Pencil,
  Plus,
  UsersRound,
  Zap,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import type {
  Client,
  Task,
  Document as Doc,
  ComplianceItem,
  ClientWorkflow,
  WorkflowTemplate,
  WorkflowStepProgress,
} from '@/types';
import { checkDocumentMatch } from '@/lib/documentMatch';
import DocumentViewerModal from '@/components/DocumentViewerModal';
import { WORKFLOW_CATEGORIES } from '@/lib/constants';
import { UploadDropzone } from '@/lib/uploadthing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import '@uploadthing/react/styles.css';

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'outline';

function statusVariant(status: string): BadgeVariant {
  const variants: Record<string, BadgeVariant> = {
    active: 'success',
    completed: 'success',
    compliant: 'success',
    inactive: 'outline',
    not_applicable: 'outline',
    onboarding: 'info',
    new: 'info',
    processing: 'info',
    submitted: 'info',
    in_progress: 'info',
    waiting_on_client: 'warning',
    action_required: 'warning',
    pending: 'default',
    overdue: 'destructive',
    critical: 'destructive',
    skipped: 'outline',
  };
  return variants[status] || 'default';
}

interface AuditLogHistoryItem {
  id: string;
  details: string;
  createdAt: string;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
}

type TabType = 'overview' | 'documents' | 'compliance' | 'tasks' | 'workflows';

function ClientDetailPageContent() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [deepLinkedItemId, setDeepLinkedItemId] = useState<string | null>(null);
  const deepLinkHandledRef = useRef(false);

  // Compliance update states
  const [editingItem, setEditingItem] = useState<ComplianceItem | null>(null);
  const [editStatus, setEditStatus] = useState<string>('compliant');
  const [editDueDate, setEditDueDate] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [updatingCompliance, setUpdatingCompliance] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [itemHistory, setItemHistory] = useState<AuditLogHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    const itemId = searchParams.get('item');

    if (
      requestedTab &&
      ['overview', 'documents', 'compliance', 'tasks', 'workflows'].includes(requestedTab)
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- URL → state sync on param change
      setTab(requestedTab as TabType);
    }
    if (itemId) {
      setTab('compliance');
      if (itemId !== deepLinkedItemId) {
        deepLinkHandledRef.current = false;
      }
      setDeepLinkedItemId(itemId);
    } else {
      setDeepLinkedItemId(null);
    }
  }, [deepLinkedItemId, searchParams]);

  useEffect(() => {
    if (!deepLinkedItemId || deepLinkHandledRef.current || complianceItems.length === 0) {
      return;
    }

    const item = complianceItems.find((candidate) => candidate.id === deepLinkedItemId);
    if (!item) return;

    deepLinkHandledRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deep-link opens editor once data loads
    setTab('compliance');

    // Staff land directly in the issue editor; clients land on the highlighted issue.
    if (user?.role !== 'client') {
      setEditingItem(item);
      setEditStatus(item.status);
      setEditDueDate(item.due_date ? item.due_date.substring(0, 10) : '');
      setEditNotes(item.notes || '');
      setSelectedDocIds(item.documents ? item.documents.map((doc) => doc.id) : []);
      setLoadingHistory(true);
      fetch(`/api/compliance/${item.id}/history`)
        .then((response) => (response.ok ? response.json() : { data: [] }))
        .then((json) => setItemHistory(json.data || []))
        .catch((error) => console.error(error))
        .finally(() => setLoadingHistory(false));
    }

    window.requestAnimationFrame(() => {
      document
        .getElementById(`compliance-item-${item.id}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [complianceItems, deepLinkedItemId, user?.role]);

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

  const fetchHistory = async (itemId: string) => {
    setLoadingHistory(true);
    setItemHistory([]);
    try {
      const res = await fetch(`/api/compliance/${itemId}/history`);
      if (res.ok) {
        const json = await res.json();
        setItemHistory(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEditCompliance = (item: ComplianceItem) => {
    setEditingItem(item);
    setEditStatus(item.status);
    setEditDueDate(item.due_date ? item.due_date.substring(0, 10) : '');
    setEditNotes(item.notes || '');
    setSelectedDocIds(item.documents ? item.documents.map(d => d.id) : []);
    fetchHistory(item.id);
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
          notes: editNotes,
          documentIds: selectedDocIds
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

  if (loading) {
    return (
      <div className="mx-auto max-w-[1500px] space-y-4">
        <div className="skeleton h-10 w-64" />
        <div className="skeleton h-8 w-96" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }
  if (!client) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
            <Building2 className="size-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-950">Client not found</h2>
          <p className="text-sm text-slate-500">This client may have been archived or removed.</p>
          <Button asChild variant="outline" className="mt-2">
            <Link href="/dashboard/clients">Back to clients</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const directors = Array.isArray(client.directors) ? client.directors : [];
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Building2 className="size-3.5" /> },
    { id: 'documents', label: 'Documents', icon: <FolderOpen className="size-3.5" /> },
    { id: 'compliance', label: 'Compliance', icon: <ClipboardList className="size-3.5" /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckCircle2 className="size-3.5" /> },
    { id: 'workflows', label: 'Workflows', icon: <GitBranch className="size-3.5" /> },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex items-start gap-3">
          {user?.role !== 'client' && (
            <Button asChild variant="ghost" size="icon" className="mt-1 shrink-0">
              <Link href="/dashboard/clients" aria-label="Back to clients">
                <ArrowLeft />
              </Link>
            </Button>
          )}
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
              <UsersRound className="size-3.5" />
              Client
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">
                {client.company_name}
              </h1>
              <Badge variant={statusVariant(client.status)} className="capitalize">
                {client.status}
              </Badge>
            </div>
            <p className="mt-1.5 text-sm text-slate-500">
              {client.registration_number || 'No registration number'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user?.role !== 'client' && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/clients/${id}/edit`}>
                <Pencil />
                Edit
              </Link>
            </Button>
          )}
          {(user?.role === 'administrator' || user?.role === 'operations_manager') && (
            <Button variant="secondary" size="sm" onClick={handleArchive}>
              <Archive />
              Archive
            </Button>
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-1 border-b border-[var(--border-primary)] pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-teal-50 text-teal-800'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Company information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
                <div key={label as string} className="flex justify-between gap-4 text-sm">
                  <span className="text-[var(--text-secondary)]">{label}</span>
                  <span className="text-right font-medium text-[var(--text-primary)]">
                    {val || '—'}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Directors</CardTitle>
            </CardHeader>
            <CardContent>
              {directors.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">No directors added</p>
              ) : (
                <div className="space-y-2">
                  {directors.map((d, i) => (
                    <div
                      key={i}
                      className="rounded-lg bg-[var(--bg-secondary)] px-3 py-2.5 text-sm"
                    >
                      <div className="font-semibold text-[var(--text-primary)]">{d.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        ID: {d.id_number || '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'documents' && (
        <div>
          {documents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
                <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <FolderOpen className="size-5" />
                </div>
                <h2 className="text-base font-semibold text-slate-950">No documents</h2>
                <p className="text-sm text-slate-500">Upload documents for this client</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      {['Name', 'Category', 'Type', 'Uploaded', 'Actions'].map((label) => (
                        <th
                          key={label}
                          className="px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 uppercase"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((d) => (
                      <tr key={d.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => setActiveViewDoc(d)}
                            className="text-left text-sm font-medium text-slate-900 hover:text-teal-700"
                          >
                            {d.name}
                          </button>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant="info" className="capitalize">
                            {d.category.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-500">
                          {d.file_type || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-500">
                          {new Date(d.created_at).toLocaleDateString('en-GB')}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setActiveViewDoc(d)}
                            >
                              <Eye />
                              View
                            </Button>
                            <Button asChild variant="ghost" size="sm">
                              <a href={d.file_path} download={d.name} target="_blank" rel="noreferrer">
                                Download
                              </a>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === 'compliance' && (
        <div className="space-y-6">
          {['SARS', 'CIPC', 'Labour', 'BEE'].map((category) => {
            const categoryItems = complianceItems.filter((item) => item.category === category);
            return (
              <Card key={category}>
                <CardHeader className="border-b border-[var(--border-subtle)] pb-3">
                  <CardTitle className="text-base text-teal-700">{category} requirements</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {categoryItems.map((item) => {
                      const canEdit = user?.role !== 'client';
                      return (
                        <div
                          id={`compliance-item-${item.id}`}
                          key={item.id}
                          role={canEdit ? 'button' : undefined}
                          tabIndex={canEdit ? 0 : undefined}
                          onClick={canEdit ? () => handleEditCompliance(item) : undefined}
                          onKeyDown={
                            canEdit
                              ? (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleEditCompliance(item);
                                  }
                                }
                              : undefined
                          }
                          className={`flex flex-col justify-between rounded-lg border bg-[var(--bg-secondary)] p-4 transition-colors ${
                            deepLinkedItemId === item.id
                              ? 'border-teal-600 shadow-[0_0_0_4px_var(--accent-muted)]'
                              : 'border-[var(--border-primary)]'
                          } ${canEdit ? 'cursor-pointer hover:border-teal-600/40' : ''}`}
                        >
                          <div>
                            <div className="mb-2.5 flex items-start justify-between gap-2">
                              <span className="text-sm font-semibold text-[var(--text-primary)]">
                                {item.name}
                              </span>
                              <Badge
                                variant={statusVariant(item.status)}
                                className="capitalize shrink-0"
                              >
                                {item.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            {item.due_date && (
                              <p className="mb-2 text-xs text-[var(--text-secondary)]">
                                <strong>Due/Expiry:</strong>{' '}
                                {new Date(item.due_date).toLocaleDateString('en-GB')}
                              </p>
                            )}
                            {item.notes && (
                              <p className="mb-3 rounded bg-[var(--bg-primary)] px-2.5 py-1.5 text-xs italic text-[var(--text-muted)]">
                                {item.notes}
                              </p>
                            )}
                            {item.documents && item.documents.length > 0 && (
                              <div className="mb-3 mt-2">
                                <strong className="mb-1 block text-xs text-[var(--text-secondary)]">
                                  Proof documents
                                </strong>
                                <div className="flex flex-wrap gap-1.5">
                                  {item.documents.map((doc) => (
                                    <button
                                      key={doc.id}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveViewDoc(doc);
                                      }}
                                      className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                                    >
                                      <FileText className="size-3" />
                                      {doc.name.substring(0, 20)}
                                      {doc.name.length > 20 ? '...' : ''}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            <p className="text-[0.65rem] text-[var(--text-muted)]">
                              Checked:{' '}
                              {new Date(item.last_checked).toLocaleDateString('en-GB')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {editingItem && (
            <div
              className="modal-backdrop"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
              }}
            >
              <Card className="z-[101] w-full max-w-[550px] max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <CardTitle className="text-base">
                    Update {editingItem.category} — {editingItem.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveCompliance} className="stack gap-4">
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="select"
                      >
                        <option value="compliant">Compliant</option>
                        <option value="action_required">Action Required</option>
                        <option value="critical">Critical</option>
                        <option value="not_applicable">Not Applicable</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Due / Expiry Date</label>
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Notes</label>
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="textarea"
                        placeholder="Enter compliance remarks, instructions, or reference details..."
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Attach Proof Documents</label>
                      <div
                        className="max-h-[120px] overflow-y-auto rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-2"
                      >
                        {documents.length === 0 ? (
                          <p className="m-0 text-xs italic text-[var(--text-muted)]">
                            No documents uploaded yet. Upload one below or go to Documents tab.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {documents.map((doc) => (
                              <label
                                key={doc.id}
                                className="flex cursor-pointer items-center gap-2 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedDocIds.includes(doc.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedDocIds((prev) => [...prev, doc.id]);
                                    } else {
                                      setSelectedDocIds((prev) =>
                                        prev.filter((docId) => docId !== doc.id)
                                      );
                                    }
                                  }}
                                />
                                <span className="truncate">
                                  {doc.name} ({doc.category.replace('_', ' ')})
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Or Upload New Document</label>
                      <UploadDropzone
                        endpoint="documentUploader"
                        onBeforeUploadBegin={async (files) => {
                          const oversized = files.filter((f) => f.size > 15 * 1024 * 1024);
                          if (oversized.length > 0) {
                            toast(`File too large: maximum is 15 MB.`, 'error');
                            return files.filter((f) => f.size <= 15 * 1024 * 1024);
                          }
                          return files;
                        }}
                        onClientUploadComplete={async (res) => {
                          try {
                            const newDocs: Doc[] = [];
                            for (const file of res) {
                              const fileUrl =
                                (file as { url: string; ufsUrl?: string }).ufsUrl ?? file.url;
                              let category = 'other';
                              if (editingItem.category === 'SARS' && editingItem.name === 'VAT')
                                category = 'vat_certificate';
                              else if (
                                editingItem.category === 'SARS' &&
                                editingItem.name === 'Income Tax'
                              )
                                category = 'tax_certificate';
                              else if (
                                editingItem.category === 'CIPC' &&
                                editingItem.name === 'Annual Returns'
                              )
                                category = 'cor_document';
                              else if (editingItem.category === 'BEE') category = 'bee_certificate';

                              const uploadRes = await fetch('/api/documents/upload', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  url: fileUrl,
                                  name: file.name,
                                  size: file.size,
                                  type: file.type,
                                  client_id: id,
                                  category: category,
                                }),
                              });
                              const json = await uploadRes.json();
                              if (json.data) {
                                newDocs.push(json.data);
                              }
                            }
                            if (newDocs.length > 0) {
                              setDocuments((prev) => [...newDocs, ...prev]);
                              setSelectedDocIds((prev) => [
                                ...prev,
                                ...newDocs.map((d) => d.id),
                              ]);
                              toast(`${newDocs.length} proof document(s) uploaded successfully!`);
                            }
                          } catch (err) {
                            console.error('Document registration failed:', err);
                            toast(
                              err instanceof Error ? err.message : 'Failed to register document',
                              'error'
                            );
                          }
                        }}
                        onUploadError={(error: Error) => {
                          toast(`Upload failed: ${error.message}`, 'error');
                        }}
                      />
                    </div>

                    <div className="mt-2 border-t border-[var(--border-primary)] pt-4">
                      <h4 className="mb-2 text-xs font-semibold text-[var(--text-secondary)]">
                        Status update history
                      </h4>
                      {loadingHistory ? (
                        <div className="text-xs text-[var(--text-muted)]">Loading history...</div>
                      ) : itemHistory.length === 0 ? (
                        <div className="text-xs italic text-[var(--text-muted)]">
                          No history records found.
                        </div>
                      ) : (
                        <div className="flex max-h-[120px] flex-col gap-2 overflow-y-auto">
                          {itemHistory.map((log) => {
                            let detailsParsed: { status?: string } = {};
                            try {
                              detailsParsed = JSON.parse(log.details) as { status?: string };
                            } catch {
                              detailsParsed = {};
                            }

                            return (
                              <div
                                key={log.id}
                                className="rounded border-l-2 border-[var(--border-subtle)] bg-[var(--bg-primary)] px-2 py-1.5 text-xs"
                              >
                                <div className="flex justify-between font-semibold">
                                  <span>{log.user?.name || log.user?.email || 'System'}</span>
                                  <span className="font-normal text-[var(--text-muted)]">
                                    {new Date(log.createdAt).toLocaleDateString('en-GB')}{' '}
                                    {new Date(log.createdAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                <div className="mt-0.5 text-[var(--text-secondary)]">
                                  Changed status to{' '}
                                  <span className="font-semibold">
                                    {detailsParsed.status?.replace('_', ' ') || 'updated'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setEditingItem(null)}
                        disabled={updatingCompliance}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary" disabled={updatingCompliance}>
                        {updatingCompliance ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {tab === 'tasks' && (
        <div>
          {tasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
                <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <CheckCircle2 className="size-5" />
                </div>
                <h2 className="text-base font-semibold text-slate-950">No tasks</h2>
                <p className="text-sm text-slate-500">Create tasks for this client</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tasks.map((t) => (
                <Card key={t.id}>
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{t.title}</div>
                      {t.due_date && (
                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                          Due: {new Date(t.due_date).toLocaleDateString('en-GB')}
                        </div>
                      )}
                    </div>
                    <Badge variant={statusVariant(t.status)} className="capitalize shrink-0">
                      {t.status.replace('_', ' ')}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'workflows' && (
        <div className="space-y-6">
          {user?.role !== 'client' && (
            <Card>
              <CardHeader>
                <CardTitle>Assign new workflow</CardTitle>
              </CardHeader>
              <CardContent>
                <form
                  onSubmit={handleAssignWorkflow}
                  className="flex flex-wrap items-end gap-3"
                >
                  <div className="form-group mb-0 min-w-[250px] flex-1">
                    <label className="form-label">Workflow template</label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="select"
                      required
                    >
                      <option value="">Select a template...</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.category.replace('_', ' ')})
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={assigningWorkflow || !selectedTemplateId}
                  >
                    <Plus />
                    {assigningWorkflow ? 'Assigning...' : 'Assign workflow'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {clientWorkflows.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
                <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <GitBranch className="size-5" />
                </div>
                <h2 className="text-base font-semibold text-slate-950">No workflows assigned</h2>
                <p className="max-w-sm text-sm text-slate-500">
                  Assign a compliance or onboarding workflow template to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {clientWorkflows.map((w) => {
                const totalSteps = w.progress?.length || 0;
                const completedSteps =
                  w.progress?.filter(
                    (p) => p.status === 'completed' || p.status === 'skipped'
                  ).length || 0;
                const progressPct =
                  totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
                const categoryColor =
                  WORKFLOW_CATEGORIES.find((c) => c.value === w.template?.category)?.color ||
                  'var(--accent)';

                return (
                  <Card
                    key={w.id}
                    className="overflow-hidden border-l-4"
                    style={{ borderLeftColor: categoryColor }}
                  >
                    <CardContent className="space-y-4 pt-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                              {w.template?.name}
                            </h3>
                            <Badge variant={statusVariant(w.status)} className="capitalize">
                              {w.status.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">
                            {w.template?.description || 'No description provided'}
                          </p>
                        </div>
                        <div className="text-sm text-[var(--text-secondary)]">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {completedSteps} / {totalSteps}
                          </span>{' '}
                          steps completed
                        </div>
                      </div>

                      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
                        <div
                          className="h-full transition-all duration-300"
                          style={{ width: `${progressPct}%`, background: categoryColor }}
                        />
                      </div>

                      <div className="space-y-3">
                        {w.progress?.map((p, index) => {
                          let requiredDocs: string[] = [];
                          try {
                            requiredDocs = JSON.parse(p.step?.required_documents || '[]');
                          } catch {
                            requiredDocs = [];
                          }

                          const docsPresent =
                            requiredDocs.length > 0 &&
                            requiredDocs.every((cat) =>
                              documents.some((doc) =>
                                checkDocumentMatch(cat, {
                                  name: doc.name,
                                  category: doc.category,
                                  ocrMetadata: doc.ocr_metadata,
                                })
                              )
                            );

                          const previousSteps = w.progress?.slice(0, index) || [];
                          const previousCompleted = previousSteps.every(
                            (prev) =>
                              prev.status === 'completed' || prev.status === 'skipped'
                          );

                          let displayStatus: string = p.status;
                          if (p.status !== 'completed' && docsPresent && !previousCompleted) {
                            displayStatus = 'waiting_active';
                          }

                          return (
                            <div
                              key={p.id}
                              className={`flex gap-4 rounded-lg border border-[var(--border-subtle)] p-4 ${
                                p.status === 'completed'
                                  ? 'bg-[var(--bg-primary)]'
                                  : 'bg-[var(--bg-secondary)]'
                              }`}
                            >
                              <div className="shrink-0">
                                <div
                                  className={`flex size-8 items-center justify-center rounded-full text-sm font-bold ${
                                    p.status === 'completed'
                                      ? 'bg-teal-700 text-white'
                                      : 'border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)]'
                                  }`}
                                >
                                  {p.status === 'completed' ? (
                                    <Check className="size-4" />
                                  ) : (
                                    p.step?.step_order || index + 1
                                  )}
                                </div>
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                                  <div>
                                    <h4 className="font-semibold text-[var(--text-primary)]">
                                      {p.step?.name}
                                    </h4>
                                    {p.status === 'completed' && p.completed_at && (
                                      <div className="mt-0.5 text-xs text-[var(--text-muted)]">
                                        Completed on{' '}
                                        {new Date(p.completed_at).toLocaleDateString('en-GB')}
                                      </div>
                                    )}
                                  </div>
                                  {displayStatus === 'waiting_active' ? (
                                    <Badge variant="warning">Waiting for step to become active</Badge>
                                  ) : (
                                    <Badge variant={statusVariant(p.status)} className="capitalize">
                                      {p.status.replace('_', ' ')}
                                    </Badge>
                                  )}
                                </div>

                                {requiredDocs.length > 0 && (
                                  <div className="mb-3 rounded-md bg-[var(--bg-primary)] p-3">
                                    <div className="mb-2 text-xs font-semibold tracking-wide text-[var(--text-secondary)] uppercase">
                                      Required documents
                                    </div>
                                    <div className="space-y-2">
                                      {requiredDocs.map((cat) => {
                                        const uploadedDoc = documents.find((d) =>
                                          checkDocumentMatch(cat, {
                                            name: d.name,
                                            category: d.category,
                                            ocrMetadata: d.ocr_metadata,
                                          })
                                        );
                                        return (
                                          <div
                                            key={cat}
                                            className="flex items-center gap-2.5 text-sm"
                                          >
                                            {uploadedDoc ? (
                                              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                                            ) : (
                                              <Circle className="size-4 shrink-0 text-[var(--text-muted)]" />
                                            )}
                                            <div className="flex flex-1 items-center justify-between gap-2">
                                              <span
                                                className={`font-medium ${
                                                  uploadedDoc
                                                    ? 'text-[var(--text-primary)]'
                                                    : 'text-[var(--text-secondary)]'
                                                }`}
                                              >
                                                {cat}
                                              </span>
                                              {uploadedDoc ? (
                                                <Button
                                                  type="button"
                                                  variant="link"
                                                  size="sm"
                                                  className="h-auto p-0"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveViewDoc(uploadedDoc);
                                                  }}
                                                >
                                                  View
                                                </Button>
                                              ) : (
                                                <span className="text-xs text-amber-700">Missing</span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                <div className="mt-3 flex flex-wrap items-start justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
                                  <div className="flex-1 pr-4 text-sm text-[var(--text-muted)]">
                                    {p.notes ? (
                                      <div className="italic">&quot;{p.notes}&quot;</div>
                                    ) : (
                                      p.step?.description || 'No additional details.'
                                    )}
                                  </div>

                                  {user?.role !== 'client' && p.status !== 'completed' && (
                                    <div>
                                      {p.step?.auto_complete && docsPresent ? (
                                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                                          <Zap className="size-3.5" />
                                          Auto-completes when active
                                        </div>
                                      ) : (
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          onClick={() => handleEditStep(p)}
                                        >
                                          {docsPresent ? (
                                            <>
                                              <Check />
                                              Mark complete
                                            </>
                                          ) : (
                                            <>
                                              <Pencil />
                                              Update status
                                            </>
                                          )}
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {editingStep && (
            <div
              className="modal-backdrop"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
              }}
            >
              <Card className="z-[101] w-full max-w-[440px]">
                <CardHeader>
                  <CardTitle className="text-base">
                    Update step — {editingStep.step?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveStep} className="stack gap-4">
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select
                        value={editStepStatus}
                        onChange={(e) => setEditStepStatus(e.target.value)}
                        className="select"
                      >
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
                        onChange={(e) => setEditStepNotes(e.target.value)}
                        className="textarea"
                        placeholder="Add update notes, links, or issues for this step..."
                      />
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setEditingStep(null)}
                        disabled={savingStep}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary" disabled={savingStep}>
                        {savingStep ? 'Saving...' : 'Save progress'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {activeViewDoc && (
        <DocumentViewerModal
          document={activeViewDoc}
          onClose={() => setActiveViewDoc(null)}
        />
      )}
    </div>
  );
}

export default function ClientDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-center" style={{ minHeight: '50vh' }}>
          <span className="spinner" style={{ width: 40, height: 40 }} />
        </div>
      }
    >
      <ClientDetailPageContent />
    </Suspense>
  );
}
