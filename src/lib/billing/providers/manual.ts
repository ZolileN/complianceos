import type { BillingProvider } from '@/lib/billing/provider';

/** No external payment provider — admin activates plans manually. */
export const manualProvider: BillingProvider = {
  id: 'manual',
};
