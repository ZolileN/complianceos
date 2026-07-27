'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  ArrowLeft,
  Building2,
  Clock,
  Mail,
  MailOpen,
  Reply,
  Send,
  User,
} from 'lucide-react';

import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export type InboundEmailListItem = {
  id: string;
  fromAddress: string;
  subject?: string;
  bodyText?: string;
  status: string;
  receivedAt: string;
  client?: { id: string; company_name: string } | null;
};

type EmailReply = {
  id: string;
  bodyText: string;
  sentAt: string;
  user: { id: string; name: string | null; email: string | null };
};

type InboundEmailDetail = InboundEmailListItem & {
  toAddress?: string;
  bodyHtml?: string | null;
  replies: EmailReply[];
};

type EmailInboxPanelProps = {
  emails: InboundEmailListItem[];
  loading: boolean;
  tenantSlug?: string | null;
  inboundAddress?: string | null;
  onRefresh: () => void;
};

function senderInitial(fromAddress: string) {
  const local = fromAddress.split('@')[0]?.trim();
  return (local?.[0] || '?').toUpperCase();
}

function formatListTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function formatFullTime(ts: string) {
  return new Date(ts).toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function previewText(body?: string | null) {
  if (!body) return 'No message preview';
  const line = body.replace(/\s+/g, ' ').trim();
  return line.length > 90 ? `${line.slice(0, 90)}…` : line;
}

export default function EmailInboxPanel({
  emails,
  loading,
  tenantSlug,
  inboundAddress,
  onRefresh,
}: EmailInboxPanelProps) {
  const { toast } = useToast();
  const [activeEmailId, setActiveEmailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<InboundEmailDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const tenantInboundAddress =
    inboundAddress ||
    (tenantSlug && process.env.NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN
      ? `${tenantSlug}@${process.env.NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN}`
      : null);

  const filteredEmails = emails.filter((em) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      em.fromAddress.toLowerCase().includes(q) ||
      (em.subject || '').toLowerCase().includes(q) ||
      (em.bodyText || '').toLowerCase().includes(q) ||
      em.client?.company_name.toLowerCase().includes(q)
    );
  });

  const selectedEmailId = activeEmailId ?? filteredEmails[0]?.id ?? null;

  const loadDetail = useCallback(
    async (id: string) => {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/emails/${id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load email');
        setDetail(json.data);
        onRefresh();
      } catch (err) {
        toast((err as Error).message || 'Failed to load email', 'error');
      } finally {
        setDetailLoading(false);
      }
    },
    [onRefresh, toast]
  );

  useEffect(() => {
    if (!selectedEmailId) return;
    let cancelled = false;
    (async () => {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/emails/${selectedEmailId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load email');
        if (!cancelled) {
          setDetail(json.data);
          onRefresh();
        }
      } catch (err) {
        if (!cancelled) {
          toast((err as Error).message || 'Failed to load email', 'error');
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedEmailId, onRefresh, toast]);

  const patchStatus = async (status: string) => {
    if (!selectedEmailId) return;
    try {
      const res = await fetch('/api/emails', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedEmailId, status }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Update failed');
      }
      toast(status === 'archived' ? 'Email archived' : 'Status updated', 'success');
      onRefresh();
      if (selectedEmailId) loadDetail(selectedEmailId);
    } catch (err) {
      toast((err as Error).message || 'Update failed', 'error');
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmailId || !replyText.trim()) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/emails/${selectedEmailId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to send reply');
      setReplyText('');
      toast('Reply sent', 'success');
      loadDetail(selectedEmailId);
    } catch (err) {
      toast((err as Error).message || 'Failed to send reply', 'error');
    } finally {
      setReplying(false);
    }
  };

  if (loading) {
    return <div className="skeleton h-[560px] rounded-xl" />;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid min-h-[560px] lg:grid-cols-[340px_1fr]">
        {/* List column */}
        <div className="border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-700">
              <Mail className="size-3.5" />
              Inbound
            </div>
            {tenantInboundAddress ? (
              <p className="mt-1 truncate font-mono text-[11px] text-slate-500">{tenantInboundAddress}</p>
            ) : null}
            <input
              className="input mt-3 w-full text-sm"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            {filteredEmails.length === 0 ? (
              <div className="space-y-2 p-6 text-center text-sm text-slate-500">
                <Mail className="mx-auto size-8 text-slate-300" />
                <p>No inbound emails yet.</p>
                {tenantInboundAddress ? (
                  <p className="text-xs">
                    Send mail to <code className="rounded bg-slate-100 px-1.5 py-0.5">{tenantInboundAddress}</code>
                  </p>
                ) : null}
                {tenantSlug ? (
                  <p className="text-xs text-slate-400">Workspace: {tenantSlug}</p>
                ) : null}
              </div>
            ) : (
              filteredEmails.map((em) => {
                const active = selectedEmailId === em.id;
                const unread = em.status === 'unread';
                return (
                  <button
                    key={em.id}
                    type="button"
                    onClick={() => setActiveEmailId(em.id)}
                    className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                      active ? 'bg-teal-50/80' : ''
                    }`}
                  >
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        active ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {senderInitial(em.fromAddress)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`truncate text-sm ${unread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                          {em.fromAddress}
                        </span>
                        <span className="shrink-0 text-[11px] text-slate-400">{formatListTime(em.receivedAt)}</span>
                      </div>
                      <div className={`truncate text-sm ${unread ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                        {em.subject || '(no subject)'}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-slate-400">{previewText(em.bodyText)}</div>
                    </div>
                    {unread ? <span className="mt-2 size-2 shrink-0 rounded-full bg-teal-500" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Detail column */}
        <div className="flex min-h-[560px] flex-col bg-gradient-to-b from-slate-50/50 to-white">
          {!selectedEmailId || detailLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-slate-400">
              {detailLoading ? (
                <div className="skeleton h-8 w-48 rounded" />
              ) : (
                <>
                  <MailOpen className="size-10 opacity-40" />
                  <p className="text-sm">Select an email to read</p>
                </>
              )}
            </div>
          ) : detail ? (
            <>
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                      {detail.subject || '(no subject)'}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                        <User className="size-3" />
                        {detail.fromAddress}
                      </span>
                      {detail.client ? (
                        <Link
                          href={`/dashboard/clients/${detail.client.id}`}
                          className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs text-teal-800 ring-1 ring-teal-100"
                        >
                          <Building2 className="size-3" />
                          {detail.client.company_name}
                        </Link>
                      ) : null}
                      <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-slate-500 ring-1 ring-slate-200">
                        <Clock className="size-3" />
                        {formatFullTime(detail.receivedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.status !== 'archived' ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => patchStatus('archived')}>
                        <Archive className="size-3.5" />
                        Archive
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" size="sm" onClick={() => patchStatus('read')}>
                        <ArrowLeft className="size-3.5" />
                        Restore
                      </Button>
                    )}
                    {detail.status === 'unread' ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => patchStatus('read')}>
                        <MailOpen className="size-3.5" />
                        Mark read
                      </Button>
                    ) : (
                      <Button type="button" variant="outline" size="sm" onClick={() => patchStatus('unread')}>
                        <Mail className="size-3.5" />
                        Mark unread
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <Card className="border-slate-200 shadow-none">
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                        {senderInitial(detail.fromAddress)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{detail.fromAddress}</div>
                        <div className="text-xs text-slate-500">to {tenantInboundAddress || 'your firm inbox'}</div>
                      </div>
                    </div>
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap text-slate-700">
                      {detail.bodyText || 'No text body'}
                    </div>
                  </CardContent>
                </Card>

                {detail.replies.map((reply) => (
                  <Card key={reply.id} className="ml-6 border-teal-100 bg-teal-50/40 shadow-none">
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-teal-900">
                          {reply.user.name || reply.user.email || 'Your team'}
                          <span className="ml-2 text-xs font-normal text-teal-700">· You replied</span>
                        </div>
                        <span className="text-xs text-teal-600">{formatFullTime(reply.sentAt)}</span>
                      </div>
                      <div className="whitespace-pre-wrap text-sm text-slate-700">{reply.bodyText}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <form
                onSubmit={sendReply}
                className="border-t border-slate-200 bg-white px-5 py-4"
              >
                <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <Reply className="size-3.5" />
                  Reply to {detail.fromAddress}
                </div>
                <div className="flex gap-2">
                  <textarea
                    className="textarea min-h-[88px] flex-1 resize-y text-sm"
                    placeholder="Write your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={replying}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    className="self-end"
                    disabled={replying || !replyText.trim()}
                  >
                    {replying ? <span className="spinner" /> : <Send className="size-4" />}
                    Send
                  </Button>
                </div>
                {tenantInboundAddress ? (
                  <p className="mt-2 text-xs text-slate-400">
                    Replies are sent from your firm address. The recipient can reply back to{' '}
                    <code className="rounded bg-slate-100 px-1">{tenantInboundAddress}</code>.
                  </p>
                ) : null}
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
