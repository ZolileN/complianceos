'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Building2,
  CalendarDays,
  CheckSquare,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { TASK_STATUSES, TASK_PRIORITIES } from '@/lib/constants';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Task } from '@/types';

type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'outline';

const statusCols = TASK_STATUSES.filter((s) => s.value !== 'overdue');
const PAGE_LIMIT = 100;

function priorityVariant(p: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    low: 'outline',
    medium: 'info',
    high: 'warning',
    critical: 'destructive',
  };
  return map[p] || 'default';
}

export default function TasksPage() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'new',
    due_date: '',
    client_id: '',
  });
  const [clients, setClients] = useState<Array<{ id: string; company_name: string }>>([]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tasks?limit=${PAGE_LIMIT}`);
        const { data } = await res.json();
        if (!cancelled) setTasks(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant, refreshKey]);

  useEffect(() => {
    if (!tenant) return;
    (async () => {
      const res = await fetch('/api/clients?limit=100');
      const { data } = await res.json();
      setClients(data || []);
    })();
  }, [tenant]);

  const openNew = () => {
    setEditTaskId(null);
    setForm({
      title: '',
      description: '',
      priority: 'medium',
      status: 'new',
      due_date: '',
      client_id: '',
    });
    setShowModal(true);
  };

  const saveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    try {
      const url = editTaskId ? `/api/tasks/${editTaskId}` : '/api/tasks';
      const method = editTaskId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, due_date: form.due_date || null }),
      });
      if (!res.ok) throw new Error('Failed to save task');
      setShowModal(false);
      setForm({
        title: '',
        description: '',
        priority: 'medium',
        status: 'new',
        due_date: '',
        client_id: '',
      });
      setEditTaskId(null);
      toast(editTaskId ? 'Task updated successfully' : 'Task created successfully');
      refresh();
    } catch (err) {
      toast((err as Error).message || 'Failed to save task', 'error');
    }
  };

  const handleEditTask = (task: Task) => {
    setEditTaskId(task.id);
    setForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      due_date: task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : '',
      client_id: task.client?.id || '',
    });
    setShowModal(true);
  };

  const handleDeleteTask = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Task',
      message:
        'Are you sure you want to permanently delete this task? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete task');
      toast('Task deleted');
      refresh();
    } catch (err) {
      toast((err as Error).message || 'Failed to delete task', 'error');
    }
  };

  const updateStatus = async (taskId: string, status: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      toast('Status updated', 'info');
      refresh();
    } catch (err) {
      toast((err as Error).message || 'Failed to update status', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        eyebrow={
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
            <CheckSquare className="size-3.5" />
            Operations
          </div>
        }
        title="Tasks"
        description={`${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'} across your board`}
        actions={
          <Button variant="primary" onClick={openNew}>
            <Plus />
            New task
          </Button>
        }
      />

      {loading ? (
        <div className="kanban-board">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-[300px] min-w-[280px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="kanban-board">
          {statusCols.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.value);
            return (
              <div key={col.value} className="kanban-column">
                <div className="kanban-column-header">
                  <div className="flex items-center gap-2">
                    <div
                      className="size-2 rounded-full"
                      style={{ background: col.color }}
                    />
                    <span className="kanban-column-title">{col.label}</span>
                  </div>
                  <span className="kanban-column-count">{colTasks.length}</span>
                </div>
                <div className="kanban-cards">
                  {colTasks.map((t) => (
                    <Card key={t.id} className="kanban-card border-0 p-0 shadow-none">
                      <CardContent className="space-y-2 p-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-semibold text-[var(--text-primary)]">
                            {t.title}
                          </div>
                          <div className="flex shrink-0 gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => handleEditTask(t)}
                              aria-label="Edit task"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteTask(t.id)}
                              aria-label="Delete task"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                        {t.client && (
                          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                            <Building2 className="size-3" />
                            {t.client.company_name}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={priorityVariant(t.priority)} className="capitalize">
                            {t.priority}
                          </Badge>
                          {t.due_date && (
                            <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                              <CalendarDays className="size-3" />
                              {new Date(t.due_date).toLocaleDateString('en-GB')}
                            </span>
                          )}
                        </div>
                        {t.description && (
                          <p className="text-xs text-[var(--text-muted)]">
                            {t.description.substring(0, 80)}
                          </p>
                        )}
                        <select
                          className="select text-xs"
                          style={{ padding: '4px 8px' }}
                          value={t.status}
                          onChange={(e) => updateStatus(t.id, e.target.value)}
                        >
                          {TASK_STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </CardContent>
                    </Card>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="px-5 py-8 text-center text-xs text-[var(--text-muted)]">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editTaskId ? 'Edit task' : 'New task'}</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                <X />
              </Button>
            </div>
            <form onSubmit={saveTask}>
              <div className="modal-body stack">
                <div className="form-group">
                  <label className="form-label">
                    Client{' '}
                    <span className="font-normal text-[var(--text-muted)]">(optional)</span>
                  </label>
                  <select
                    className="select"
                    value={form.client_id}
                    onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                  >
                    <option value="">No client (internal task)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input
                    className="input"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. File annual returns"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="textarea"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Details..."
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select
                      className="select"
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    >
                      {TASK_PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due date</label>
                    <input
                      className="input"
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {editTaskId ? 'Save changes' : 'Create task'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
