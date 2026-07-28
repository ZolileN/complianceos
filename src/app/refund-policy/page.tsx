import type { Metadata } from 'next';

import LandingShell from '@/components/landing/LandingShell';
import RefundPolicyContent from '@/components/landing/RefundPolicyContent';

const PAGE_TITLE = 'Refund & Cancellation Policy | PraxisOne';
const PAGE_DESCRIPTION =
  'How PraxisOne subscriptions, cancellations, and refunds work for South African compliance and accounting firms.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: '/refund-policy',
  },
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    url: '/refund-policy',
    siteName: 'PraxisOne',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

export default function RefundPolicyPage() {
  return (
    <LandingShell>
      <RefundPolicyContent />
    </LandingShell>
  );
}
