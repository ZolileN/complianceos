import type { Metadata } from 'next';
import LandingShell from '@/components/landing/LandingShell';
import LandingPageContent from '@/components/landing/LandingPageContent';
import { LANDING_FAQS } from '@/lib/landing-content';

const SITE_URL = 'https://praxis.mlkcomputer.com';
const PAGE_TITLE = 'Compliance Software for South African Firms | PraxisOne';
const PAGE_DESCRIPTION =
  'Manage CIPC and SARS deadlines, clients, documents, workflows and WhatsApp in one platform built for South African accounting firms. Start a 14-day trial.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    url: '/',
    siteName: 'PraxisOne',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [
      {
        url: '/images/landing/dashboard-tour.jpg',
        width: 1024,
        height: 516,
        alt: 'PraxisOne compliance operations dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ['/images/landing/dashboard-tour.jpg'],
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://www.mlkcomputer.com/#organization',
      name: 'MLK Computer Consulting',
      url: 'https://www.mlkcomputer.com/',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Cape Town',
        postalCode: '8001',
        addressCountry: 'ZA',
      },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'PraxisOne',
      url: SITE_URL,
      inLanguage: 'en-ZA',
      publisher: {
        '@id': 'https://www.mlkcomputer.com/#organization',
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: 'PraxisOne',
      url: SITE_URL,
      description: PAGE_DESCRIPTION,
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Compliance Management Software',
      operatingSystem: 'Web',
      inLanguage: 'en-ZA',
      creator: {
        '@id': 'https://www.mlkcomputer.com/#organization',
      },
      areaServed: {
        '@type': 'Country',
        name: 'South Africa',
      },
      featureList: [
        'CIPC and SARS compliance deadline tracking',
        'Client operations and onboarding',
        'Document intelligence and secure storage',
        'Team workflows and task management',
        'WhatsApp client communications',
      ],
      offers: [
        {
          '@type': 'Offer',
          name: 'Starter',
          price: '999',
          priceCurrency: 'ZAR',
          url: `${SITE_URL}/signup?plan=starter`,
          availability: 'https://schema.org/InStock',
        },
        {
          '@type': 'Offer',
          name: 'Growth',
          price: '2999',
          priceCurrency: 'ZAR',
          url: `${SITE_URL}/signup?plan=growth`,
          availability: 'https://schema.org/InStock',
        },
        {
          '@type': 'Offer',
          name: 'Professional',
          price: '7999',
          priceCurrency: 'ZAR',
          url: `${SITE_URL}/signup?plan=professional`,
          availability: 'https://schema.org/InStock',
        },
      ],
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#faq`,
      mainEntity: LANDING_FAQS.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <LandingShell>
        <LandingPageContent />
      </LandingShell>
    </>
  );
}
