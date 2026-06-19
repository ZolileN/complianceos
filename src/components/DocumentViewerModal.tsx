'use client';

import React, { useEffect, useState } from 'react';
import { Document } from '@/types';
import { useToast } from '@/contexts/ToastContext';

interface DocumentViewerModalProps {
  document: Document;
  onClose: () => void;
}

export default function DocumentViewerModal({ document: initialDoc, onClose }: DocumentViewerModalProps) {
  const { toast } = useToast();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'ocr' | 'versions'>('details');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [viewingVersionNum, setViewingVersionNum] = useState<number | null>(null);
  const [approvingOcr, setApprovingOcr] = useState(false);
  const [ocrApproved, setOcrApproved] = useState(false);

  // Fetch full details of the document including versions and OCR data
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/documents/${initialDoc.id}`);
        if (!res.ok) throw new Error('Failed to load document details');
        const json = await res.json();
        if (active && json.data) {
          setDoc(json.data);
          const initialUrl = json.data.file_path || json.data.filePath;
          setPreviewUrl(initialUrl);
          setViewingVersionNum(json.data.version);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setDoc(initialDoc);
          setPreviewUrl(initialDoc.file_path || (initialDoc as any).filePath);
          setViewingVersionNum(initialDoc.version);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [initialDoc]);

  // Polling for OCR processing status if it is processing
  useEffect(() => {
    if (!doc || doc.ocr_status !== 'processing') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/documents/${doc.id}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.ocr_status !== 'processing') {
            setDoc(json.data);
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [doc]);

  if (!doc) {
    return (
      <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
        <div className="modal" style={{ padding: 24, textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-lg)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px', width: 30, height: 30, borderRadius: '50%', border: '3px solid var(--border-primary)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }}></div>
          <p>Loading document details...</p>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}} />
        </div>
      </div>
    );
  }

  const name = doc.name;
  const isPdf = previewUrl.toLowerCase().includes('pdf') || 
                name.toLowerCase().endsWith('.pdf') || 
                previewUrl.toLowerCase().includes('.pdf');

  const isImage = previewUrl.toLowerCase().includes('image/') || 
                  ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].some(ext => name.toLowerCase().endsWith('.' + ext)) ||
                  ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].some(ext => previewUrl.toLowerCase().includes('.' + ext));

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const handleApproveOcr = async () => {
    try {
      setApprovingOcr(true);
      const res = await fetch(`/api/documents/${doc.id}/ocr/approve`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to approve OCR data');
      }
      setOcrApproved(true);
      toast('OCR data successfully synced to client profile!', 'success');
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setApprovingOcr(false);
    }
  };

  // Parse metadata safely
  let ocrMeta: Record<string, string> = {};
  if (doc.ocr_metadata) {
    try {
      ocrMeta = typeof doc.ocr_metadata === 'string' ? JSON.parse(doc.ocr_metadata) : doc.ocr_metadata;
    } catch (e) {
      console.error("Error parsing ocr_metadata", e);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <div 
        className="modal animate-in" 
        onClick={(e) => e.stopPropagation()} 
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          borderRadius: 'var(--radius-xl)',
          width: '95vw',
          maxWidth: '1200px',
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0
        }}
      >
        {/* Header */}
        <div 
          style={{ 
            padding: '16px 24px', 
            borderBottom: '1px solid var(--border-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 className="modal-title" style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>{name}</h2>
              {viewingVersionNum !== null && viewingVersionNum !== doc.version && (
                <span className="badge badge-yellow" style={{ fontSize: '0.7rem' }}>
                  Viewing Version v{viewingVersionNum} (Historical)
                </span>
              )}
              {viewingVersionNum === doc.version && doc.version > 1 && (
                <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                  Viewing Version v{doc.version} (Active)
                </span>
              )}
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Category: <span className="badge badge-blue" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>{doc.category.replace('_', ' ')}</span>
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a 
              href={previewUrl} 
              download={name} 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-secondary btn-sm" 
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              📥 Download This File
            </a>
            <button 
              className="btn btn-ghost btn-icon" 
              onClick={onClose} 
              style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body Container (Split View) */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* Left Side: Preview Area (65% width) */}
          <div style={{ flex: 1.8, overflow: 'hidden', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            {isPdf ? (
              <iframe 
                src={`${previewUrl}#toolbar=1`} 
                style={{ width: '100%', height: '100%', border: 'none' }} 
                title={name}
              />
            ) : isImage ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflow: 'auto' }}>
                <img 
                  src={previewUrl} 
                  alt={name} 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: '100%', 
                    objectFit: 'contain', 
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                  }} 
                />
              </div>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }} className="stack">
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>📁</div>
                <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: 8 }}>Preview Not Available</h3>
                <p style={{ maxWidth: 300, margin: '0 auto 20px', fontSize: '0.9rem' }}>
                  This file format cannot be rendered directly in the browser. Please download it to view the contents.
                </p>
                <div>
                  <a 
                    href={previewUrl} 
                    download={name} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                  >
                    📥 Download {name.split('.').pop()?.toUpperCase()} File
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Right Side: Side Panel (35% width) */}
          <div 
            style={{ 
              width: '380px', 
              borderLeft: '1px solid var(--border-primary)', 
              display: 'flex', 
              flexDirection: 'column', 
              background: 'var(--bg-secondary)',
              overflow: 'hidden'
            }}
          >
            {/* Tabs Header */}
            <div 
              style={{ 
                display: 'flex', 
                borderBottom: '1px solid var(--border-primary)',
                background: 'var(--bg-primary)'
              }}
            >
              {(['details', 'ocr', 'versions'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    padding: '12px 8px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
                    color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: activeTab === tab ? 600 : 500,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    textTransform: 'capitalize'
                  }}
                >
                  {tab === 'ocr' ? 'OCR Analysis' : tab === 'versions' ? `Versions (${1 + (doc.versions?.length || 0)})` : tab}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              
              {/* Tab 1: Details */}
              {activeTab === 'details' && (
                <div className="stack" style={{ gap: 16 }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Document Name</h4>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{doc.name}</p>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client Company</h4>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{doc.client?.company_name || '—'}</p>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</h4>
                    <span className="badge badge-blue" style={{ textTransform: 'capitalize', fontSize: '0.8rem' }}>{doc.category.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Version</h4>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}>v{doc.version}</p>
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>File Size</h4>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{formatSize(doc.file_size)}</p>
                  </div>
                  {doc.uploader && (
                    <div>
                      <h4 style={{ margin: '0 0 4px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Uploaded By</h4>
                      <p style={{ margin: 0, fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{doc.uploader.full_name || doc.uploader.email}</p>
                    </div>
                  )}
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Upload Date</h4>
                    <p style={{ margin: 0, fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{new Date(doc.created_at).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Tab 2: OCR Analysis */}
              {activeTab === 'ocr' && (
                <div className="stack" style={{ gap: 16 }}>
                  {loading ? (
                    <div style={{ padding: 40, textAlign: 'center' }}>
                      <div className="spinner" style={{ margin: '0 auto 12px', width: 30, height: 30, borderRadius: '50%', border: '3px solid var(--border-primary)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }}></div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading OCR data...</p>
                    </div>
                  ) : doc.ocr_status === 'none' ? (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
                      <span style={{ fontSize: '2rem' }}>🔍</span>
                      <p style={{ fontSize: '0.9rem', marginTop: 12 }}>No OCR analyzer run for this document category.</p>
                    </div>
                  ) : doc.ocr_status === 'pending' || doc.ocr_status === 'processing' ? (
                    <div style={{ textAlign: 'center', padding: '40px 10px' }}>
                      <div className="spinner-glow" style={{ width: '36px', height: '36px', margin: '0 auto 16px', borderRadius: '50%', border: '3px solid var(--border-primary)', borderTopColor: 'var(--primary)', animation: 'spin 1s linear infinite' }}></div>
                      <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem' }}>Extracting Text & Entities</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '240px', margin: '0 auto' }}>
                        Document is being scanned by our AI OCR service. This takes about 3 seconds...
                      </p>
                    </div>
                  ) : doc.ocr_status === 'failed' ? (
                    <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--red)' }}>
                      <span style={{ fontSize: '2rem' }}>⚠️</span>
                      <p style={{ fontSize: '0.9rem', marginTop: 12 }}>OCR extraction failed for this document.</p>
                    </div>
                  ) : (
                    // Completed status
                    <div className="stack" style={{ gap: 20 }}>
                      
                      {/* Extracted Metadata Fields */}
                      <div>
                        <h4 style={{ margin: '0 0 8px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Detected Metadata</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {Object.keys(ocrMeta).length === 0 ? (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>No structured fields detected.</p>
                          ) : (
                            Object.entries(ocrMeta).map(([key, val]) => (
                              <div 
                                key={key} 
                                style={{ 
                                  background: 'var(--bg-primary)', 
                                  border: '1px solid var(--border-primary)', 
                                  borderRadius: 'var(--radius-sm)', 
                                  padding: '8px 12px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 2
                                }}
                              >
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                  {key.replace('_', ' ')}
                                </span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                                  {val}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Sync/Approve action if relevant fields exist */}
                      {(ocrMeta.vat_number || ocrMeta.registration_number || ocrMeta.tax_number) && (
                        <div 
                          style={{ 
                            background: 'rgba(59, 130, 246, 0.08)', 
                            border: '1px solid rgba(59, 130, 246, 0.2)', 
                            borderRadius: 'var(--radius-md)', 
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8
                          }}
                        >
                          <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-secondary)' }}>
                            Sync the extracted fields (VAT, registration, or tax numbers) directly to the client's profile in our database.
                          </p>
                          <button
                            onClick={handleApproveOcr}
                            disabled={approvingOcr || ocrApproved}
                            className={`btn btn-sm ${ocrApproved ? 'btn-secondary' : 'btn-primary'}`}
                            style={{ width: '100%', justifyContent: 'center' }}
                          >
                            {approvingOcr ? 'Syncing...' : ocrApproved ? '✓ Synced to Profile' : 'Sync to Client Profile'}
                          </button>
                        </div>
                      )}

                      {/* Raw Extracted Text */}
                      <div>
                        <h4 style={{ margin: '0 0 8px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Extracted Raw Text</h4>
                        <pre 
                          style={{ 
                            background: 'var(--bg-primary)', 
                            border: '1px solid var(--border-primary)', 
                            borderRadius: 'var(--radius-md)', 
                            padding: '12px',
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            whiteSpace: 'pre-wrap',
                            maxHeight: '220px',
                            overflowY: 'auto',
                            margin: 0
                          }}
                        >
                          {doc.ocr_text || 'No text extracted.'}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Versions */}
              {activeTab === 'versions' && (
                <div className="stack" style={{ gap: 16 }}>
                  
                  {/* Current Active Version */}
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Version</h4>
                    <div 
                      onClick={() => {
                        setPreviewUrl(doc.file_path || (doc as any).filePath);
                        setViewingVersionNum(doc.version);
                      }}
                      style={{ 
                        background: viewingVersionNum === doc.version ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-primary)', 
                        border: viewingVersionNum === doc.version ? '1.5px solid var(--primary)' : '1px solid var(--border-primary)', 
                        borderRadius: 'var(--radius-md)', 
                        padding: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div className="stack" style={{ gap: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Version v{doc.version} (Latest)</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                      <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>Active</span>
                    </div>
                  </div>

                  {/* Historical Versions */}
                  <div>
                    <h4 style={{ margin: '0 0 8px', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Previous Versions</h4>
                    {!doc.versions || doc.versions.length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0', margin: 0 }}>
                        No older versions exist for this document.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {doc.versions.map((ver) => (
                          <div 
                            key={ver.id}
                            onClick={() => {
                              setPreviewUrl(ver.file_path);
                              setViewingVersionNum(ver.version);
                            }}
                            style={{ 
                              background: viewingVersionNum === ver.version ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-primary)', 
                              border: viewingVersionNum === ver.version ? '1.5px solid var(--primary)' : '1px solid var(--border-primary)', 
                              borderRadius: 'var(--radius-md)', 
                              padding: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 2,
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Version v{ver.version}</span>
                              <a 
                                href={ver.file_path} 
                                download={`${name}_v${ver.version}`}
                                onClick={(e) => e.stopPropagation()} 
                                style={{ fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}
                              >
                                Download
                              </a>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {formatSize(ver.file_size)} • {new Date(ver.created_at).toLocaleDateString()}
                            </span>
                            {ver.uploader && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                Uploaded by: {ver.uploader.full_name || ver.uploader.email}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      
      {/* Keyframe animation for spinner-glow */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
