'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Logo from '@/components/Logo';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Director {
  name: string;
  id_number: string;
}

type Step = 1 | 2 | 3;

// ── Component ──────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const params = useParams();
  const slug = params?.slug as string;

  // Firm meta
  const [firmName, setFirmName] = useState('');
  const [firmLoading, setFirmLoading] = useState(true);
  const [firmError, setFirmError] = useState('');

  // Step management
  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Step 1 — Company Info
  const [companyName, setCompanyName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [taxNumber, setTaxNumber] = useState('');

  // Step 2 — Contact Details
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');

  // Step 3 — Directors
  const [directors, setDirectors] = useState<Director[]>([{ name: '', id_number: '' }]);

  // Resolve firm name from slug
  useEffect(() => {
    if (!slug) return;
    setFirmLoading(true);
    fetch(`/api/onboard/${slug}`)
      .then(r => {
        if (!r.ok) throw new Error('Firm not found');
        return r.json();
      })
      .then(d => setFirmName(d.firmName))
      .catch(() => setFirmError('This onboarding link is invalid or has expired.'))
      .finally(() => setFirmLoading(false));
  }, [slug]);

  // ── Director helpers ──────────────────────────────────────────────────────
  const addDirector = () => {
    if (directors.length < 3) {
      setDirectors([...directors, { name: '', id_number: '' }]);
    }
  };

  const removeDirector = (i: number) => {
    setDirectors(directors.filter((_, idx) => idx !== i));
  };

  const updateDirector = (i: number, field: keyof Director, value: string) => {
    setDirectors(directors.map((d, idx) => idx === i ? { ...d, [field]: value } : d));
  };

  // ── Step validation ───────────────────────────────────────────────────────
  const canAdvanceStep1 = companyName.trim().length >= 2;

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(`/api/onboard/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName.trim(),
          registration_number: regNumber.trim() || undefined,
          vat_number: vatNumber.trim() || undefined,
          tax_number: taxNumber.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          whatsapp_number: whatsapp.trim() || undefined,
          address: address.trim() || undefined,
          directors: directors.filter(d => d.name.trim()),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Submission failed');
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step progress indicator ───────────────────────────────────────────────
  const steps = [
    { num: 1, label: 'Company Info' },
    { num: 2, label: 'Contact Details' },
    { num: 3, label: 'Directors' },
  ];

  // ── Render helpers ────────────────────────────────────────────────────────
  if (firmLoading) {
    return (
      <div style={pageWrap}>
        <div style={card}>
          <Logo size={36} showText />
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <div style={spinner} />
            <p style={{ color: 'var(--text-muted)', marginTop: 16 }}>Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  if (firmError) {
    return (
      <div style={pageWrap}>
        <div style={card}>
          <Logo size={36} showText />
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>⚠️</div>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 8 }}>Invalid Link</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{firmError}</p>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={pageWrap}>
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
          <Logo size={32} showText />
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: 20, marginBottom: 8 }}>
            You&apos;re all set!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: 340, margin: '0 auto 8px' }}>
            Your profile for <strong>{companyName}</strong> has been created with <strong>{firmName}</strong>.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: 340, margin: '0 auto' }}>
            A consultant will be in touch shortly to guide you through the next steps.
            {whatsapp && ' Check your WhatsApp for a welcome message.'}
          </p>
          <div style={{ marginTop: 32, padding: '16px 20px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              🔒 Your information is securely stored and only accessible to <strong>{firmName}</strong>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={pageWrap}>
      <div style={card}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <Logo size={32} showText />
          <div style={{ marginTop: 20, padding: '10px 14px', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              🏢 You&apos;re onboarding with <strong style={{ color: 'var(--text-primary)' }}>{firmName}</strong>
            </p>
          </div>
        </div>

        {/* Step progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {steps.map(s => (
            <div key={s.num} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{
                height: 4,
                borderRadius: 99,
                background: step >= s.num ? 'var(--primary, #3B82F6)' : 'var(--border-primary)',
                transition: 'background 0.3s ease'
              }} />
              <span style={{ fontSize: '0.68rem', color: step === s.num ? 'var(--primary, #3B82F6)' : 'var(--text-muted)', fontWeight: step === s.num ? 600 : 400 }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Step 1: Company Info ── */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 4 }}>Company Information</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>
              Tell us about your business. Fields marked * are required.
            </p>

            <div style={formGroup}>
              <label style={label}>Company Name *</label>
              <input
                id="onboard-company-name"
                className="input"
                type="text"
                placeholder="e.g. Stark Industries (Pty) Ltd"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                autoFocus
              />
            </div>

            <div style={formGroup}>
              <label style={label}>CIPC Registration Number</label>
              <input
                id="onboard-reg-number"
                className="input"
                type="text"
                placeholder="e.g. 2023/654922/07"
                value={regNumber}
                onChange={e => setRegNumber(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={formGroup}>
                <label style={label}>VAT Number</label>
                <input
                  id="onboard-vat"
                  className="input"
                  type="text"
                  placeholder="10-digit VAT no."
                  value={vatNumber}
                  onChange={e => setVatNumber(e.target.value)}
                />
              </div>
              <div style={formGroup}>
                <label style={label}>Tax Number</label>
                <input
                  id="onboard-tax"
                  className="input"
                  type="text"
                  placeholder="10-digit tax ref."
                  value={taxNumber}
                  onChange={e => setTaxNumber(e.target.value)}
                />
              </div>
            </div>

            <button
              id="onboard-next-1"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
              disabled={!canAdvanceStep1}
              onClick={() => setStep(2)}
            >
              Next: Contact Details →
            </button>
          </div>
        )}

        {/* ── Step 2: Contact Details ── */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 4 }}>Contact Details</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>
              How can your consultant reach you?
            </p>

            <div style={formGroup}>
              <label style={label}>Email Address</label>
              <input
                id="onboard-email"
                className="input"
                type="email"
                placeholder="billing@yourcompany.co.za"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={formGroup}>
                <label style={label}>Phone Number</label>
                <input
                  id="onboard-phone"
                  className="input"
                  type="tel"
                  placeholder="+27 11 000 0000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
              <div style={formGroup}>
                <label style={label}>WhatsApp Number</label>
                <input
                  id="onboard-whatsapp"
                  className="input"
                  type="tel"
                  placeholder="+27 82 000 0000"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                />
              </div>
            </div>

            <div style={{ ...formGroup, marginBottom: 4 }}>
              <label style={{ ...label, display: 'flex', alignItems: 'center', gap: 6 }}>
                WhatsApp Number
                {whatsapp && (
                  <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'rgba(16,185,129,0.1)', color: '#10B981', borderRadius: 99, fontWeight: 600 }}>
                    ✓ We'll send a welcome message here
                  </span>
                )}
              </label>
            </div>

            <div style={formGroup}>
              <label style={label}>Physical Address</label>
              <textarea
                id="onboard-address"
                className="input"
                placeholder="123 Main Street, Sandton, Johannesburg, 2196"
                value={address}
                onChange={e => setAddress(e.target.value)}
                rows={3}
                style={{ resize: 'vertical', minHeight: 70 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setStep(1)}
              >
                ← Back
              </button>
              <button
                id="onboard-next-2"
                className="btn btn-primary"
                style={{ flex: 2, justifyContent: 'center' }}
                onClick={() => setStep(3)}
              >
                Next: Directors →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Directors ── */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 4 }}>Directors / Members</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 24 }}>
              List the directors or members of the company (up to 3). This is used for compliance records.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {directors.map((d, i) => (
                <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Director {i + 1}
                    </span>
                    {directors.length > 1 && (
                      <button
                        onClick={() => removeDirector(i)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red, #EF4444)', fontSize: '0.75rem', padding: '2px 6px' }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ ...label, fontSize: '0.75rem' }}>Full Name</label>
                      <input
                        id={`onboard-director-name-${i}`}
                        className="input"
                        type="text"
                        placeholder="Full name as on ID"
                        value={d.name}
                        onChange={e => updateDirector(i, 'name', e.target.value)}
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ ...label, fontSize: '0.75rem' }}>ID Number</label>
                      <input
                        id={`onboard-director-id-${i}`}
                        className="input"
                        type="text"
                        placeholder="13-digit SA ID"
                        value={d.id_number}
                        onChange={e => updateDirector(i, 'id_number', e.target.value)}
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {directors.length < 3 && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={addDirector}
                style={{ marginBottom: 20 }}
              >
                + Add Another Director
              </button>
            )}

            {submitError && (
              <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-md)', marginBottom: 16, color: 'var(--red, #EF4444)', fontSize: '0.85rem' }}>
                {submitError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => setStep(2)}
              >
                ← Back
              </button>
              <button
                id="onboard-submit"
                className="btn btn-primary"
                style={{ flex: 2, justifyContent: 'center' }}
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting
                  ? <><span style={spinner} /> Submitting…</>
                  : '✓ Complete Onboarding'}
              </button>
            </div>

            <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 16 }}>
              🔒 Your data is encrypted and only shared with {firmName}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const pageWrap: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 16px',
  background: 'var(--bg-primary, #0f172a)',
};

const card: React.CSSProperties = {
  width: '100%',
  maxWidth: 520,
  background: 'var(--bg-card, #1e293b)',
  border: '1px solid var(--border-primary, rgba(255,255,255,0.08))',
  borderRadius: 'var(--radius-xl, 16px)',
  padding: '32px 28px',
  boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
};

const formGroup: React.CSSProperties = {
  marginBottom: 16,
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const spinner: React.CSSProperties = {
  display: 'inline-block',
  width: 14,
  height: 14,
  borderRadius: '50%',
  border: '2px solid rgba(255,255,255,0.3)',
  borderTopColor: '#fff',
  animation: 'spin 0.8s linear infinite',
  marginRight: 8,
};
