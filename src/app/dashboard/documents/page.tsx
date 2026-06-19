'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { DOCUMENT_CATEGORIES } from '@/lib/constants';
import type { Document as Doc } from '@/types';
import { UploadDropzone } from "@/lib/uploadthing";
import DocumentViewerModal from '@/components/DocumentViewerModal';
import "@uploadthing/react/styles.css";

const PAGE_LIMIT = 20;

export default function DocumentsPage() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [activeViewDoc, setActiveViewDoc] = useState<Doc | null>(null);
  const [uploadForm, setUploadForm] = useState({ client_id: '', category: 'other' });
  const [clients, setClients] = useState<Array<{ id: string; company_name: string }>>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
    setPage(1);
  }, []);

  // Correct effect pattern with cancellation token
  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(PAGE_LIMIT) });
        if (filter !== 'all') params.set('category', filter);
        params.set('_t', Date.now().toString());
        const res = await fetch(`/api/documents?${params}`, { cache: 'no-store' });
        const { data, count } = await res.json();
        if (!cancelled) {
          setDocuments(data || []);
          setTotalCount(count || 0);
        }
      } catch (err) { console.error(err); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [tenant, filter, page, refreshKey]);

  useEffect(() => {
    if (!tenant) return;
    (async () => {
      const res = await fetch('/api/clients?limit=100');
      const { data } = await res.json();
      setClients(data || []);
    })();
  }, [tenant]);

  const handleDeleteDoc = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Document',
      message: 'Are you sure you want to permanently delete this document? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete document');
      toast('Document deleted');
      refresh();
    } catch (err) {
      toast((err as Error).message || 'Failed to delete document', 'error');
    }
  };



  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getCatIcon = (cat: string) => DOCUMENT_CATEGORIES.find(c => c.value === cat)?.icon || '📄';
  const totalPages = Math.ceil(totalCount / PAGE_LIMIT);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">{totalCount} files stored</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUpload(true)}>📤 Upload</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setFilter('all'); setPage(1); }}>All</button>
        {DOCUMENT_CATEGORIES.map((c) => (
          <button key={c.value} className={`btn btn-sm ${filter === c.value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setFilter(c.value); setPage(1); }}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="stack">{[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 60 }} />)}</div>
      ) : documents.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">📁</div><h3>No documents</h3><p>Upload documents to get started</p></div></div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Client</th><th>Category</th><th>Size</th><th>Uploaded</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span style={{ marginRight: 8 }}>{getCatIcon(d.category)}</span>
                      <button 
                        onClick={() => setActiveViewDoc(d)}
                        style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer', fontWeight: 500, color: 'inherit', textAlign: 'left' }}
                      >
                        {d.name}
                      </button>
                      {d.version > 1 && (
                        <span className="badge badge-secondary" style={{ marginLeft: 8, fontSize: '0.7rem', padding: '2px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', borderRadius: 4 }}>
                          v{d.version}
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{(d.client as unknown as { company_name: string })?.company_name || '—'}</td>
                    <td><span className="badge badge-blue">{d.category.replace('_', ' ')}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatSize(d.file_size)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(d.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }} onClick={() => setActiveViewDoc(d)}>View</button>
                        <a href={d.file_path} download={d.name} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', textDecoration: 'none' }}>Download</a>
                        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', color: 'var(--red)' }} onClick={() => handleDeleteDoc(d.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <span className="pagination-info">
                Showing {((page - 1) * PAGE_LIMIT) + 1}–{Math.min(page * PAGE_LIMIT, totalCount)} of {totalCount}
              </span>
              <div className="pagination-controls">
                <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                <span className="pagination-page">{page} / {totalPages}</span>
                <button className="pagination-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              </div>
            </div>
          )}
        </>
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

              <div style={{ marginTop: 16 }}>
                {!uploadForm.client_id ? (
                  <div style={{ padding: 20, textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Please select a client first
                  </div>
                ) : (
                   <UploadDropzone
                    endpoint="documentUploader"
                    onClientUploadComplete={async (res) => {
                      try {
                        for (const file of res) {
                          // ufsUrl is v7's field; fall back to url for older versions
                          const fileUrl = (file as unknown as { ufsUrl?: string }).ufsUrl ?? file.url;
                          await fetch('/api/documents/upload', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              url: fileUrl,
                              name: file.name,
                              size: file.size,
                              type: file.type,
                              client_id: uploadForm.client_id,
                              category: uploadForm.category
                            })
                          });
                        }
                        toast(`${res.length} document${res.length > 1 ? 's' : ''} uploaded successfully`);
                        refresh();
                      } catch (err) {
                        console.error("Document registration failed:", err);
                        toast(err instanceof Error ? err.message : 'Failed to register document', 'error');
                      } finally {
                        setShowUpload(false);
                      }
                    }}
                    onUploadError={(error: Error) => {
                      toast(`Upload failed: ${error.message}`, 'error');
                      setShowUpload(false);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
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
