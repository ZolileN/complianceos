'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface AdminLog {
  id: string;
  timestamp: string;
  type: 'system' | 'webhook' | 'finops';
  message: string;
  payload?: Record<string, unknown>;
}

export default function WebhooksAndMetering() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLog, setActiveLog] = useState<AdminLog | null>(null);
  const [finops, setFinops] = useState<{
    totalMessages: number;
    topStarter: { name: string; tokens: number; limit: number };
  } | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/logs');
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (err) {
      console.error('Error fetching admin logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFinOps = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/finops');
      const data = await res.json();
      if (data.success) {
        setFinops({
          totalMessages: data.totalMessages,
          topStarter: data.topStarter
        });
      }
    } catch (err) {
      console.error('Error fetching finops:', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await fetchLogs();
      await fetchFinOps();
    };
    init();
    
    const interval = setInterval(() => {
      fetchLogs();
      fetchFinOps();
    }, 5000); // Poll every 5s for live webhooks & metering
    return () => clearInterval(interval);
  }, [fetchLogs, fetchFinOps]);

  const totalWebhooks = logs.filter(l => l.type === 'webhook').length;
  const totalSystem = logs.filter(l => l.type === 'system').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* FinOps Metering Overview */}
      <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 8, padding: 20 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>FinOps Token & Credit Metering</h2>
        <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 4 }}>Real-time usage statistics against starter limits. Hard limits are enforced at 1,000 free tokens / month.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 20 }}>
          {/* Progress bar card 1 */}
          <div style={{ padding: 16, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
              <span style={{ color: '#F1F5F9' }}>Starter Workspace API Credits</span>
              <span style={{ color: '#5EEAD4' }}>
                {finops ? `${finops.topStarter.tokens.toLocaleString()} / ${finops.topStarter.limit.toLocaleString()} tokens` : 'Loading...'}
              </span>
            </div>
            <div style={{ height: 8, background: '#1E293B', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ 
                width: finops ? `${Math.min((finops.topStarter.tokens / finops.topStarter.limit) * 100, 100)}%` : '0%', 
                height: '100%', 
                background: finops && finops.topStarter.tokens > finops.topStarter.limit * 0.9 ? '#EF4444' : '#5EEAD4', 
                borderRadius: 4 
              }} />
            </div>
            <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginTop: 8 }}>
              {finops ? (
                <>
                  {((finops.topStarter.tokens / finops.topStarter.limit) * 100).toFixed(1)}% capacity consumed. 
                  {finops.topStarter.tokens > 0 ? ` Top consumer: ${finops.topStarter.name}.` : ''}
                </>
              ) : 'Calculating capacity...'}
            </div>
          </div>

          {/* Progress bar card 2 */}
          <div style={{ padding: 16, background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600 }}>
              <span style={{ color: '#F1F5F9' }}>Total WhatsApp Messages Metered</span>
              <span style={{ color: '#60A5FA' }}>
                {finops ? `${finops.totalMessages.toLocaleString()} messages` : 'Loading...'}
              </span>
            </div>
            <div style={{ height: 8, background: '#1E293B', borderRadius: 4, marginTop: 8, overflow: 'hidden' }}>
              <div style={{ width: finops ? `${Math.min((finops.totalMessages / 15000) * 100, 100)}%` : '0%', height: '100%', background: '#3B82F6', borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: '0.65rem', color: '#94A3B8', marginTop: 8 }}>Rate limit ceiling: 15,000 / day. Current queue handling: Healthy.</div>
          </div>
        </div>
      </div>

      {/* Webhook log list */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left Side: Logs List */}
        <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: 500 }}>
          <div style={{ padding: 16, borderBottom: '1px solid #1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC' }}>Live Event & Webhook Stream</h3>
              <p style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 2 }}>Click any event log to inspect payloads.</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(94, 234, 212, 0.1)', color: '#5EEAD4' }}>{totalWebhooks} Webhooks</span>
              <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, background: 'rgba(59, 130, 246, 0.1)', color: '#60A5FA' }}>{totalSystem} System</span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: '0.8rem' }}>Loading log stream...</div>
            ) : logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: '0.8rem', fontStyle: 'italic' }}>No logs recorded yet.</div>
            ) : (
              logs.map(log => {
                const isSelected = activeLog?.id === log.id;
                return (
                  <div
                    key={log.id}
                    onClick={() => setActiveLog(log)}
                    style={{
                      padding: 12,
                      borderRadius: 6,
                      background: isSelected ? 'rgba(94, 234, 212, 0.05)' : 'rgba(255,255,255,0.01)',
                      border: isSelected ? '1px solid rgba(94, 234, 212, 0.3)' : '1px solid rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                      <span style={{
                        fontWeight: 700,
                        color: log.type === 'webhook' ? '#5EEAD4' : log.type === 'finops' ? '#60A5FA' : '#F59E0B',
                        textTransform: 'uppercase'
                      }}>
                        [{log.type}]
                      </span>
                      <span style={{ color: '#64748B' }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#E2E8F0', marginTop: 6, fontWeight: 600 }}>{log.message}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Payload Inspector */}
        <div style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: 8, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: 500 }}>
          <div style={{ padding: 16, borderBottom: '1px solid #1E293B' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC' }}>Webhook Payload Inspector</h3>
            <p style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 2 }}>Inspect JSON bodies of incoming Meta event loops.</p>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: 16, background: '#090D16', fontFamily: 'monospace', fontSize: '0.7rem' }}>
            {activeLog ? (
              <div>
                <div style={{ borderBottom: '1px solid #1E293B', paddingBottom: 12, marginBottom: 12 }}>
                  <div style={{ color: '#F1F5F9', fontWeight: 600 }}>Event: {activeLog.message}</div>
                  <div style={{ color: '#94A3B8', fontSize: '0.65rem', marginTop: 4 }}>Timestamp: {new Date(activeLog.timestamp).toISOString()}</div>
                </div>
                {activeLog.payload ? (
                  <pre style={{ color: '#34D399', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {JSON.stringify(activeLog.payload, null, 2)}
                  </pre>
                ) : (
                  <div style={{ color: '#64748B', fontStyle: 'italic' }}>No structured payload attached to this log entry.</div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#64748B', fontStyle: 'italic', fontSize: '0.8rem' }}>
                Select a log on the left to inspect its payload details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
