'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, FolderOpen, Upload, X } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { DOCUMENT_CATEGORIES } from '@/lib/constants';
import type { Document as Doc } from '@/types';
import { UploadDropzone } from '@/lib/uploadthing';
import DocumentViewerModal from '@/components/DocumentViewerModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import '@uploadthing/react/styles.css';

const PAGE_LIMIT = 20;

// ── File size constants ─────────────────────────────────────────────────────────
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB hard limit
const IMAGE_MAX_DIMENSION = 2048;              // px — max side length after resize
const IMAGE_JPEG_QUALITY  = 0.85;             // 85% JPEG quality

/**
 * Compress an image file client-side using the Canvas API.
 * - Resizes to at most IMAGE_MAX_DIMENSION x IMAGE_MAX_DIMENSION (preserving AR)
 * - Re-encodes as JPEG at IMAGE_JPEG_QUALITY
 * - Returns the original file unchanged if it is not a raster image or
 *   if the browser Canvas API is unavailable (SSR guard).
 */
async function compressImageFile(file: File): Promise<File> {
  // Only process raster images (skip SVG, PDF, Word, etc.)
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;
  // SSR guard — Canvas is not available on the server
  if (typeof window === 'undefined' || typeof document === 'undefined') return file;

  return new Promise<File>((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;

      // Calculate new dimensions (scale down if either side exceeds the max)
      let newW = w;
      let newH = h;
      if (w > IMAGE_MAX_DIMENSION || h > IMAGE_MAX_DIMENSION) {
        const ratio = Math.min(IMAGE_MAX_DIMENSION / w, IMAGE_MAX_DIMENSION / h);
        newW = Math.round(w * ratio);
        newH = Math.round(h * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width  = newW;
      canvas.height = newH;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, newW, newH);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          // Keep the original filename but force .jpg extension for compressed output
          const newName = file.name.replace(/\.[^.]+$/, '.jpg');
          resolve(new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() }));
        },
        'image/jpeg',
        IMAGE_JPEG_QUALITY
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

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
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
            <FolderOpen className="size-3.5" />
            Files
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">Documents</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {totalCount} {totalCount === 1 ? 'file' : 'files'} stored
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowUpload(true)}>
          <Upload />
          Upload
        </Button>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={filter === 'all' ? 'primary' : 'secondary'}
          onClick={() => {
            setFilter('all');
            setPage(1);
          }}
        >
          All
        </Button>
        {DOCUMENT_CATEGORIES.map((c) => (
          <Button
            key={c.value}
            size="sm"
            variant={filter === c.value ? 'primary' : 'secondary'}
            onClick={() => {
              setFilter(c.value);
              setPage(1);
            }}
          >
            {c.icon} {c.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-14" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <FolderOpen className="size-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-950">No documents</h2>
            <p className="text-sm text-slate-500">Upload documents to get started</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    {['Name', 'Client', 'Category', 'Size', 'Uploaded', 'Actions'].map((label) => (
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
                        <span className="mr-2">{getCatIcon(d.category)}</span>
                        <button
                          type="button"
                          onClick={() => setActiveViewDoc(d)}
                          className="text-sm font-medium text-slate-900 hover:text-teal-700"
                        >
                          {d.name}
                        </button>
                        {d.version > 1 && (
                          <Badge variant="outline" className="ml-2">
                            v{d.version}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">
                        {(d.client as unknown as { company_name: string })?.company_name || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="info" className="capitalize">
                          {d.category.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">
                        {formatSize(d.file_size)}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">
                        {new Date(d.created_at).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setActiveViewDoc(d)}>
                            View
                          </Button>
                          <Button asChild variant="ghost" size="sm">
                            <a
                              href={d.file_path}
                              download={d.name}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Download
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteDoc(d.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-slate-500">
                Showing {(page - 1) * PAGE_LIMIT + 1}–{Math.min(page * PAGE_LIMIT, totalCount)} of{' '}
                {totalCount}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft />
                </Button>
                <span className="text-sm text-slate-600">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Upload document</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowUpload(false)}
                aria-label="Close"
              >
                <X />
              </Button>
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
                  <>
                    {/* Upload limits hint banner */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 12px',
                      marginBottom: 12,
                      background: 'rgba(59, 130, 246, 0.07)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)'
                    }}>
                      <span style={{ fontSize: '1rem' }}>📎</span>
                      <span>
                        Max <strong>15 MB</strong> per file &nbsp;·&nbsp; Images are <strong>auto-compressed</strong> before upload &nbsp;·&nbsp; Up to <strong>5 files</strong>
                      </span>
                    </div>
                   <UploadDropzone
                    endpoint="documentUploader"
                    onBeforeUploadBegin={async (files) => {
                      // 1. Enforce 15 MB hard limit before anything hits UploadThing
                      const oversized = files.filter(f => f.size > MAX_FILE_SIZE_BYTES);
                      if (oversized.length > 0) {
                        toast(
                          `File${oversized.length > 1 ? 's' : ''} too large: ${
                            oversized.map(f => `"${f.name}" (${(f.size / 1024 / 1024).toFixed(1)} MB)`).join(', ')
                          }. Maximum is 15 MB per file.`,
                          'error'
                        );
                        // Return only the valid files (or empty array to abort)
                        const valid = files.filter(f => f.size <= MAX_FILE_SIZE_BYTES);
                        if (valid.length === 0) return [];
                      }
                      // 2. Compress images using Canvas API before upload
                      const processed = await Promise.all(
                        files
                          .filter(f => f.size <= MAX_FILE_SIZE_BYTES)
                          .map(async (f) => {
                            if (f.type.startsWith('image/') && f.type !== 'image/svg+xml') {
                              const compressed = await compressImageFile(f);
                              const savedMB = ((f.size - compressed.size) / 1024 / 1024).toFixed(1);
                              if (compressed.size < f.size) {
                                console.log(`[Upload] Compressed "${f.name}": ${(f.size/1024/1024).toFixed(1)} MB → ${(compressed.size/1024/1024).toFixed(1)} MB (saved ${savedMB} MB)`);
                              }
                              return compressed;
                            }
                            return f;
                          })
                      );
                      return processed;
                    }}
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
                  </>
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
