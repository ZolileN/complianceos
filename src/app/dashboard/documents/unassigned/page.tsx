'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, FileText, Link2, Loader2 } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import DocumentViewerModal from '@/components/DocumentViewerModal';
import type { Document as Doc } from '@/types';

type UnassignedDoc = {
  id: string;
  name: string;
  category: string;
  file_path: string;
  file_type?: string | null;
  ocr_status: string;
  created_at: string;
  from_address?: string;
  subject?: string;
  received_at?: string;
};

type ClientOption = {
  id: string;
  company_name: string;
};

export default function UnassignedDocumentsPage() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [docs, setDocs] = useState<UnassignedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [selectedClientByDoc, setSelectedClientByDoc] = useState<Record<string, string>>({});
  const [activeDoc, setActiveDoc] = useState<Doc | null>(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents/unassigned');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load queue');
      setDocs(json.data || []);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to load queue', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!tenant) return;
    const id = window.setTimeout(() => {
      void loadDocs();
    }, 0);
    return () => window.clearTimeout(id);
  }, [tenant, loadDocs]);

  useEffect(() => {
    const q = clientSearch.trim();
    const timer = setTimeout(async () => {
      if (q.length < 2) {
        setClientOptions([]);
        return;
      }
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(q)}&limit=15`);
        const json = await res.json();
        setClientOptions(
          (json.data || []).map((c: { id: string; company_name: string }) => ({
            id: c.id,
            company_name: c.company_name,
          }))
        );
      } catch {
        setClientOptions([]);
      }
    }, q.length < 2 ? 0 : 300);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  const assignDoc = async (docId: string) => {
    const clientId = selectedClientByDoc[docId];
    if (!clientId) {
      toast('Select a client to assign this document.', 'error');
      return;
    }
    setAssigningId(docId);
    try {
      const res = await fetch(`/api/documents/${docId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Assign failed');
      toast(`Assigned to ${json.data.client_name}`, 'success');
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Assign failed', 'error');
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Unassigned documents"
        description="SARS PDFs received by email that could not be matched to a client automatically."
        helpSlug="sars-document-intelligence"
        helpLabel="Unassigned documents"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/documents">All documents</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/inbox">Email inbox</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-teal-600" />
        </div>
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <FileText className="size-10 text-slate-300" />
            <p className="text-sm text-slate-600">No unassigned SARS documents in the queue.</p>
            <p className="text-xs text-slate-400">
              PDF attachments from unmatched inbound emails appear here after automatic processing.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  {['Document', 'From', 'OCR', 'Assign to client', 'Actions'].map((label) => (
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
                {docs.map((doc) => (
                  <tr key={doc.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        className="text-left text-sm font-medium text-slate-900 hover:text-teal-700"
                        onClick={() =>
                          setActiveDoc({
                            id: doc.id,
                            name: doc.name,
                            category: doc.category,
                            file_path: doc.file_path,
                            file_type: doc.file_type || undefined,
                            created_at: doc.created_at,
                            client_id: '',
                            tenant_id: tenant?.id || '',
                            version: 1,
                            ocr_status: doc.ocr_status,
                          } as Doc)
                        }
                      >
                        {doc.name}
                      </button>
                      <div className="mt-1">
                        <Badge variant="info" className="capitalize">
                          {doc.category.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      <div>{doc.from_address || '—'}</div>
                      <div className="text-xs text-slate-400">{doc.subject || '(no subject)'}</div>
                    </td>
                    <td className="px-4 py-3.5 text-sm capitalize text-slate-600">
                      {doc.ocr_status.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3.5">
                      <input
                        className="input mb-2 w-full text-sm"
                        placeholder="Search clients…"
                        value={selectedClientByDoc[`search-${doc.id}`] ?? ''}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          setSelectedClientByDoc((prev) => ({
                            ...prev,
                            [`search-${doc.id}`]: e.target.value,
                          }));
                        }}
                      />
                      <select
                        className="input w-full text-sm"
                        value={selectedClientByDoc[doc.id] || ''}
                        onChange={(e) =>
                          setSelectedClientByDoc((prev) => ({
                            ...prev,
                            [doc.id]: e.target.value,
                          }))
                        }
                      >
                        <option value="">Select client…</option>
                        {clientOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.company_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3.5">
                      <Button
                        size="sm"
                        disabled={assigningId === doc.id}
                        onClick={() => assignDoc(doc.id)}
                      >
                        {assigningId === doc.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Link2 className="size-4" />
                        )}
                        Assign
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {docs.length > 0 ? (
        <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <AlertCircle className="size-3.5" />
          Review OCR results after assigning — approve extracted fields on the client documents tab.
        </p>
      ) : null}

      {activeDoc ? (
        <DocumentViewerModal document={activeDoc} onClose={() => setActiveDoc(null)} />
      ) : null}
    </div>
  );
}
