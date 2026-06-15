'use client';

import React from 'react';
import { Document } from '@/types';

interface DocumentViewerModalProps {
  document: Document;
  onClose: () => void;
}

export default function DocumentViewerModal({ document, onClose }: DocumentViewerModalProps) {
  // Safe extraction of file type and path
  const filePath = document.file_path || (document as unknown as { filePath: string }).filePath;
  const fileType = document.file_type || (document as unknown as { fileType: string }).fileType || '';
  const name = document.name;

  const isPdf = fileType.toLowerCase().includes('pdf') || 
                name.toLowerCase().endsWith('.pdf') || 
                filePath?.toLowerCase().includes('.pdf');

  const isImage = fileType.toLowerCase().startsWith('image/') || 
                  ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].some(ext => name.toLowerCase().endsWith('.' + ext)) ||
                  ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].some(ext => filePath?.toLowerCase().includes('.' + ext));

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
          maxWidth: '1000px',
          height: '85vh',
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
            <h2 className="modal-title" style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>{name}</h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Category: <span className="badge badge-blue" style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>{document.category.replace('_', ' ')}</span>
            </p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a 
              href={filePath} 
              download={name} 
              target="_blank" 
              rel="noreferrer" 
              className="btn btn-secondary btn-sm" 
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              📥 Download
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

        {/* Viewer Area */}
        <div style={{ flex: 1, overflow: 'hidden', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {isPdf ? (
            <iframe 
              src={`${filePath}#toolbar=1`} 
              style={{ width: '100%', height: '100%', border: 'none' }} 
              title={name}
            />
          ) : isImage ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflow: 'auto' }}>
              <img 
                src={filePath} 
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
                  href={filePath} 
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
      </div>
    </div>
  );
}
