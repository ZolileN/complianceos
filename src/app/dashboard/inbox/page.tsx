'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
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
      setLoading(true);
      try {
        const res = await fetch('/api/conversations');
        const { data } = await res.json();
        if (!cancelled) setConversations(data || []);
      } catch (err) { console.error(err); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [tenant, convoRefreshKey]);

  useEffect(() => {
    if (!activeConvo) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/messages?conversation_id=${activeConvo}`);
        const { data } = await res.json();
        if (!cancelled) {
          setMessages(data || []);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
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
            <p>WhatsApp messages from clients will appear here. Make sure your webhook is configured.</p>
            <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: 400, textAlign: 'left' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Webhook URL:</strong><br />
              <code style={{ color: 'var(--accent)' }}>{typeof window !== 'undefined' ? window.location.origin : ''}/api/whatsapp/webhook</code>
            </div>
          </div>
        </div>
      ) : (
        <div className="inbox-layout">
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

          <div className="chat-panel">
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
                <div className="chat-messages">
                  {messages.map((m) => (
                    <div key={m.id} className={`message-bubble ${m.direction === 'inbound' ? 'message-inbound' : 'message-outbound'}`}>
                      {m.content}
                      <div className="message-time">{formatTime(m.created_at)}</div>
                    </div>
                  ))}
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
