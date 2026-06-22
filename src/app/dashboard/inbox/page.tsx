'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { DOCUMENT_CATEGORIES } from '@/lib/constants';
import type { Conversation, Message } from '@/types';

export default function InboxPage() {
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [convoRefreshKey, setConvoRefreshKey] = useState(0);
  const [msgRefreshKey, setMsgRefreshKey] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations — correct effect pattern
  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    (async () => {
      if (convoRefreshKey === 0) setLoading(true);
      try {
        const res = await fetch('/api/conversations');
        const { data } = await res.json();
        if (!cancelled) setConversations(data || []);
      } catch (err) { console.error(err); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [tenant, convoRefreshKey]);

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
            const lastMessageIsOutbound = data && data.length > 0 && data[data.length - 1].direction === 'outbound';
            
            let shouldScroll = false;
            if (isNewConvo || lastMessageIsOutbound) {
              shouldScroll = true;
            } else if (hasNewMessage) {
              // Check if user is near the bottom
              if (chatContainerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
                // If within 250px of the bottom, auto-scroll
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
      } catch (err) { console.error(err); }
    })();
    return () => { cancelled = true; };
  }, [activeConvo, msgRefreshKey]);

  // 5-second polling
  useEffect(() => {
    const interval = setInterval(() => {
      setConvoRefreshKey(k => k + 1);
      if (activeConvo) setMsgRefreshKey(k => k + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeConvo]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConvo || !tenant) return;
    setSending(true);
    const convo = conversations.find((c) => c.id === activeConvo);
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: convo?.whatsapp_number, message: newMessage, conversation_id: activeConvo }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Failed to send message');
      }
      setNewMessage('');
      setMsgRefreshKey(k => k + 1);
      toast('Message sent', 'success');
    } catch (err) {
      toast((err as Error).message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConvo);

  const handleSaveToDocuments = async (url: string, name: string, category: string) => {
    const clientId = (activeConversation?.client as unknown as { id: string })?.id;
    if (!clientId) {
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
          client_id: clientId,
          category: category
        })
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
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">WhatsApp Inbox</h1>
          <p className="page-subtitle">{conversations.length} conversations</p>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 500 }} />
      ) : conversations.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>No conversations yet</h3>
            <p>
              When clients message you on WhatsApp, their conversations will appear here automatically.
            </p>
            <div style={{
              marginTop: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              maxWidth: 380,
              textAlign: 'left'
            }}>
              <div style={{ padding: '12px 16px', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.1rem', marginTop: 1 }}>1️⃣</span>
                <span>Go to <strong style={{ color: 'var(--text-primary)' }}>Clients</strong> and share your invite link — clients fill in their details and are added to your workspace automatically.</span>
              </div>
              <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.1rem', marginTop: 1 }}>2️⃣</span>
                <span>Once a client sends you a WhatsApp message, the conversation will appear here and link to their profile automatically.</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="inbox-layout" style={{ height: 'calc(100vh - 220px)' }}>
          <div className="conversation-list">
            <div className="conversation-list-header">
              <input className="input" placeholder="Search conversations..." style={{ fontSize: '0.85rem' }} readOnly title="Search coming soon" />
            </div>
            {conversations.map((c) => (
              <div key={c.id} className={`conversation-item ${activeConvo === c.id ? 'active' : ''}`} onClick={() => setActiveConvo(c.id)}>
                <div className="conversation-avatar">{(c.client as unknown as { company_name: string })?.company_name?.[0] || c.whatsapp_number.slice(-2)}</div>
                <div className="conversation-info">
                  <div className="conversation-name">{(c.client as unknown as { company_name: string })?.company_name || c.whatsapp_number}</div>
                  <div className="conversation-preview">{c.whatsapp_number}</div>
                </div>
                <span className="conversation-time">{c.last_message_at ? formatTime(c.last_message_at) : ''}</span>
              </div>
            ))}
          </div>

          <div className="chat-panel" style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
            {!activeConvo ? (
              <div className="flex-center" style={{ flex: 1, color: 'var(--text-muted)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 12, opacity: 0.3 }}>💬</div>
                  <p>Select a conversation</p>
                </div>
              </div>
            ) : (
              <>
                <div className="chat-header">
                  <div className="conversation-avatar">{(activeConversation?.client as unknown as { company_name: string })?.company_name?.[0] || '?'}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{(activeConversation?.client as unknown as { company_name: string })?.company_name || activeConversation?.whatsapp_number}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{activeConversation?.whatsapp_number}</div>
                  </div>
                </div>
                <div className="chat-messages" ref={chatContainerRef}>
                  {messages.map((m) => {
                    const mData = m as unknown as { messageType?: string; mediaUrl?: string };
                    const messageType = mData.messageType || m.message_type;
                    const mediaUrl = mData.mediaUrl || m.media_url;
                    
                    return (
                      <div key={m.id} className={`message-bubble ${m.direction === 'inbound' ? 'message-inbound' : 'message-outbound'}`}>
                        {messageType === 'image' && mediaUrl ? (
                          <div style={{ marginBottom: 4 }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={`/api/whatsapp/media/${mediaUrl}`} 
                              alt={m.content || 'Image'} 
                              style={{ maxWidth: '100%', borderRadius: 8, maxHeight: 300, objectFit: 'contain', backgroundColor: 'rgba(0,0,0,0.1)' }} 
                            />
                            {m.content && <div style={{ marginTop: 4 }}>{m.content}</div>}
                            <div style={{ display: 'flex', gap: '12px', marginTop: 8, fontSize: '0.8rem', opacity: 0.8 }}>
                              <a href={`/api/whatsapp/media/${mediaUrl}`} download target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
                                ↓ Download Image
                              </a>
                              <select 
                                style={{ 
                                  background: 'var(--bg-elevated)', 
                                  border: '1px solid var(--border-primary)', 
                                  color: 'var(--text-primary)', 
                                  borderRadius: 'var(--radius-sm)',
                                  cursor: 'pointer', 
                                  padding: '2px 8px', 
                                  fontSize: '0.75rem',
                                  outline: 'none'
                                }}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleSaveToDocuments(mediaUrl, m.content || 'WhatsApp Image', e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                              >
                                <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>💾 Save to...</option>
                                {DOCUMENT_CATEGORIES.map(c => (
                                  <option key={c.value} value={c.value} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : messageType === 'document' && mediaUrl ? (
                          <div style={{ marginBottom: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: '1.5rem' }}>📄</span>
                              <span>{m.content || 'Document'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: 8, fontSize: '0.8rem', opacity: 0.8 }}>
                              <a href={`/api/whatsapp/media/${mediaUrl}`} download target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
                                ↓ Download Document
                              </a>
                              <select 
                                style={{ 
                                  background: 'var(--bg-elevated)', 
                                  border: '1px solid var(--border-primary)', 
                                  color: 'var(--text-primary)', 
                                  borderRadius: 'var(--radius-sm)',
                                  cursor: 'pointer', 
                                  padding: '2px 8px', 
                                  fontSize: '0.75rem',
                                  outline: 'none'
                                }}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleSaveToDocuments(mediaUrl, m.content || 'WhatsApp Document', e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                              >
                                <option value="" style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>💾 Save to...</option>
                                {DOCUMENT_CATEGORIES.map(c => (
                                  <option key={c.value} value={c.value} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                                    {c.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ) : (
                          <div>{m.content}</div>
                        )}
                        <div className="message-time">{formatTime(m.created_at)}</div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
                <form className="chat-composer" onSubmit={sendMessage}>
                  <input className="input" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
                  <button type="submit" className="btn btn-primary" disabled={sending || !newMessage.trim()}>
                    {sending ? <span className="spinner" /> : '➤'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
