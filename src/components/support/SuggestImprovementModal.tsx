'use client';

import React, { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { IMPROVEMENT_CATEGORIES, IMPROVEMENT_URGENCIES } from '@/lib/improvement-categories';

type FormState = {
  category: string;
  urgency: string;
  title: string;
  description: string;
};

const EMPTY_FORM: FormState = {
  category: '',
  urgency: '',
  title: '',
  description: '',
};

type SuggestImprovementModalProps = {
  isOpen: boolean;
  onClose: () => void;
  reporter?: {
    name?: string | null;
    email?: string | null;
    company?: string;
    tenantSlug?: string | null;
  };
};

export default function SuggestImprovementModal({
  isOpen,
  onClose,
  reporter,
}: SuggestImprovementModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const resetAndClose = () => {
    setForm(EMPTY_FORM);
    setError('');
    setSubmitted(false);
    onClose();
  };

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/contact/improvement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={resetAndClose}
      role="presentation"
    >
      <div
        className="improvement-modal w-full max-w-[520px] overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--bg-card)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="improvement-modal-title"
      >
        <div className="improvement-modal-header">
          <h2 id="improvement-modal-title" className="improvement-modal-title">
            Suggest an improvement
          </h2>
          <button
            type="button"
            className="improvement-modal-close"
            onClick={resetAndClose}
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="improvement-modal-body">
          {submitted ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                <CheckCircle2 className="size-6" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Request received
              </h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Thanks for helping us improve PraxisOne. We review every feature
                request and use them to shape the roadmap.
              </p>
              <Button type="button" variant="primary" className="mt-5" onClick={resetAndClose}>
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="stack">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                  {error}
                </div>
              )}

              {reporter?.email && (
                <p className="text-xs text-[var(--text-muted)]">
                  Submitting as {reporter.name || reporter.email}
                  {reporter.company ? ` · ${reporter.company}` : ''}
                </p>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="improvement-category">
                  Product category
                </label>
                <select
                  id="improvement-category"
                  className="select"
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  required
                >
                  <option value="">Select product category</option>
                  {IMPROVEMENT_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="improvement-urgency">
                  Urgency
                </label>
                <select
                  id="improvement-urgency"
                  className="select"
                  value={form.urgency}
                  onChange={(e) => updateField('urgency', e.target.value)}
                  required
                >
                  <option value="">Select urgency</option>
                  {IMPROVEMENT_URGENCIES.map((urgency) => (
                    <option key={urgency.value} value={urgency.value}>
                      {urgency.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="improvement-title">
                  Title
                </label>
                <input
                  id="improvement-title"
                  className="input"
                  type="text"
                  placeholder="Short summary of your idea"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  required
                  maxLength={120}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="improvement-description">
                  Description
                </label>
                <textarea
                  id="improvement-description"
                  className="textarea"
                  rows={5}
                  placeholder="Describe the improvement and how it would help your firm"
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  required
                />
              </div>

              <div className="improvement-modal-footer">
                <Button type="button" variant="outline" onClick={resetAndClose}>
                  Close
                </Button>
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? 'Sending…' : 'Request feature'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      <style jsx>{`
        .improvement-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 18px 20px;
          border-bottom: 1px solid var(--border-primary);
        }

        .improvement-modal-title {
          margin: 0;
          width: 100%;
          text-align: center;
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .improvement-modal-close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          flex-shrink: 0;
        }

        .improvement-modal-close:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .improvement-modal-body {
          padding: 20px;
        }

        .improvement-modal-footer {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding-top: 8px;
          border-top: 1px solid var(--border-primary);
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}
