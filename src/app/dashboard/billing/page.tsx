'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreditCard } from 'lucide-react';
import { Suspense } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import BillingPlanTab from '@/components/settings/BillingPlanTab';

function BillingPageContent() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const billingParam = searchParams.get('billing');

  const isAdmin = user?.role === 'administrator';

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!isAdmin) {
      router.push('/dashboard');
    }
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    if (billingParam === 'success') {
      toast('Payment received — subscription activated', 'success');
    }
    if (billingParam === 'cancelled') toast('Checkout cancelled', 'info');
    if (billingParam === 'error') {
      toast('Payment could not be completed', 'error');
    }
  }, [billingParam, toast]);

  if (authLoading || !user || !isAdmin) {
    return (
      <div className="flex-center py-24">
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-teal-700">
          <CreditCard className="size-3.5" />
          Billing
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[var(--text-primary)]">
          Manage subscription
        </h1>
        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
          View your plan, usage, renew or upgrade, and schedule cancellation at period end.
        </p>
      </section>

      <BillingPlanTab onToast={toast} />
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-center py-24">
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      }
    >
      <BillingPageContent />
    </Suspense>
  );
}
