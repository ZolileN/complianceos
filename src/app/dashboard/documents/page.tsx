'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DOCUMENT_CATEGORIES } from '@/lib/constants';
import type { Document as Doc } from '@/types';
import { UploadDropzone } from "@/lib/uploadthing";
import "@uploadthing/react/styles.css";

export default function DocumentsPage() {
  const { tenant } = useAuth();
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadForm, setUploadForm] = useState({ client_id: '', category: 'other' });
  const [clients, setClients] = useState<Array<{ id: string; company_name: string }>>([]);

  const loadDocs = useCallback(async () => {
    if (!tenant) return;
    try {
      const url = filter === 'all' ? '/api/documents' : `/api/documents?category=${filter}`;
      const res = await fetch(url);
      if (res.ok) {
        const { data } = await res.json();
        setDocuments(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tenant, filter]);

  useEffect(() => {
    const init = async () => {
      await loadDocs();
    };
    init();
  }, [loadDocs]);

  useEffect(() => {
    if (!tenant) return;
    fetch('/api/clients?limit=100')
      .then(res => res.json())
      .then(({ data }) => setClients(data || []));
  }, [tenant]);

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
                  <td><span style={{ marginRight: 8 }}>{getCatIcon(d.category)}</span><a href={d.file_path} target="_blank" rel="noreferrer" style={{ fontWeight: 500, color: 'inherit', textDecoration: 'none' }}>{d.name}</a></td>
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
              
              <div style={{ marginTop: 16 }}>
                {!uploadForm.client_id ? (
                  <div style={{ padding: 20, textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Please select a client first
                  </div>
                ) : (
                  <UploadDropzone
                    endpoint="documentUploader"
                    onClientUploadComplete={async (res) => {
                      // Do something with the response
                      for (const file of res) {
                        await fetch('/api/documents/upload', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            url: file.url,
                            name: file.name,
                            size: file.size,
                            type: file.type,
                            client_id: uploadForm.client_id,
                            category: uploadForm.category
                          })
                        });
                      }
                      setShowUpload(false);
                      loadDocs();
                    }}
                    onUploadError={(error: Error) => {
                      alert(`ERROR! ${error.message}`);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
