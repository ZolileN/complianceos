import type { Metadata } from 'next';

import LandingShell from '@/components/landing/LandingShell';
import LegalPageContent, { legalContactFooter } from '@/components/landing/LegalPageContent';
import { DPA_LAST_UPDATED, DPA_SECTIONS } from '@/lib/dpa-content';

const PAGE_TITLE = 'Data Processing Agreement | PraxisOne';
const PAGE_DESCRIPTION =
  'PraxisOne Data Processing Agreement (DPA) for South African compliance firms under POPIA.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: '/dpa' },
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    url: '/dpa',
    siteName: 'PraxisOne',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

export default function DpaPage() {
  return (
    <LandingShell>
      <LegalPageContent
        tag="Legal"
        title="Data processing agreement"
        lastUpdated={DPA_LAST_UPDATED}
        sections={DPA_SECTIONS}
        footerNote={legalContactFooter()}
      />
    </LandingShell>
  );
}
