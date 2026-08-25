import type { Metadata } from 'next';

import LandingShell from '@/components/landing/LandingShell';
import LegalPageContent, { legalContactFooter } from '@/components/landing/LegalPageContent';
import {
  TERMS_OF_SERVICE_LAST_UPDATED,
  TERMS_OF_SERVICE_SECTIONS,
} from '@/lib/terms-of-service-content';

const PAGE_TITLE = 'Terms of Service | PraxisOne';
const PAGE_DESCRIPTION =
  'Terms governing use of the PraxisOne compliance platform for South African professional services firms.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/terms' },
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    url: '/terms',
    siteName: 'PraxisOne',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

export default function TermsOfServicePage() {
  return (
    <LandingShell>
      <LegalPageContent
        tag="Legal"
        title="Terms of service"
        lastUpdated={TERMS_OF_SERVICE_LAST_UPDATED}
        sections={TERMS_OF_SERVICE_SECTIONS}
        footerNote={legalContactFooter()}
      />
    </LandingShell>
  );
}
