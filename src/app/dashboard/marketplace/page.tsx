'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Activity, Brain, CheckCircle2, Store, Zap } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import IntelligenceTab from './IntelligenceTab';

/* ── Types ── */
interface SkillData {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  icon: string;
  version: string;
  author: string;
  rating: number;
  installCount: number;
  isCore: boolean;
  installed: boolean;
  active: boolean;
  triggers: string[];
  requiredPermissions: string[];
  steps: Array<{ id: string; name: string; stepType: string; stepOrder: number }>;
  pack: { id: string; name: string; slug: string; icon: string } | null;
  _count: { executions: number };
}

interface PackData {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  industry: string;
  icon: string;
  price: number;
  skills: Array<{ id: string; slug: string; name: string; description: string | null; icon: string }>;
  _count: { skills: number };
}

interface ExecutionData {
  id: string;
  skillName: string;
  skillSlug: string;
  skillIcon: string;
  skillCategory: string;
  status: string;
  triggerEvent: string;
  stepsCompleted: number;
  totalSteps: number;
  tokensUsed: number;
  durationMs: number | null;
  error: string | null;
  createdAt: string;
}

/* ── Helpers ── */
const CATEGORY_COLORS: Record<string, string> = {
  finance: '#10b981',
  crm: '#3b82f6',
  whatsapp: '#25d366',
  hr: '#8b5cf6',
  compliance: '#f59e0b',
  general: '#6b7280',
};

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  completed: { color: '#10b981', label: 'Completed' },
  running: { color: '#3b82f6', label: 'Running' },
  failed: { color: '#ef4444', label: 'Failed' },
  pending: { color: '#f59e0b', label: 'Pending' },
  cancelled: { color: '#6b7280', label: 'Cancelled' },
};

function formatPrice(cents: number): string {
  if (cents === 0) return 'Free';
  return `R${(cents / 100).toLocaleString()}/mo`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span style={{ color: '#f59e0b', letterSpacing: 1, fontSize: '0.8rem' }}>
      {Array.from({ length: 5 }, (_, i) => (i < Math.round(rating) ? '★' : '☆')).join('')}
    </span>
  );
}

/* ── Main Page ── */
export default function MarketplacePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'discover' | 'installed' | 'executions' | 'intelligence'>('discover');
  const [skills, setSkills] = useState<SkillData[]>([]);
  const [packs, setPacks] = useState<PackData[]>([]);
  const [executions, setExecutions] = useState<ExecutionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const isAdmin = user?.role === 'administrator';

  const fetchData = async () => {
    try {
      const [skillsRes, packsRes, execRes] = await Promise.all([
        fetch('/api/skills').then((r) => r.json()),
        fetch('/api/skills/packs').then((r) => r.json()),
        fetch('/api/skills/executions').then((r) => r.json()),
      ]);
      if (skillsRes.data) setSkills(skillsRes.data);
      if (packsRes.data) setPacks(packsRes.data);
      if (execRes.data) setExecutions(execRes.data);
    } catch (err) {
      console.error('Failed to fetch marketplace data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => { await fetchData(); };
    init();
  }, []);

  const handleInstall = async (skillId: string) => {
    if (!isAdmin) return;
    setInstalling(skillId);
    try {
      const res = await fetch('/api/skills/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Install failed:', err);
    } finally {
      setInstalling(null);
    }
  };

  const handleUninstall = async (skillId: string) => {
    if (!isAdmin) return;
    setInstalling(skillId);
    try {
      const res = await fetch(`/api/skills/install?skillId=${skillId}`, { method: 'DELETE' });
      if (res.ok) await fetchData();
    } catch (err) {
      console.error('Uninstall failed:', err);
    } finally {
      setInstalling(null);
    }
  };

  const handleRate = async (skillId: string, rating: number) => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`/api/skills/${skillId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: '' }),
      });
      if (res.ok) {
        // Quick local update to avoid full refetch delay
        setSkills(skills.map(s => s.id === skillId ? { ...s, rating } : s));
        await fetchData(); // background sync
      }
    } catch (err) {
      console.error('Rating failed:', err);
    }
  };

  const filteredSkills = skills.filter((s) => {
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase()) && !s.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedCategory && s.category !== selectedCategory) return false;
    if (activeTab === 'installed') return s.installed;
    return true;
  });

  const categories = [...new Set(skills.map((s) => s.category))];

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '60vh' }}>
        <span className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap className="size-6 text-[var(--accent)]" />
            Skill Marketplace
          </h1>
          <p className="page-subtitle">
            Install skills to automate document, WhatsApp, and compliance workflows.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Badge variant="outline">{skills.length} skills</Badge>
          <Badge variant="success">
            {skills.filter((s) => s.installed).length} installed
          </Badge>
          <Badge variant="info">{executions.length} executions</Badge>
        </div>
      </div>

      <div className="tabs">
        {(
          [
            { id: 'discover', label: 'Discover', icon: Store },
            { id: 'installed', label: 'Installed', icon: CheckCircle2 },
            { id: 'executions', label: 'Executions', icon: Activity },
            { id: 'intelligence', label: 'Intelligence', icon: Brain },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Icon className="size-3.5" />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {activeTab === 'intelligence' && (
        <IntelligenceTab />
      )}

      {activeTab !== 'executions' && activeTab !== 'intelligence' && (
        <>
          {/* Search + Filter Bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
            <div className="header-search" style={{ flex: 1, minWidth: 220 }}>
              <span style={{ color: 'var(--text-muted)' }}>⌕</span>
              <input placeholder="Search skills..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              {searchQuery && <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button className={`marketplace-filter-chip ${!selectedCategory ? 'active' : ''}`} onClick={() => setSelectedCategory(null)}>All</button>
              {categories.map((cat) => (
                <button key={cat} className={`marketplace-filter-chip ${selectedCategory === cat ? 'active' : ''}`} onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  style={{ '--chip-color': CATEGORY_COLORS[cat] || '#6b7280' } as React.CSSProperties}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Business Packs */}
          {activeTab === 'discover' && packs.length > 0 && (
            <section style={{ marginBottom: 40 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>Industry packs</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
                {packs.map((pack) => (
                  <div key={pack.id} className="card card-hover marketplace-pack-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <div className="marketplace-pack-icon">{pack.icon}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{pack.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{pack.industry}</div>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>{pack.description}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                      {pack.skills.map((s) => (
                        <span key={s.id} className="badge badge-gray" style={{ fontSize: '0.7rem' }}>{s.icon} {s.name}</span>
                      ))}
                    </div>
                    <div className="flex-between">
                      <span style={{ fontWeight: 700, color: pack.price === 0 ? 'var(--accent)' : 'var(--text-primary)' }}>{formatPrice(pack.price)}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pack._count.skills} skills</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Skills Grid */}
          <section>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>
              {activeTab === 'installed' ? '✅ Your Installed Skills' : '⚡ Available Skills'}
            </h2>
            {filteredSkills.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3>{activeTab === 'installed' ? 'No skills installed yet' : 'No skills found'}</h3>
                <p>{activeTab === 'installed' ? 'Browse the marketplace to find skills that automate your work.' : 'Try a different search or category filter.'}</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {filteredSkills.map((skill) => (
                  <div key={skill.id} className="card card-hover marketplace-skill-card" onClick={() => setSelectedSkill(skill)}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="marketplace-skill-icon">{skill.icon}</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{skill.name}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                            <span className="badge" style={{ background: `${CATEGORY_COLORS[skill.category] || '#6b7280'}22`, color: CATEGORY_COLORS[skill.category] || '#6b7280', fontSize: '0.65rem', padding: '1px 6px' }}>
                              {skill.category}
                            </span>
                            {skill.isCore && <span className="badge badge-green" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>Core</span>}
                          </div>
                        </div>
                      </div>
                      {skill.installed ? (
                        <span className="marketplace-installed-badge">✓ Installed</span>
                      ) : null}
                    </div>
                    <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {skill.description}
                    </p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                      {skill.steps.slice(0, 3).map((step) => (
                        <span key={step.id} className="marketplace-step-pill">{step.name}</span>
                      ))}
                      {skill.steps.length > 3 && <span className="marketplace-step-pill">+{skill.steps.length - 3}</span>}
                    </div>
                    <div className="flex-between" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <StarRating rating={skill.rating} />
                        <span>v{skill.version}</span>
                      </div>
                      <span>{skill.installCount} installs</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Executions Tab */}
      {activeTab === 'executions' && (
        <section>
          {executions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>No skill executions yet</h3>
              <p>Install and run skills to see execution history here.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Skill</th>
                    <th>Status</th>
                    <th>Trigger</th>
                    <th>Steps</th>
                    <th>Tokens</th>
                    <th>Duration</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map((ex) => {
                    const st = STATUS_MAP[ex.status] || STATUS_MAP.pending;
                    return (
                      <tr key={ex.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '1.1rem' }}>{ex.skillIcon}</span>
                            <div>
                              <div style={{ fontWeight: 600 }}>{ex.skillName}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ex.skillSlug}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="badge" style={{ background: `${st.color}22`, color: st.color }}>{st.label}</span></td>
                        <td><span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{ex.triggerEvent}</span></td>
                        <td>{ex.stepsCompleted}/{ex.totalSteps}</td>
                        <td>{ex.tokensUsed.toLocaleString()}</td>
                        <td>{ex.durationMs ? `${ex.durationMs}ms` : '—'}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(ex.createdAt).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <div className="modal-overlay" onClick={() => setSelectedSkill(null)}>
          <div className="modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="marketplace-skill-icon" style={{ width: 48, height: 48, fontSize: '1.4rem' }}>{selectedSkill.icon}</div>
                <div>
                  <h2 className="modal-title">{selectedSkill.name}</h2>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>by {selectedSkill.author} · v{selectedSkill.version}</div>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedSkill(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>{selectedSkill.description}</p>

              <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
                <div className="marketplace-detail-stat"><span className="marketplace-detail-stat-value">{selectedSkill.installCount}</span><span className="marketplace-detail-stat-label">Installs</span></div>
                <div className="marketplace-detail-stat"><span className="marketplace-detail-stat-value">{selectedSkill._count.executions}</span><span className="marketplace-detail-stat-label">Executions</span></div>
                <div className="marketplace-detail-stat"><span className="marketplace-detail-stat-value">{selectedSkill.steps.length}</span><span className="marketplace-detail-stat-label">Steps</span></div>
              </div>

              {/* Workflow Steps */}
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Workflow Steps</h3>
              <div className="marketplace-steps-flow">
                {selectedSkill.steps.map((step, i) => (
                  <React.Fragment key={step.id}>
                    <div className="marketplace-flow-step">
                      <span className="marketplace-flow-step-num">{i + 1}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{step.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{step.stepType.replace('_', ' ')}</div>
                      </div>
                    </div>
                    {i < selectedSkill.steps.length - 1 && <div className="marketplace-flow-connector" />}
                  </React.Fragment>
                ))}
              </div>

              {/* Triggers */}
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 24, marginBottom: 12 }}>Triggers</h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {selectedSkill.triggers.map((t) => (
                  <span key={t} className="badge badge-blue" style={{ fontSize: '0.75rem' }}>{t}</span>
                ))}
              </div>

              {/* Permissions */}
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 24, marginBottom: 12 }}>Required Permissions</h3>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {selectedSkill.requiredPermissions.map((p) => (
                  <span key={p} className="badge badge-amber" style={{ fontSize: '0.75rem' }}>🔐 {p}</span>
                ))}
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              {selectedSkill.installed ? (
                <>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: 8 }}>Rate this skill:</span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRate(selectedSkill.id, star)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          fontSize: '1.2rem', color: star <= selectedSkill.rating ? '#f59e0b' : 'var(--border-primary)'
                        }}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-danger" onClick={() => { handleUninstall(selectedSkill.id); setSelectedSkill(null); }} disabled={!isAdmin || installing === selectedSkill.id}>
                      {installing === selectedSkill.id ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Uninstall'}
                    </button>
                    <Link href={`/dashboard/marketplace/installed/${selectedSkill.id}`} className="btn btn-primary" style={{ textDecoration: 'none' }}>
                      Manage Skill
                    </Link>
                  </div>
                </>
              ) : (
                <div style={{ marginLeft: 'auto' }}>
                  <button className="btn btn-primary" onClick={() => { handleInstall(selectedSkill.id); setSelectedSkill(null); }} disabled={!isAdmin || installing === selectedSkill.id}>
                    {installing === selectedSkill.id ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '⚡ Install Skill'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .marketplace-stat-badge {
          display: flex; flex-direction: column; align-items: center;
          padding: 8px 16px; background: var(--bg-card);
          border: 1px solid var(--border-primary); border-radius: var(--radius-md);
        }
        .marketplace-stat-value { font-size: 1.25rem; font-weight: 800; color: var(--accent); line-height: 1; }
        .marketplace-stat-label { font-size: 0.65rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }

        .marketplace-filter-chip {
          padding: 6px 14px; border-radius: 99px; font-size: 0.8rem; font-weight: 600;
          background: var(--bg-elevated); border: 1px solid var(--border-primary);
          color: var(--text-secondary); cursor: pointer; transition: all var(--transition);
          text-transform: capitalize; font-family: inherit;
        }
        .marketplace-filter-chip:hover { background: var(--bg-hover); color: var(--text-primary); }
        .marketplace-filter-chip.active { background: var(--accent-muted); color: var(--accent); border-color: var(--accent); }

        .marketplace-pack-card { position: relative; overflow: hidden; }
        .marketplace-pack-card::before {
          content: ''; position: absolute; top: -60px; right: -60px;
          width: 140px; height: 140px; border-radius: 50%;
          background: radial-gradient(circle, rgba(14,186,129,0.08), transparent 70%);
          pointer-events: none;
        }
        .marketplace-pack-icon {
          width: 44px; height: 44px; border-radius: var(--radius-md);
          background: var(--accent-muted); display: flex; align-items: center;
          justify-content: center; font-size: 1.4rem; flex-shrink: 0;
        }

        .marketplace-skill-card { cursor: pointer; position: relative; }
        .marketplace-skill-icon {
          width: 40px; height: 40px; border-radius: var(--radius-md);
          background: var(--bg-elevated); border: 1px solid var(--border-primary);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.2rem; flex-shrink: 0;
        }
        .marketplace-installed-badge {
          font-size: 0.7rem; font-weight: 700; color: var(--accent);
          background: var(--accent-muted); padding: 3px 8px;
          border-radius: 99px; white-space: nowrap;
        }
        .marketplace-step-pill {
          font-size: 0.7rem; padding: 2px 8px; border-radius: 99px;
          background: rgba(99,102,241,0.1); color: #818cf8;
          font-weight: 500;
        }

        .marketplace-detail-stat {
          display: flex; flex-direction: column; align-items: center;
          padding: 12px 20px; background: var(--bg-secondary);
          border: 1px solid var(--border-primary); border-radius: var(--radius-md);
          flex: 1; min-width: 80px;
        }
        .marketplace-detail-stat-value { font-size: 1.5rem; font-weight: 800; color: var(--text-primary); line-height: 1; }
        .marketplace-detail-stat-label { font-size: 0.7rem; color: var(--text-muted); margin-top: 4px; text-transform: uppercase; }

        .marketplace-steps-flow { display: flex; flex-direction: column; gap: 0; }
        .marketplace-flow-step {
          display: flex; align-items: center; gap: 12;
          padding: 10px 14px; background: var(--bg-secondary);
          border: 1px solid var(--border-primary); border-radius: var(--radius-md);
        }
        .marketplace-flow-step-num {
          width: 24px; height: 24px; border-radius: 50%;
          background: var(--accent); color: #fff; font-size: 0.7rem;
          font-weight: 700; display: flex; align-items: center;
          justify-content: center; flex-shrink: 0;
        }
        .marketplace-flow-connector {
          width: 2px; height: 16px; background: var(--border-primary);
          margin-left: 25px;
        }
      `}</style>
    </>
  );
}
