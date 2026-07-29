import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getBillingProvider,
  ozowCheckoutAvailable,
  paystackCheckoutAvailable,
} from '@/lib/billing/provider';

function stubBillingEnv(opts: {
  billingProvider?: string;
  paystackKey?: string;
  ozow?: boolean;
}) {
  vi.stubEnv('BILLING_PROVIDER', opts.billingProvider ?? '');
  vi.stubEnv('PAYSTACK_SECRET_KEY', opts.paystackKey ?? '');
  if (opts.ozow) {
    vi.stubEnv('OZOW_SITE_CODE', 'site');
    vi.stubEnv('OZOW_PRIVATE_KEY', 'priv');
    vi.stubEnv('OZOW_API_KEY', 'api');
  } else {
    vi.stubEnv('OZOW_SITE_CODE', '');
    vi.stubEnv('OZOW_PRIVATE_KEY', '');
    vi.stubEnv('OZOW_API_KEY', '');
  }
}

describe('getBillingProvider', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefers Paystack when both Paystack and Ozow are configured', () => {
    stubBillingEnv({
      billingProvider: 'ozow',
      paystackKey: 'sk_test_abc',
      ozow: true,
    });

    expect(getBillingProvider().id).toBe('paystack');
  });

  it('uses Paystack when BILLING_PROVIDER=paystack and key is set', () => {
    stubBillingEnv({ billingProvider: 'paystack', paystackKey: 'sk_test_abc' });

    expect(getBillingProvider().id).toBe('paystack');
  });

  it('uses Ozow when Paystack is not configured', () => {
    stubBillingEnv({ billingProvider: 'ozow', ozow: true });

    expect(getBillingProvider().id).toBe('ozow');
  });

  it('uses manual when BILLING_PROVIDER=manual', () => {
    stubBillingEnv({
      billingProvider: 'manual',
      paystackKey: 'sk_test_abc',
      ozow: true,
    });

    expect(getBillingProvider().id).toBe('manual');
  });

  it('auto-selects Paystack when only Paystack is configured', () => {
    stubBillingEnv({ paystackKey: 'sk_test_abc' });

    expect(paystackCheckoutAvailable()).toBe(true);
    expect(getBillingProvider().id).toBe('paystack');
  });

  it('auto-selects Ozow when only Ozow is configured', () => {
    stubBillingEnv({ ozow: true });

    expect(ozowCheckoutAvailable()).toBe(true);
    expect(getBillingProvider().id).toBe('ozow');
  });
});
