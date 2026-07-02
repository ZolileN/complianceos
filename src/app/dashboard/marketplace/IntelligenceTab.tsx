'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function IntelligenceTab() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchSuggestions = async () => {
    try {
      const res = await fetch('/api/skills/analyze', { method: 'POST' }); 
      const data = await res.json();
      if (data.data) {
        setSuggestions(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setAnalyzing(false);
    }
  };

  const handleRunAnalysis = () => {
    setAnalyzing(true);
    setLoading(true);
    fetchSuggestions();
  };

  useEffect(() => {
    let mounted = true;
    
    const loadInitial = async () => {
      try {
        const res = await fetch('/api/skills/analyze', { method: 'POST' }); 
        const data = await res.json();
        if (mounted && data.data) {
          setSuggestions(data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    loadInitial();
    
    return () => { mounted = false; };
  }, []);

  const dismiss = async (id: string) => {
    // For MVP we just remove from state
    setSuggestions(suggestions.filter(s => s.id !== id));
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-6" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>🧠 Behavioral Intelligence</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>AI-suggested automations based on your recent activity patterns.</p>
        </div>
        <button 
          onClick={handleRunAnalysis} 
          disabled={analyzing}
          className="btn btn-primary"
        >
          {analyzing ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {loading && !analyzing ? (
        <div className="flex-center" style={{ minHeight: '30vh' }}>
          <span className="spinner" style={{ width: 30, height: 30 }} />
        </div>
      ) : suggestions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✨</div>
          <h3>No suggestions right now</h3>
          <p>We need more activity to detect patterns. Try creating tasks or uploading documents!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {suggestions.map(s => (
            <div key={s.id} className="card card-hover" style={{ position: 'relative', overflow: 'hidden', padding: 20 }}>
              <div style={{ position: 'absolute', top: 12, right: 12 }}>
                 <button onClick={() => dismiss(s.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer' }}>Dismiss</button>
              </div>
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8, color: 'var(--accent)', paddingRight: 40 }}>{s.title}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>{s.description}</p>
              
              <div style={{ background: 'var(--bg-secondary)', borderRadius: 6, padding: 12, marginBottom: 16, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Trigger: <span style={{ color: '#3b82f6' }}>{s.triggerEvent}</span></div>
                <div style={{ color: 'var(--text-muted)' }}>Steps:</div>
                <ul style={{ paddingLeft: 16, color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {JSON.parse(s.suggestedSteps).map((step: any, i: number) => (
                    <li key={i}>{step.name} <span style={{ opacity: 0.6 }}>({step.stepType})</span></li>
                  ))}
                </ul>
              </div>

              <div style={{ display: 'flex' }}>
                <Link href={`/dashboard/marketplace/builder`} className="btn btn-primary" style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}>
                  Automate This
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border-primary)', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>Build from Scratch</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>Know exactly what you need? Build a custom skill.</p>
        <Link href="/dashboard/marketplace/builder" className="btn btn-ghost" style={{ border: '1px solid var(--border-primary)', textDecoration: 'none' }}>
          Open Builder UI
        </Link>
      </div>
    </section>
  );
}
