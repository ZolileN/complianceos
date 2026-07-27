'use client';

import React, { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type FormState = {
  name: string;
  email: string;
  company: string;
  message: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  company: '',
  message: '',
};

type SimpleInquiryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  badge: string;
  submitLabel: string;
  successTitle: string;
  successMessage: string;
  apiPath: string;
  initialValues?: Partial<FormState>;
  messagePlaceholder?: string;
};

export default function SimpleInquiryModal({
  isOpen,
  onClose,
  title,
  description,
  badge,
  submitLabel,
  successTitle,
  successMessage,
  apiPath,
  initialValues,
  messagePlaceholder = 'How can we help?',
}: SimpleInquiryModalProps) {
  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY_FORM,
    ...initialValues,
  }));
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
      const res = await fetch(apiPath, {
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
        className="w-full max-w-[440px] overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-modal-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-primary)] px-6 py-5">
          <div>
            <Badge variant="info" className="mb-2">
              {badge}
            </Badge>
            <h2 id="inquiry-modal-title" className="text-xl font-semibold text-[var(--text-primary)]">
              {title}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={resetAndClose}
            aria-label="Close"
            className="shrink-0"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="px-6 py-5">
          {submitted ? (
            <div className="py-4 text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                <CheckCircle2 className="size-6" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">{successTitle}</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{successMessage}</p>
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

              <div className="form-group">
                <label className="form-label">Full name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Work email</label>
                <input
                  className="input"
                  type="email"
                  placeholder="you@firm.co.za"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Company name</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Your firm"
                  value={form.company}
                  onChange={(e) => updateField('company', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea
                  className="textarea"
                  rows={3}
                  placeholder={messagePlaceholder}
                  value={form.message}
                  onChange={(e) => updateField('message', e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={resetAndClose}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? 'Sending…' : submitLabel}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
