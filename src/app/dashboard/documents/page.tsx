'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DOCUMENT_CATEGORIES } from '@/lib/constants';
import type { Document as Doc } from '@/types';

export default function DocumentsPage() {
  const { tenant, user } = useAuth();
  const supabase = createClient();
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragover, setDragover] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ client_id: '', category: 'other' });
  const [clients, setClients] = useState<Array<{ id: string; company_name: string }>>([]);

  const loadDocs = useCallback(async () => {
    if (!tenant) return;
    let q = supabase.from('documents').select('*, client:clients(id, company_name)').eq('tenant_id', tenant.id).order('created_at', { ascending: false });
    if (filter !== 'all') q = q.eq('category', filter);
    const { data } = await q;
    setDocuments((data as unknown as Doc[]) || []);
    setLoading(false);
  }, [tenant, filter]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  useEffect(() => {
    if (!tenant) return;
    supabase.from('clients').select('id, company_name').eq('tenant_id', tenant.id).then(({ data }) => {
      if (data) setClients(data);
    });
  }, [tenant]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || !tenant || !user || !uploadForm.client_id) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const path = `${tenant.id}/${uploadForm.client_id}/${Date.now()}_${file.name}`;
      const { error: storageError } = await supabase.storage.from('documents').upload(path, file);
      if (storageError) { console.error(storageError); continue; }
      await supabase.from('documents').insert({
        tenant_id: tenant.id, client_id: uploadForm.client_id, name: file.name,
        file_path: path, file_type: file.type, category: uploadForm.category,
        file_size: file.size, uploaded_by: user.id,
      });
    }
    setUploading(false);
    setShowUpload(false);
    loadDocs();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getCatIcon = (cat: string) => DOCUMENT_CATEGORIES.find(c => c.value === cat)?.icon || '📄';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">{documents.length} files stored</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUpload(true)}>📤 Upload</button>
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('all')}>All</button>
        {DOCUMENT_CATEGORIES.map((c) => (
          <button key={c.value} className={`btn btn-sm ${filter === c.value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(c.value)}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="stack">{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 60 }} />)}</div>
      ) : documents.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">📁</div><h3>No documents</h3><p>Upload documents to get started</p></div></div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Name</th><th>Client</th><th>Category</th><th>Size</th><th>Uploaded</th></tr></thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id}>
                  <td><span style={{ marginRight: 8 }}>{getCatIcon(d.category)}</span><span style={{ fontWeight: 500 }}>{d.name}</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{(d.client as unknown as { company_name: string })?.company_name || '—'}</td>
                  <td><span className="badge badge-blue">{d.category.replace('_', ' ')}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{formatSize(d.file_size)}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{new Date(d.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Upload Document</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowUpload(false)}>✕</button>
            </div>
            <div className="modal-body stack">
              <div className="form-group">
                <label className="form-label">Client *</label>
                <select className="select" value={uploadForm.client_id} onChange={(e) => setUploadForm({ ...uploadForm, client_id: e.target.value })}>
                  <option value="">Select client...</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="select" value={uploadForm.category} onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}>
                  {DOCUMENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                </select>
              </div>
              <div className={`upload-zone ${dragover ? 'dragover' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
                onDragLeave={() => setDragover(false)}
                onDrop={(e) => { e.preventDefault(); setDragover(false); handleUpload(e.dataTransfer.files); }}
                onClick={() => fileRef.current?.click()}>
                <div className="upload-icon">{uploading ? '⏳' : '📤'}</div>
                <p style={{ fontWeight: 600, marginBottom: 4 }}>{uploading ? 'Uploading...' : 'Drop files here or click to browse'}</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PDF, JPG, PNG, DOCX up to 10MB</p>
              </div>
              <input ref={fileRef} type="file" multiple hidden onChange={(e) => handleUpload(e.target.files)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
