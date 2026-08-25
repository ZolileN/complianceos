export const TERMS_OF_SERVICE_LAST_UPDATED = '25 August 2026';

export const TERMS_OF_SERVICE_SECTIONS = [
  {
    title: 'Agreement',
    paragraphs: [
      'These Terms of Service govern your use of PraxisOne, operated by MLK Computer Consulting. By creating an account or using the service, you agree to these terms on behalf of your firm.',
      'If you do not agree, do not use the platform.',
    ],
  },
  {
    title: 'Service description',
    paragraphs: [
      'PraxisOne is a multi-tenant B2B platform for client management, compliance tracking, document storage, workflows, communications, and related professional services operations.',
      'The service assists your firm with organisation and automation. It does not file returns or submissions to SARS, CIPC, or other government bodies on your behalf unless explicitly agreed in writing for a specific integration.',
    ],
  },
  {
    title: 'Accounts and responsibilities',
    paragraphs: [
      'You are responsible for maintaining the confidentiality of login credentials and for all activity under your workspace.',
      'You must provide accurate registration information and keep billing details current.',
      'You are responsible for ensuring your use of the platform complies with applicable law, including POPIA when processing client personal information.',
      'You must not misuse the service, attempt unauthorised access, or upload unlawful content.',
    ],
  },
  {
    title: 'Subscriptions and billing',
    paragraphs: [
      'Paid plans are billed monthly in South African Rand unless otherwise agreed. Pricing is published on our website.',
      'Trials, renewals, cancellations, and refunds are described in our Refund & Cancellation Policy.',
      'We may suspend or limit access for non-payment, abuse, or security reasons, with notice where practicable.',
    ],
  },
  {
    title: 'Your data',
    paragraphs: [
      'You retain ownership of data you upload. You grant us a limited licence to host, process, and display that data solely to provide the service.',
      'You warrant that you have the right to upload and process client data in the platform.',
      'Our Privacy Policy describes how we handle personal information.',
    ],
  },
  {
    title: 'Availability and support',
    paragraphs: [
      'We aim for high availability but do not guarantee uninterrupted service. Maintenance, third-party outages, or force majeure may cause downtime.',
      'Support is provided via in-app contact channels and email during business hours. Enterprise customers may have separate support terms.',
    ],
  },
  {
    title: 'Limitation of liability',
    paragraphs: [
      'PraxisOne is provided "as is" to the maximum extent permitted by law. We are not liable for indirect, consequential, or lost-profit damages.',
      'Our aggregate liability for any claim relating to the service is limited to the fees paid by your firm in the twelve months before the claim arose, except where liability cannot be limited by law.',
      'You remain solely responsible for regulatory filings, professional advice, and compliance outcomes for your clients.',
    ],
  },
  {
    title: 'Changes and termination',
    paragraphs: [
      'We may update these terms by posting a revised version and updating the "Last updated" date. Material changes will be communicated to workspace administrators.',
      'You may terminate by cancelling your subscription. We may terminate for material breach after notice where appropriate.',
    ],
  },
  {
    title: 'Governing law',
    paragraphs: [
      'These terms are governed by the laws of the Republic of South Africa. Disputes are subject to the jurisdiction of South African courts.',
    ],
  },
] as const;
