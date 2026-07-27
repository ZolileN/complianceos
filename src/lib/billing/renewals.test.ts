import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    subscription: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/email', () => ({
  sendRenewalEmail: vi.fn(),
}));

vi.mock('@/lib/billing/providers/stitch', () => ({
  createExpressPayment: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { sendRenewalEmail } from '@/lib/email';
import { createExpressPayment } from '@/lib/billing/providers/stitch';
import { sendRenewalNotices } from '@/lib/billing/renewals';
import { nextPeriodEnd } from '@/lib/billing/dates';

const prismaMock = prisma as unknown as {
  subscription: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};
const sendRenewalEmailMock = sendRenewalEmail as unknown as ReturnType<
  typeof vi.fn
>;
const createExpressPaymentMock = createExpressPayment as unknown as ReturnType<
  typeof vi.fn
>;

describe('sendRenewalNotices', () => {
  const now = new Date('2026-07-27T08:00:00.000Z');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('STITCH_CLIENT_ID', 'test-client');
    vi.stubEnv('STITCH_CLIENT_SECRET', 'secret');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://praxis.mlkcomputer.com');
    prismaMock.subscription.update.mockResolvedValue({});
    sendRenewalEmailMock.mockResolvedValue({ success: true });
    createExpressPaymentMock.mockResolvedValue({
      checkoutUrl: 'https://express.stitch.money/pay/renew1?redirect_url=x',
      paymentId: 'pay_renew1',
    });
  });

  it('creates a Stitch payment link and emails tenants due for renewal', async () => {
    prismaMock.subscription.findMany.mockResolvedValue([
      {
        tenantId: 't1',
        plan: 'growth',
        currentPeriodEnd: new Date('2026-07-30T00:00:00.000Z'),
        tenant: { name: 'Acme Firm', email: 'owner@acme.co.za', slug: 'acme' },
      },
    ]);

    const result = await sendRenewalNotices(now);

    expect(result.renewalsSent).toBe(1);
    expect(createExpressPaymentMock).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 2_999_00, payerName: 'Acme Firm' })
    );
    expect(sendRenewalEmailMock).toHaveBeenCalledWith(
      'owner@acme.co.za',
      expect.objectContaining({
        planName: 'Growth',
        amountZar: '2999.00',
        payUrl: expect.stringContaining('express.stitch.money'),
      })
    );
    // Reference swap so the payment webhook can activate the renewal.
    expect(prismaMock.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 't1' },
        data: expect.objectContaining({ provider: 'stitch' }),
      })
    );
    // Notice marked sent.
    expect(prismaMock.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ renewalNoticeAt: now }),
      })
    );
  });

  it('skips tenants without an email address', async () => {
    prismaMock.subscription.findMany.mockResolvedValue([
      {
        tenantId: 't2',
        plan: 'growth',
        currentPeriodEnd: new Date('2026-07-30T00:00:00.000Z'),
        tenant: { name: 'No Email Firm', email: null, slug: 'noemail' },
      },
    ]);

    const result = await sendRenewalNotices(now);
    expect(result.renewalsSent).toBe(0);
    expect(result.renewalsSkipped).toBe(1);
    expect(sendRenewalEmailMock).not.toHaveBeenCalled();
  });

  it('falls back to the dashboard link when Stitch fails', async () => {
    createExpressPaymentMock.mockRejectedValue(new Error('express down'));
    prismaMock.subscription.findMany.mockResolvedValue([
      {
        tenantId: 't3',
        plan: 'professional',
        currentPeriodEnd: new Date('2026-07-29T00:00:00.000Z'),
        tenant: { name: 'Fallback Firm', email: 'fb@firm.co.za', slug: 'fb' },
      },
    ]);

    const result = await sendRenewalNotices(now);
    expect(result.renewalsSent).toBe(1);
    expect(sendRenewalEmailMock).toHaveBeenCalledWith(
      'fb@firm.co.za',
      expect.objectContaining({
        payUrl: 'https://praxis.mlkcomputer.com/dashboard/billing',
      })
    );
  });
});

describe('nextPeriodEnd', () => {
  it('extends from the current period end on early renewal', () => {
    const now = new Date('2026-07-27T00:00:00.000Z');
    const currentEnd = new Date('2026-07-30T00:00:00.000Z');
    expect(nextPeriodEnd(now, currentEnd).toISOString()).toBe(
      '2026-08-30T00:00:00.000Z'
    );
  });

  it('starts from now when the period already lapsed', () => {
    const now = new Date('2026-07-27T00:00:00.000Z');
    const lapsedEnd = new Date('2026-07-20T00:00:00.000Z');
    expect(nextPeriodEnd(now, lapsedEnd).toISOString()).toBe(
      '2026-08-27T00:00:00.000Z'
    );
  });
});
