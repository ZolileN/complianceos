import type { Metadata } from 'next';

import LandingShell from '@/components/landing/LandingShell';
import LegalPageContent, { legalContactFooter } from '@/components/landing/LegalPageContent';
import {
  PRIVACY_POLICY_LAST_UPDATED,
  PRIVACY_POLICY_SECTIONS,
} from '@/lib/privacy-policy-content';

const PAGE_TITLE = 'Privacy Policy | PraxisOne';
const PAGE_DESCRIPTION =
  'How PraxisOne collects, uses, and protects personal information for South African compliance firms under POPIA.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/privacy' },
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    url: '/privacy',
    siteName: 'PraxisOne',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <LandingShell>
      <LegalPageContent
        tag="Legal"
        title="Privacy policy"
        lastUpdated={PRIVACY_POLICY_LAST_UPDATED}
        sections={PRIVACY_POLICY_SECTIONS}
        footerNote={legalContactFooter()}
      />
    </LandingShell>
  );
}
