'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Copy,
  Mail,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';

import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/button';

type OnboardingState = {
  showWizard: boolean;
  lastStep: number;
  tenantSlug: string;
  firmName: string;
  onboardingUrl: string;
  inboundAddress: string;
  whatsappConnected: boolean;
  stats: { clients: number; users: number };
};

const STEPS = [
  {
    title: 'Welcome to PraxisOne',
    body: 'Your workspace is ready. This quick tour shows how to set up clients, compliance, and communications.',
    icon: Sparkles,
  },
  {
    title: 'Configure your firm profile',
    body: 'Add your logo, contact details, and workspace slug in Settings so clients recognise your brand.',
    icon: Building2,
    href: '/dashboard/settings?tab=profile',
    cta: 'Open Settings',
  },
  {
    title: 'Invite your team',
    body: 'Add administrators, operations managers, and consultants so everyone can collaborate on client work.',
    icon: UsersRound,
    href: '/dashboard/team',
    cta: 'Invite team',
  },
  {
    title: 'Add your first client',
    body: 'Create a client manually or share your public onboarding link so prospects can submit their details.',
    icon: UsersRound,
    href: '/dashboard/clients/new',
    cta: 'Add client',
  },
  {
    title: 'Set up your inbox',
    body: 'Forward client and SARS email to your inbound address. PDF attachments are classified automatically.',
    icon: Mail,
    href: '/dashboard/inbox',
    cta: 'Open inbox',
  },
  {
    title: 'You are all set',
    body: 'Explore the dashboard, upload documents for OCR, and track compliance deadlines across your portfolio.',
    icon: CheckCircle2,
  },
] as const;

export default function FirmOnboardingWizard() {
  const { toast } = useToast();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      fetch('/api/settings/onboarding')
        .then((r) => r.json())
        .then((json) => {
          if (cancelled || !json.data?.showWizard) return;
          setState(json.data);
          setStep(Math.min(json.data.lastStep || 0, STEPS.length - 1));
          setVisible(true);
        })
        .catch(() => {});
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, []);

  const persistStep = async (nextStep: number, action?: 'complete' | 'dismiss') => {
    try {
      await fetch('/api/settings/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          action ? { action } : { action: 'step', step: nextStep }
        ),
      });
    } catch {
      // non-blocking
    }
  };

  const close = (action: 'complete' | 'dismiss') => {
    setVisible(false);
    void persistStep(step, action);
  };

  const copyOnboardingLink = async () => {
    if (!state?.onboardingUrl) return;
    try {
      await navigator.clipboard.writeText(state.onboardingUrl);
      toast('Client onboarding link copied', 'success');
    } catch {
      toast('Could not copy link', 'error');
    }
  };

  if (!visible || !state) return null;

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-labelledby="firm-onboarding-title"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
              Firm setup · Step {step + 1} of {STEPS.length}
            </p>
            <h2 id="firm-onboarding-title" className="text-lg font-semibold text-[var(--text-primary)]">
              {current.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => close('dismiss')}
            className="rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
            aria-label="Dismiss onboarding"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-6">
          <div className="flex size-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
            <Icon className="size-6" />
          </div>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{current.body}</p>

          {step === 3 && state.onboardingUrl ? (
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3 text-xs">
              <p className="font-medium text-[var(--text-primary)]">Public onboarding link</p>
              <p className="mt-1 break-all font-mono text-[var(--text-secondary)]">{state.onboardingUrl}</p>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={copyOnboardingLink}>
                <Copy className="size-3.5" />
                Copy link
              </Button>
            </div>
          ) : null}

          {step === 4 && state.inboundAddress ? (
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3 text-xs">
              <p className="font-medium text-[var(--text-primary)]">Inbound email address</p>
              <p className="mt-1 break-all font-mono text-[var(--text-secondary)]">{state.inboundAddress}</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-primary)] px-5 py-4">
          <Button type="button" variant="ghost" size="sm" onClick={() => close('dismiss')}>
            Skip for now
          </Button>
          <div className="flex gap-2">
            {step > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const prev = step - 1;
                  setStep(prev);
                  void persistStep(prev);
                }}
              >
                Back
              </Button>
            ) : null}
            {'href' in current && current.href ? (
              <Button variant="primary" size="sm" asChild>
                <Link href={current.href} onClick={() => void persistStep(step)}>
                  {current.cta}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : isLast ? (
              <Button type="button" variant="primary" size="sm" onClick={() => close('complete')}>
                Go to dashboard
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  const next = step + 1;
                  setStep(next);
                  void persistStep(next);
                }}
              >
                Continue
                <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
