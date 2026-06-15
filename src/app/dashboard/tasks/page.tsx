'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { TASK_STATUSES, TASK_PRIORITIES } from '@/lib/constants';
import type { Task } from '@/types';

const statusCols = TASK_STATUSES.filter(s => s.value !== 'overdue');
const PAGE_LIMIT = 100;

export default function TasksPage() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', status: 'new', due_date: '', client_id: '' });
  const [clients, setClients] = useState<Array<{ id: string; company_name: string }>>([]);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tasks?limit=${PAGE_LIMIT}`);
        const { data } = await res.json();
        if (!cancelled) setTasks(data || []);
      } catch (err) { console.error(err); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
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
    setForm({ title: '', description: '', priority: 'medium', status: 'new', due_date: '', client_id: '' });
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
      setForm({ title: '', description: '', priority: 'medium', status: 'new', due_date: '', client_id: '' });
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
    if (!confirm('Are you sure you want to delete this task?')) return;
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

  const priorityBadge = (p: string) => {
    const m: Record<string, string> = { low: 'badge-gray', medium: 'badge-blue', high: 'badge-amber', critical: 'badge-red' };
    return m[p] || 'badge-gray';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">{tasks.length} total tasks</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ New Task</button>
      </div>

      {loading ? (
        <div className="kanban-board">{[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 300, minWidth: 280 }} />)}</div>
      ) : (
        <div className="kanban-board">
          {statusCols.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.value);
            return (
              <div key={col.value} className="kanban-column">
                <div className="kanban-column-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                    <span className="kanban-column-title">{col.label}</span>
                  </div>
                  <span className="kanban-column-count">{colTasks.length}</span>
                </div>
                <div className="kanban-cards">
                  {colTasks.map((t) => (
                    <div key={t.id} className="kanban-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div className="kanban-card-title">{t.title}</div>
                        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                          <button type="button" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => handleEditTask(t)}>✏️</button>
                          <button type="button" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }} onClick={() => handleDeleteTask(t.id)}>🗑️</button>
                        </div>
                      </div>
                      {t.client && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                          🏢 {t.client.company_name}
                        </div>
                      )}
                      <div className="kanban-card-meta">
                        <span className={`badge ${priorityBadge(t.priority)}`}>{t.priority}</span>
                        {t.due_date && <span>📅 {new Date(t.due_date).toLocaleDateString()}</span>}
                      </div>
                      {t.description && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>{t.description.substring(0, 80)}</p>}
                      <div style={{ marginTop: 10 }}>
                        <select className="select" style={{ fontSize: '0.75rem', padding: '4px 8px' }} value={t.status} onChange={(e) => updateStatus(t.id, e.target.value)}>
                          {TASK_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                  {colTasks.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No tasks</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editTaskId ? 'Edit Task' : 'New Task'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={saveTask}>
              <div className="modal-body stack">
                <div className="form-group">
                  <label className="form-label">Client <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  {/* Removed 'required' — tasks can exist without a client */}
                  <select className="select" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                    <option value="">No client (internal task)</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. File annual return for Mkhize Holdings" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Details..." />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                      {TASK_PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input className="input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editTaskId ? 'Save Changes' : 'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
