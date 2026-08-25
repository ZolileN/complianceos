import type { Metadata } from 'next';

import LandingShell from '@/components/landing/LandingShell';
import LegalPageContent, { legalContactFooter } from '@/components/landing/LegalPageContent';
import {
  COOKIE_POLICY_LAST_UPDATED,
  COOKIE_POLICY_SECTIONS,
} from '@/lib/cookie-policy-content';

const PAGE_TITLE = 'Cookie Policy | PraxisOne';
const PAGE_DESCRIPTION =
  'How PraxisOne uses cookies and similar technologies on our website and platform.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/cookies' },
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    url: '/cookies',
    siteName: 'PraxisOne',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

export default function CookiePolicyPage() {
  return (
    <LandingShell>
      <LegalPageContent
        tag="Legal"
        title="Cookie policy"
        lastUpdated={COOKIE_POLICY_LAST_UPDATED}
        sections={COOKIE_POLICY_SECTIONS}
        footerNote={legalContactFooter()}
      />
    </LandingShell>
  );
}
