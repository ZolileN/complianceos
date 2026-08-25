import type { Metadata } from 'next';

import LandingShell from '@/components/landing/LandingShell';
import LegalPageContent, { legalContactFooter } from '@/components/landing/LegalPageContent';
import {
  SECURITY_PAGE_LAST_UPDATED,
  SECURITY_PAGE_SECTIONS,
} from '@/lib/security-page-content';

const PAGE_TITLE = 'Security & Trust | PraxisOne';
const PAGE_DESCRIPTION =
  'How PraxisOne protects tenant data with isolation, encryption, RBAC, and POPIA-aligned controls.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/security' },
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    url: '/security',
    siteName: 'PraxisOne',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

export default function SecurityPage() {
  return (
    <LandingShell>
      <LegalPageContent
        tag="Trust"
        title="Security & trust"
        lastUpdated={SECURITY_PAGE_LAST_UPDATED}
        sections={SECURITY_PAGE_SECTIONS}
        footerNote={legalContactFooter()}
      />
    </LandingShell>
  );
}
