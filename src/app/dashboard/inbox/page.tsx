'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Archive,
  ArchiveRestore,
  Download,
  FileText,
  Mail,
  MessageSquareText,
  Plug,
  Send,
  Settings,
  UserCheck,
} from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { DOCUMENT_CATEGORIES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import EmailInboxPanel from '@/components/inbox/EmailInboxPanel';
import type { Conversation, Message } from '@/types';

function getRelativeDateText(msgDateStr: string) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (msgDateStr === today) return 'Today';
  if (msgDateStr === yesterday) return 'Yesterday';
  return new Date(msgDateStr).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function clientName(conversation?: Conversation | null) {
  return (conversation?.client as unknown as { company_name?: string })?.company_name;
}

type StatusFilter = 'open' | 'closed' | 'archived' | 'all';
type Channel = 'whatsapp' | 'email';

type InboundEmail = {
  id: string;
  fromAddress: string;
  subject?: string;
  bodyText?: string;
  status: string;
  receivedAt: string;
  client?: { id: string; company_name: string } | null;
};

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
];

function clientId(conversation?: Conversation | null) {
  return (conversation?.client as unknown as { id?: string })?.id;
}

export default function InboxPage() {
  const { tenant, user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [emailLoading, setEmailLoading] = useState(false);
  const [convoRefreshKey, setConvoRefreshKey] = useState(0);
  const [emailRefreshKey, setEmailRefreshKey] = useState(0);
  const [msgRefreshKey, setMsgRefreshKey] = useState(0);
  const [whatsappConnected, setWhatsappConnected] = useState<boolean | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [emails, setEmails] = useState<InboundEmail[]>([]);
  const [inboundAddress, setInboundAddress] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!tenant) return;
    fetch('/api/settings/whatsapp/status')
      .then((res) => res.json())
      .then((data) => {
        setWhatsappConnected(data.connected);
      })
      .catch(() => setWhatsappConnected(false));
  }, [tenant]);

  useEffect(() => {
    if (!tenant || channel !== 'whatsapp') return;
    let cancelled = false;
    (async () => {
      if (convoRefreshKey === 0) setLoading(true);
      try {
        const params = new URLSearchParams();
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (debouncedQuery) params.set('q', debouncedQuery);
        const qs = params.toString();
        const res = await fetch(`/api/conversations${qs ? `?${qs}` : ''}`);
        const { data } = await res.json();
        if (!cancelled) setConversations(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tenant, channel, convoRefreshKey, statusFilter, debouncedQuery]);

  useEffect(() => {
    if (!tenant || channel !== 'email') return;
    let cancelled = false;
    (async () => {
      if (emailRefreshKey === 0) setEmailLoading(true);
      try {
        const params = new URLSearchParams({ status: 'all' });
        const res = await fetch(`/api/emails?${params}`);
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || 'Failed to load emails');
        }
        if (!cancelled) {
          setEmails(json.data || []);
          setInboundAddress(json.inboundAddress || null);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          toast((err as Error).message || 'Failed to load emails', 'error');
        }
      } finally {
        if (!cancelled) setEmailLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // toast is stable from ToastContext; omit to avoid refetch loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant, channel, emailRefreshKey]);

  const lastConvoRef = useRef<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeConvo) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/messages?conversation_id=${activeConvo}`);
        const { data } = await res.json();
        if (!cancelled) {
          setMessages((prev) => {
            const isNewConvo = lastConvoRef.current !== activeConvo;
            const hasNewMessage = data && data.length > prev.length;
            const lastMessageIsOutbound =
              data && data.length > 0 && data[data.length - 1].direction === 'outbound';

            let shouldScroll = false;
            if (isNewConvo || lastMessageIsOutbound) {
              shouldScroll = true;
            } else if (hasNewMessage) {
              if (chatContainerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
                if (scrollHeight - scrollTop - clientHeight < 250) {
                  shouldScroll = true;
                }
              } else {
                shouldScroll = true;
              }
            }

            if (shouldScroll) {
              setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ block: 'end' });
              }, 50);
            }

            lastConvoRef.current = activeConvo;
            return data || [];
          });
        }
      } catch (err) {
        console.error(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeConvo, msgRefreshKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (channel === 'whatsapp') {
        setConvoRefreshKey((k) => k + 1);
        if (activeConvo) setMsgRefreshKey((k) => k + 1);
      } else {
        setEmailRefreshKey((k) => k + 1);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activeConvo, channel]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConvo || !tenant) return;
    setSending(true);
    const convo = conversations.find((c) => c.id === activeConvo);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: convo?.whatsapp_number,
          message: newMessage,
          conversation_id: activeConvo,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Failed to send message');
      }
      setNewMessage('');
      setMsgRefreshKey((k) => k + 1);
      toast('Message sent', 'success');
    } catch (err) {
      toast((err as Error).message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConvo);

  const patchConversation = async (
    body: { status?: string; assignToMe?: boolean },
    successMsg: string
  ) => {
    if (!activeConvo) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/conversations/${activeConvo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Action failed');
      }
      toast(successMsg, 'success');
      setConvoRefreshKey((k) => k + 1);
    } catch (err) {
      toast((err as Error).message || 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveToDocuments = async (url: string, name: string, category: string) => {
    const linkedClientId = clientId(activeConversation);
    if (!linkedClientId) {
      toast('No client associated with this conversation', 'error');
      return;
    }
    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: `/api/whatsapp/media/${url}`,
          name: name || 'WhatsApp Media',
          type: 'application/octet-stream',
          client_id: linkedClientId,
          category: category,
        }),
      });
      if (!res.ok) throw new Error('Failed to save to documents');
      toast('Saved to Documents successfully', 'success');
    } catch (err) {
      toast((err as Error).message || 'Failed to save', 'error');
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const tenantInboundAddress =
    inboundAddress ||
    (user?.tenantSlug && process.env.NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN
      ? `${user.tenantSlug}@${process.env.NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN}`
      : null);

  const refreshEmails = () => setEmailRefreshKey((k) => k + 1);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section>
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
          <MessageSquareText className="size-3.5" />
          Omnichannel
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">Inbox</h1>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setChannel('whatsapp')} className={`rounded-md px-3 py-1.5 text-sm font-medium ${channel === 'whatsapp' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'}`}>
            <MessageSquareText className="inline size-4 mr-1" />WhatsApp
          </button>
          <button type="button" onClick={() => setChannel('email')} className={`rounded-md px-3 py-1.5 text-sm font-medium ${channel === 'email' ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'}`}>
            <Mail className="inline size-4 mr-1" />Email
          </button>
        </div>
        <p className="mt-1.5 text-sm text-slate-500">
          {channel === 'whatsapp'
            ? `${conversations.length} ${conversations.length === 1 ? 'conversation' : 'conversations'} across WhatsApp`
            : `${emails.length} inbound ${emails.length === 1 ? 'email' : 'emails'}`}
        </p>
      </section>

      {channel === 'email' ? (
        <EmailInboxPanel
          emails={emails}
          loading={emailLoading}
          tenantSlug={user?.tenantSlug}
          inboundAddress={tenantInboundAddress}
          onRefresh={refreshEmails}
        />
      ) : loading ? (
        <div className="skeleton h-[500px] rounded-xl" />
      ) : whatsappConnected === false ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Plug className="size-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-950">
              WhatsApp integration required
            </h2>
            <p className="max-w-md text-sm leading-6 text-slate-500">
              Connect your firm&apos;s WhatsApp Business number to start messaging clients
              directly from PraxisOne.
            </p>
            <Button asChild variant="primary" className="mt-2">
              <Link href="/dashboard/settings">
                <Settings />
                Set up WhatsApp
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <MessageSquareText className="size-5" />
            </div>
            <h2 className="text-base font-semibold text-slate-950">No conversations yet</h2>
            <p className="max-w-md text-sm leading-6 text-slate-500">
              When clients message you on WhatsApp, their conversations appear here
              automatically.
            </p>
            <div className="mt-4 flex w-full max-w-md flex-col gap-2.5 text-left">
              <div className="rounded-lg border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-800">1. Share an invite</span>
                <span className="mt-1 block">
                  Go to Clients and share your invite link so clients can self-onboard.
                </span>
              </div>
              <div className="rounded-lg border border-teal-100 bg-teal-50/70 px-4 py-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-800">2. Wait for the first message</span>
                <span className="mt-1 block">
                  Once a client messages you, the thread links to their profile here.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="inbox-layout" style={{ height: 'calc(100vh - 220px)' }}>
          <div className="conversation-list">
            <div className="conversation-list-header space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      statusFilter === f.value
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    onClick={() => setStatusFilter(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <input
                className="input"
                placeholder="Search clients, numbers, messages..."
                style={{ fontSize: '0.85rem' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {conversations.map((c) => {
              const name = clientName(c) || c.whatsapp_number;
              return (
                <div
                  key={c.id}
                  className={`conversation-item ${activeConvo === c.id ? 'active' : ''}`}
                  onClick={() => setActiveConvo(c.id)}
                >
                  <div className="conversation-avatar">
                    {clientName(c)?.[0] || c.whatsapp_number.slice(-2)}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-name">{name}</div>
                    <div className="conversation-preview">{c.whatsapp_number}</div>
                  </div>
                  <span className="conversation-time">
                    {c.last_message_at ? formatTime(c.last_message_at) : ''}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="chat-panel" style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
            {!activeConvo ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
                <MessageSquareText className="size-8 opacity-40" />
                <p className="text-sm">Select a conversation</p>
              </div>
            ) : (
              <>
                <div className="chat-header">
                  <div className="conversation-avatar">
                    {clientName(activeConversation)?.[0] || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900">
                      {clientName(activeConversation) || activeConversation?.whatsapp_number}
                    </div>
                    <div className="text-xs text-slate-500">
                      {activeConversation?.whatsapp_number}
                      {(activeConversation as Conversation & { assignee?: { name?: string } })
                        ?.assignee?.name && (
                        <span className="ml-2">
                          · Assigned to{' '}
                          {
                            (activeConversation as Conversation & { assignee?: { name?: string } })
                              .assignee?.name
                          }
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {activeConversation?.status === 'open' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => patchConversation({ status: 'closed' }, 'Conversation closed')}
                      >
                        Close
                      </Button>
                    ) : activeConversation?.status === 'closed' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => patchConversation({ status: 'open' }, 'Conversation reopened')}
                      >
                        <ArchiveRestore className="size-3.5" />
                        Reopen
                      </Button>
                    ) : null}
                    {activeConversation?.status !== 'archived' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={actionLoading}
                        onClick={() =>
                          patchConversation({ status: 'archived' }, 'Conversation archived')
                        }
                      >
                        <Archive className="size-3.5" />
                        Archive
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={actionLoading}
                      onClick={() =>
                        patchConversation({ assignToMe: true }, 'Assigned to you')
                      }
                    >
                      <UserCheck className="size-3.5" />
                      Assign to me
                    </Button>
                  </div>
                </div>
                <div className="chat-messages" ref={chatContainerRef}>
                  {messages.map((m, index) => {
                    const mData = m as unknown as { messageType?: string; mediaUrl?: string };
                    const messageType = mData.messageType || m.message_type;
                    const mediaUrl = mData.mediaUrl || m.media_url;

                    const prevMsg = index > 0 ? messages[index - 1] : null;
                    const msgDateStr = new Date(m.created_at).toDateString();
                    const prevDateStr = prevMsg
                      ? new Date(prevMsg.created_at).toDateString()
                      : null;
                    const showDateBadge = msgDateStr !== prevDateStr;
                    const dateBadgeText = showDateBadge
                      ? getRelativeDateText(msgDateStr)
                      : msgDateStr;

                    return (
                      <React.Fragment key={m.id}>
                        {showDateBadge && (
                          <div className="my-3 text-center">
                            <span className="inline-block rounded-full border border-[var(--border-primary)] bg-[var(--bg-card)] px-3 py-1 text-xs font-medium text-[var(--text-muted)] shadow-sm">
                              {dateBadgeText}
                            </span>
                          </div>
                        )}
                        <div
                          className={`message-bubble ${
                            m.direction === 'inbound' ? 'message-inbound' : 'message-outbound'
                          }`}
                        >
                          {messageType === 'image' && mediaUrl ? (
                            <div className="mb-1">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`/api/whatsapp/media/${mediaUrl}`}
                                alt={m.content || 'Image'}
                                style={{
                                  maxWidth: '100%',
                                  borderRadius: 8,
                                  maxHeight: 300,
                                  objectFit: 'contain',
                                  backgroundColor: 'rgba(0,0,0,0.04)',
                                }}
                              />
                              {m.content && <div className="mt-1">{m.content}</div>}
                              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs opacity-80">
                                <a
                                  href={`/api/whatsapp/media/${mediaUrl}`}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 underline"
                                  style={{ color: 'inherit' }}
                                >
                                  <Download className="size-3.5" />
                                  Download
                                </a>
                                <select
                                  className="rounded-md border border-[var(--border-primary)] bg-[var(--bg-card)] px-2 py-1 text-xs text-[var(--text-secondary)] outline-none"
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleSaveToDocuments(
                                        mediaUrl,
                                        m.content || 'WhatsApp Image',
                                        e.target.value
                                      );
                                      e.target.value = '';
                                    }
                                  }}
                                >
                                  <option value="">Save to...</option>
                                  {DOCUMENT_CATEGORIES.map((c) => (
                                    <option key={c.value} value={c.value}>
                                      {c.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ) : messageType === 'document' && mediaUrl ? (
                            <div className="mb-1">
                              <div className="flex items-center gap-2">
                                <FileText className="size-5 shrink-0" />
                                <span>{m.content || 'Document'}</span>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs opacity-80">
                                <a
                                  href={`/api/whatsapp/media/${mediaUrl}`}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 underline"
                                  style={{ color: 'inherit' }}
                                >
                                  <Download className="size-3.5" />
                                  Download
                                </a>
                                <select
                                  className="rounded-md border border-[var(--border-primary)] bg-[var(--bg-card)] px-2 py-1 text-xs text-[var(--text-secondary)] outline-none"
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleSaveToDocuments(
                                        mediaUrl,
                                        m.content || 'WhatsApp Document',
                                        e.target.value
                                      );
                                      e.target.value = '';
                                    }
                                  }}
                                >
                                  <option value="">Save to...</option>
                                  {DOCUMENT_CATEGORIES.map((c) => (
                                    <option key={c.value} value={c.value}>
                                      {c.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ) : (
                            <div>{m.content}</div>
                          )}
                          <div className="message-meta">
                            <span>
                              {new Date(m.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {m.direction === 'outbound' && (
                              <svg
                                viewBox="0 0 16 15"
                                width="16"
                                height="15"
                                fill="#0f766e"
                                style={{ marginLeft: 2 }}
                              >
                                <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.891 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
                <form className="chat-composer" onSubmit={sendMessage}>
                  <input
                    className="input"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="icon"
                    disabled={sending || !newMessage.trim()}
                    aria-label="Send message"
                  >
                    {sending ? <span className="spinner" /> : <Send />}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
