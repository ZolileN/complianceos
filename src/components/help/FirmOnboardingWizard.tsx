'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

import {
  FIRM_ONBOARDING_OPEN_EVENT,
  setFirmOnboardingVisibility,
} from '@/lib/firm-onboarding-events';

export { openFirmOnboardingWizard } from '@/lib/firm-onboarding-events';

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
    body: 'Your workspace is ready. This quick tour walks through firm profile, team, clients, and inbox setup.',
    icon: Sparkles,
    href: '/dashboard',
  },
  {
    title: 'Configure your firm profile',
    body: 'Add your logo, contact details, and workspace slug below. Clients will see your brand on onboarding links.',
    icon: Building2,
    href: '/dashboard/settings?tab=profile',
  },
  {
    title: 'Invite your team',
    body: 'Add administrators, operations managers, and consultants so everyone can collaborate on client work.',
    icon: UsersRound,
    href: '/dashboard/team',
  },
  {
    title: 'Add your first client',
    body: 'Create a client record or copy your public onboarding link for prospects to submit their details.',
    icon: UsersRound,
    href: '/dashboard/clients/new',
  },
  {
    title: 'Set up your inbox',
    body: 'Forward client and SARS email to your inbound address. PDF attachments are classified automatically.',
    icon: Mail,
    href: '/dashboard/inbox',
  },
  {
    title: 'You are all set',
    body: 'Explore the dashboard, upload documents for OCR, and track compliance deadlines across your portfolio.',
    icon: CheckCircle2,
    href: '/dashboard',
  },
] as const;

async function fetchOnboardingState(): Promise<OnboardingState | null> {
  const res = await fetch('/api/settings/onboarding');
  const json = await res.json();
  if (!res.ok || !json.data) return null;
  return json.data as OnboardingState;
}

export default function FirmOnboardingWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  const openWizard = useCallback(async (startStep?: number) => {
    try {
      const data = await fetchOnboardingState();
      if (!data) return;
      const shouldShow = data.showWizard || startStep !== undefined;
      if (!shouldShow) return;
      setState(data);
      const initialStep = startStep ?? Math.min(data.lastStep || 0, STEPS.length - 1);
      setStep(initialStep);
      setVisible(true);
      setFirmOnboardingVisibility(true);
      const href = STEPS[initialStep]?.href;
      if (href) router.push(href);
    } catch {
      // ignore
    }
  }, [router]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void openWizard();
    }, 0);
    return () => window.clearTimeout(id);
  }, [openWizard]);

  useEffect(() => {
    const onReplay = (event: Event) => {
      const startStep =
        (event as CustomEvent<{ startStep?: number }>).detail?.startStep ?? 0;
      void openWizard(startStep);
    };
    window.addEventListener(FIRM_ONBOARDING_OPEN_EVENT, onReplay);
    return () => window.removeEventListener(FIRM_ONBOARDING_OPEN_EVENT, onReplay);
  }, [openWizard]);

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

  const goToStep = (nextStep: number) => {
    setStep(nextStep);
    void persistStep(nextStep);
    const href = STEPS[nextStep]?.href;
    if (href) router.push(href);
  };

  const close = (action: 'complete' | 'dismiss') => {
    setVisible(false);
    setFirmOnboardingVisibility(false);
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
    <div
      role="dialog"
      aria-labelledby="firm-onboarding-title"
      className="fixed bottom-6 left-6 z-[1100] w-[min(100vw-2rem,26rem)] overflow-hidden rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-card)] shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-primary)] px-4 py-3">
        <div className="min-w-0 pr-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
            Firm setup · Step {step + 1} of {STEPS.length}
          </p>
          <h2
            id="firm-onboarding-title"
            className="truncate text-base font-semibold text-[var(--text-primary)]"
          >
            {current.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => close('dismiss')}
          className="shrink-0 rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
          aria-label="Dismiss onboarding"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
          <Icon className="size-5" />
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

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-primary)] px-4 py-3">
        <Button type="button" variant="ghost" size="sm" onClick={() => close('dismiss')}>
          Skip
        </Button>
        <div className="flex gap-2">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goToStep(step - 1)}
            >
              Back
            </Button>
          ) : null}
          {isLast ? (
            <Button type="button" variant="primary" size="sm" onClick={() => close('complete')}>
              Finish
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => goToStep(step + 1)}
            >
              Continue
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
