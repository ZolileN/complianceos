import React from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import DemoModal from '@/components/DemoModal';

export default function Home() {
  return (
    <div className="landing-page">
      {/* ── Navigation ── */}
      <header className="landing-nav">
        <div className="landing-nav-container">
          <Link href="/" style={{ display: 'flex', alignItems: 'center' }}>
            <Logo size={32} showText={true} />
          </Link>
          <nav className="landing-nav-links">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#solutions" className="landing-nav-link">Solutions</a>
            <a href="#how-it-works" className="landing-nav-link">How It Works</a>
            <a href="#dashboard" className="landing-nav-link">Dashboard</a>
            <a href="#why-us" className="landing-nav-link">Why PraxisOne</a>
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/login" className="btn btn-ghost" style={{ fontSize: '0.9rem' }}>Sign In</Link>
            <a href="#book-demo" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Book Demo</a>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="landing-hero">
        <div>
          <div className="hero-badge">
            The Operating System for Modern Professional Services
          </div>
          <h1 className="hero-title">
            The Operating System for Modern Professional Services
          </h1>
          <p className="hero-subtitle">
            PraxisOne is the operating system for compliance, accounting, and advisory firms. Manage clients, documents, workflows, communications, and compliance from a single platform.
          </p>
          <div className="hero-actions">
            <Link href="/signup" className="btn btn-primary btn-lg">Start Free Trial</Link>
            <a href="#book-demo" className="btn btn-secondary btn-lg">Book Demo</a>
          </div>
        </div>

        {/* Hero Visual Mockup */}
        <div className="hero-mockup-wrapper">
          {/* Animated Connecting Lines */}
          <svg className="connection-svg" viewBox="0 0 400 400" fill="none">
            {/* Connection Paths */}
            <path d="M 120 100 Q 200 120 300 130" stroke="rgba(94, 234, 212, 0.3)" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M 120 100 Q 150 200 150 280" stroke="rgba(94, 234, 212, 0.3)" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M 300 130 Q 300 220 280 280" stroke="rgba(94, 234, 212, 0.3)" strokeWidth="2" strokeDasharray="4 4" />
            <path d="M 150 280 Q 220 320 280 280" stroke="rgba(94, 234, 212, 0.3)" strokeWidth="2" strokeDasharray="4 4" />
          </svg>

          {/* Client Card */}
          <div className="floating-mockup-card mockup-client">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }}></div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Stark Industries</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status: Active</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>Reg: 2024/123456/07</p>
          </div>

          {/* Documents Card */}
          <div className="floating-mockup-card mockup-docs">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: '1rem' }}>📁</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Documents</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', padding: '4px 6px', background: 'var(--bg-secondary)', borderRadius: 4 }}>
                <span>vat_certificate.pdf</span>
                <span style={{ color: '#10B981' }}>✓</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', padding: '4px 6px', background: 'var(--bg-secondary)', borderRadius: 4 }}>
                <span>tax_clearance.pdf</span>
                <span style={{ color: '#10B981' }}>✓</span>
              </div>
            </div>
          </div>

          {/* Inbox Card */}
          <div className="floating-mockup-card mockup-inbox">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: '1rem' }}>💬</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>WhatsApp Inbox</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#fff', fontWeight: 700 }}>TS</div>
                <div style={{ flex: 1, padding: 6, background: 'var(--bg-secondary)', borderRadius: '0 8px 8px 8px', fontSize: '0.7rem' }}>
                  <strong>Tony Stark:</strong> Sent the tax docs over.
                </div>
              </div>
            </div>
          </div>

          {/* Tasks Card */}
          <div className="floating-mockup-card mockup-tasks">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: '1rem' }}>☑</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Active Tasks</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.7rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#EF4444' }}>●</span>
                <span>Annual Return Filing</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#F59E0B' }}>●</span>
                <span>VAT Submission</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social Proof Section ── */}
      <section className="landing-section" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        <h4 className="section-tagline">Trusted by Modern Firms</h4>
        <div className="trusted-badge-grid">
          <span className="trusted-badge">Accounting Firms</span>
          <span className="trusted-badge">Tax Practitioners</span>
          <span className="trusted-badge">Compliance Consultants</span>
          <span className="trusted-badge">Business Advisors</span>
          <span className="trusted-badge">Corporate Secretarial Firms</span>
        </div>

        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-value">50+</div>
            <div className="metric-label">Professional Firms Trust Us</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">10,000+</div>
            <div className="metric-label">Documents Securely Managed</div>
          </div>
          <div className="metric-card">
            <div className="metric-value">5,000+</div>
            <div className="metric-label">Compliance Tasks Processed</div>
          </div>
        </div>
      </section>

      {/* ── Problem Section ── */}
      <section id="solutions" className="landing-section">
        <h4 className="section-tagline">The Operational Challenge</h4>
        <h2 className="section-title">Professional Services Run on Too Many Systems</h2>
        <p className="section-subtitle">
          Managing a firm using separate apps leads to chaos.
        </p>

        <div className="problem-grid">
          <div className="card problem-card-red">
            <h3 style={{ color: 'var(--red)', fontSize: '1.25rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>✕</span> Fragmented Infrastructure
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {['WhatsApp', 'Email', 'Google Drive', 'Excel', 'Shared Folders', 'Sticky Notes'].map((s) => (
                <span key={s} style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red)', borderRadius: 100, fontSize: '0.8rem', fontWeight: 600 }}>{s}</span>
              ))}
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <li>⚠️ Lost client documents and certificates</li>
              <li>⚠️ Missed critical compliance deadlines</li>
              <li>⚠️ Endless manual follow-ups on WhatsApp</li>
              <li>⚠️ Duplicate team work and limited tracking visibility</li>
            </ul>
          </div>

          <div className="card problem-card-teal">
            <h3 style={{ color: '#5EEAD4', fontSize: '1.25rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>✓</span> Unified Operations with PraxisOne
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {['Clients', 'Documents', 'Workflows', 'WhatsApp Inbox', 'Team Tasks'].map((s) => (
                <span key={s} style={{ padding: '6px 12px', background: 'rgba(94, 234, 212, 0.1)', color: '#5EEAD4', borderRadius: 100, fontSize: '0.8rem', fontWeight: 600 }}>{s}</span>
              ))}
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <li>✨ One central workspace: single source of truth</li>
              <li>✨ Automated reminders and deadline monitors</li>
              <li>✨ WhatsApp messages linked straight to tasks</li>
              <li>✨ Clear staff tracking and analytics</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Feature Section ── */}
      <section id="features" className="landing-section" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        <h4 className="section-tagline">Platform Features</h4>
        <h2 className="section-title">Designed for Professional Service Operations</h2>
        <p className="section-subtitle">
          Everything your firm needs to deliver high-quality advisory services efficiently.
        </p>

        <div className="features-grid">
          <div className="card feature-card">
            <div className="feature-icon-wrapper">👥</div>
            <h3>Client Operations</h3>
            <p>Manage every client relationship from a single unified workspace.</p>
            <ul className="feature-bullets">
              <li>Comprehensive company profiles and metadata</li>
              <li>Detailed director records and contact lists</li>
              <li>Full compliance and filing histories</li>
              <li>Integrated document repositories</li>
            </ul>
          </div>

          <div className="card feature-card">
            <div className="feature-icon-wrapper">⚙️</div>
            <h3>Workflow Automation</h3>
            <p>Standardize and track every service process from start to finish.</p>
            <ul className="feature-bullets">
              <li>CIPC company registrations and annual returns</li>
              <li>SARS tax clearance certificate filings</li>
              <li>VAT registration and compliance workflows</li>
              <li>Sleek payroll onboarding checklists</li>
            </ul>
          </div>

          <div className="card feature-card">
            <div className="feature-icon-wrapper">💬</div>
            <h3>Unified Inbox</h3>
            <p>Bring WhatsApp and client communication directly into your team workflows.</p>
            <ul className="feature-bullets">
              <li>Chat with clients directly from the dashboard</li>
              <li>Receive documents and automatically link them to profiles</li>
              <li>Maintain complete audit trails of client conversations</li>
              <li>Create tasks directly from active client chats</li>
            </ul>
          </div>

          <div className="card feature-card">
            <div className="feature-icon-wrapper">📁</div>
            <h3>Document Intelligence</h3>
            <p>Store, classify, and retrieve important documentation instantly.</p>
            <ul className="feature-bullets">
              <li>OCR text extraction and details matching</li>
              <li>Smart document categorization tags</li>
              <li>Secure encrypted cloud storage</li>
              <li>Rigorous document history audit trails</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── How It Works Section ── */}
      <section id="how-it-works" className="landing-section">
        <h4 className="section-tagline">Process Lifecycle</h4>
        <h2 className="section-title">How It Works</h2>
        <p className="section-subtitle">
          PraxisOne streamlines operations for both your staff and your clients.
        </p>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Client sends documents</h3>
            <p>Documents can be sent via WhatsApp, email, or direct upload to the portal.</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>PraxisOne organizes everything</h3>
            <p>Documents, tasks, and communications are automatically linked to the client profile.</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Complete work faster</h3>
            <p>Track progress, manage SLA deadlines, and deliver outstanding services efficiently.</p>
          </div>
        </div>
      </section>

      {/* ── Dashboard Showcase Section ── */}
      <section id="dashboard" className="landing-section" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        <h4 className="section-tagline">Dashboard Tour</h4>
        <h2 className="section-title">Your Entire Practice. One Dashboard.</h2>
        <p className="section-subtitle">
          Monitor key metrics, ongoing tasks, and client documents in real time.
        </p>

        {/* Dashboard Mockup */}
        <div className="showcase-wrapper">
          <div className="showcase-header-bar">
            <div className="dot dot-red"></div>
            <div className="dot dot-yellow"></div>
            <div className="dot dot-green"></div>
            <div className="showcase-browser-title">PraxisOne Dashboard Panel (Secure HTTPS)</div>
          </div>
          <div className="showcase-content">
            {/* Sidebar */}
            <div className="showcase-sidebar">
              <Logo size={24} showText={true} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ padding: '8px 12px', background: 'rgba(94, 234, 212, 0.08)', borderRadius: 6, color: '#5EEAD4', fontSize: '0.85rem', fontWeight: 600 }}>⊞ Dashboard</div>
                {['👥 Clients', '👥 Team', '☑ Tasks', '⑂ Workflows', '📁 Documents', '💬 Inbox'].map((item) => (
                  <div key={item} style={{ padding: '8px 12px', borderRadius: 6, color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer' }}>{item}</div>
                ))}
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid var(--border-primary)', paddingTop: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#fff', fontWeight: 700 }}>Z</div>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600 }}>Zolile</p>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Administrator</p>
                </div>
              </div>
            </div>

            {/* Main Panel */}
            <div className="showcase-main">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Dashboard</h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Welcome back, Zolile 👋</p>
                </div>
                <button className="btn btn-primary btn-sm">+ New Client</button>
              </div>

              {/* Stats Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                {[
                  { label: 'Total Clients', value: '4', color: '#3B82F6', icon: '👥' },
                  { label: 'Active Tasks', value: '2', color: '#10B981', icon: '☑' },
                  { label: 'Documents', value: '2', color: '#F59E0B', icon: '📁' },
                  { label: 'Overdue', value: '0', color: '#EF4444', icon: '⚠️' }
                ].map((s) => (
                  <div key={s.label} className="card" style={{ padding: '16px', background: 'var(--bg-card)', border: '1px solid var(--border-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: s.color, marginBottom: 8, fontSize: '1rem' }}>
                      <span>{s.icon}</span>
                    </div>
                    <p style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>{s.value}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Lists */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 20 }}>
                {/* Recent Clients */}
                <div className="card" style={{ padding: 20 }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16 }}>Recent Clients</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { name: 'Njozela Attorneys', status: 'ACTIVE', badge: 'badge-green' },
                      { name: '18 Museum', status: 'ACTIVE', badge: 'badge-green' },
                      { name: 'Mandondo Consulting', status: 'INACTIVE', badge: 'badge-gray' },
                      { name: 'MLK Computer Consulting', status: 'ACTIVE', badge: 'badge-green' }
                    ].map((c) => (
                      <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{c.name}</span>
                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, background: c.status === 'ACTIVE' ? 'rgba(16,185,129,0.1)' : 'rgba(139,148,158,0.1)', color: c.status === 'ACTIVE' ? '#10B981' : 'var(--text-secondary)', fontWeight: 700 }}>{c.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Tasks */}
                <div className="card" style={{ padding: 20 }}>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16 }}>Active Tasks</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { name: 'Payroll', due: 'Due: 6/16/2026', label: 'NEW', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
                      { name: 'Tax clearance certificate', due: 'Due: 6/18/2026', label: 'WAITING_ON_CLIENT', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' }
                    ].map((t) => (
                      <div key={t.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
                        <div>
                          <p style={{ fontSize: '0.8rem', fontWeight: 500 }}>{t.name}</p>
                          <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{t.due}</p>
                        </div>
                        <span style={{ fontSize: '0.6rem', padding: '4px 8px', borderRadius: 4, background: t.bg, color: t.color, fontWeight: 700 }}>{t.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Firms Choose PraxisOne ── */}
      <section id="why-us" className="landing-section">
        <h4 className="section-tagline">Why Us</h4>
        <h2 className="section-title">Why Firms Choose PraxisOne</h2>
        <p className="section-subtitle">
          Unlock new operational efficiencies and deliver elite customer satisfaction.
        </p>

        <div className="metrics-grid">
          <div className="metric-card" style={{ padding: 24 }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: 16 }}>⏱️</span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8 }}>Save Time</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Significantly reduce manual administration so your staff can focus on high-value client advisory work.</p>
          </div>
          <div className="metric-card" style={{ padding: 24 }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: 16 }}>📈</span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8 }}>Increase Capacity</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Handle double the caseload volume without needing to increase internal staff headcount.</p>
          </div>
          <div className="metric-card" style={{ padding: 24 }}>
            <span style={{ fontSize: '2rem', display: 'block', marginBottom: 16 }}>👁️</span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8 }}>Improve Visibility</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Know exactly which task needs attention next, who is assigned, and monitor real-time SLA metrics.</p>
          </div>
        </div>
      </section>

      {/* ── Target Industries Section ── */}
      <section className="landing-section" style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)' }}>
        <h4 className="section-tagline">Target Industries</h4>
        <h2 className="section-title">Built for Your Firm</h2>
        <p className="section-subtitle">
          PraxisOne adapts to standard operating models of professional business services.
        </p>

        <div className="industries-grid">
          <div className="industry-card">
            <span className="industry-icon">📊</span>
            <h3>Accounting Firms</h3>
            <p>Bookkeeping, tax submissions, and monthly payroll operations.</p>
          </div>
          <div className="industry-card">
            <span className="industry-icon">⚖️</span>
            <h3>Compliance Firms</h3>
            <p>Company registrations, licensing renewals, and annual return filings.</p>
          </div>
          <div className="industry-card">
            <span className="industry-icon">🤝</span>
            <h3>Business Consultants</h3>
            <p>Automated client onboarding, structured workspaces, and workflows.</p>
          </div>
          <div className="industry-card">
            <span className="industry-icon">🏛️</span>
            <h3>Corporate Secretarial</h3>
            <p>Governance records, statutory compliance, and director administration.</p>
          </div>
        </div>
      </section>

      {/* ── Future Vision Section ── */}
      <section className="landing-section">
        <div className="vision-banner">
          <h4 className="section-tagline" style={{ color: '#8B5CF6' }}>Future Vision</h4>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 16 }}>Built For The Future Of Professional Services</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 700, margin: '0 auto', fontSize: '1rem', lineHeight: 1.6 }}>
            PraxisOne combines workflow automation, document intelligence, and AI-powered assistance to help firms scale expertise without scaling administrative burden.
          </p>
        </div>
      </section>

      {/* ── Contact / Book Demo Section ── */}
      <section id="contact" className="landing-section" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="cta-banner">
          <h2 className="cta-title">Stop Managing Work Across Five Different Systems</h2>
          <p className="cta-subtitle">
            Bring your clients, documents, workflows, and communications into a single operating platform.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" className="btn btn-primary btn-lg">Start Free Trial</Link>
            <a href="#book-demo" className="btn btn-secondary btn-lg">Book a Demo</a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <Logo size={24} showText={true} />
            <p>The operating system for modern professional compliance, accounting, and secretarial practices.</p>
          </div>
          <div>
            <h4 className="footer-heading">Features</h4>
            <ul className="footer-links">
              <li><a href="#features">Client Records</a></li>
              <li><a href="#features">Workflows</a></li>
              <li><a href="#features">WhatsApp Inbox</a></li>
              <li><a href="#features">Document OCR</a></li>
            </ul>
          </div>
          <div>
            <h4 className="footer-heading">Solutions</h4>
            <ul className="footer-links">
              <li><a href="#solutions">Accounting</a></li>
              <li><a href="#solutions">Tax Practice</a></li>
              <li><a href="#solutions">Corporate Secretarial</a></li>
              <li><a href="#solutions">Compliance</a></li>
            </ul>
          </div>
          <div>
            <h4 className="footer-heading">Company</h4>
            <ul className="footer-links">
              <li><Link href="/">About Us</Link></li>
              <li><Link href="/">Careers</Link></li>
              <li><Link href="/">Press Kit</Link></li>
              <li><Link href="/">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="footer-heading">Resources</h4>
            <ul className="footer-links">
              <li><Link href="/">Help Center</Link></li>
              <li><Link href="/">Guides</Link></li>
              <li><Link href="/">Security</Link></li>
              <li><Link href="/">API Docs</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} PraxisOne. All rights reserved.</p>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link href="/">Privacy Policy</Link>
            <Link href="/">Terms of Service</Link>
            <Link href="/">Sitemap</Link>
          </div>
        </div>
      </footer>

      <DemoModal />
    </div>
  );
}
