'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TASK_STATUSES, TASK_PRIORITIES } from '@/lib/constants';
import type { Task } from '@/types';

const statusCols = TASK_STATUSES.filter(s => s.value !== 'overdue');

export default function TasksPage() {
  const { tenant } = useAuth();
  const supabase = createClient();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', status: 'new', due_date: '' });

  const loadTasks = useCallback(async () => {
    if (!tenant) return;
    const { data } = await supabase.from('tasks').select('*, client:clients(id, company_name)').eq('tenant_id', tenant.id).order('created_at', { ascending: false });
    setTasks((data as unknown as Task[]) || []);
    setLoading(false);
  }, [tenant]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    await supabase.from('tasks').insert({ ...form, tenant_id: tenant.id, due_date: form.due_date || null });
    setShowModal(false);
    setForm({ title: '', description: '', priority: 'medium', status: 'new', due_date: '' });
    loadTasks();
  };

  const updateStatus = async (taskId: string, status: string) => {
    await supabase.from('tasks').update({ status }).eq('id', taskId);
    loadTasks();
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
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Task</button>
      </div>

      {loading ? (
        <div className="kanban-board">{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 300, minWidth: 280 }} />)}</div>
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
                      <div className="kanban-card-title">{t.title}</div>
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

      {/* New Task Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Task</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={createTask}>
              <div className="modal-body stack">
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
                <button type="submit" className="btn btn-primary">Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
