export const PRIVACY_POLICY_LAST_UPDATED = '25 August 2026';

export const PRIVACY_POLICY_SECTIONS = [
  {
    title: 'Who we are',
    paragraphs: [
      'PraxisOne is operated by MLK Computer Consulting, based in Cape Town, South Africa. We provide B2B software for compliance, accounting, and advisory firms.',
      'This Privacy Policy explains how we collect, use, store, and protect personal information when you use our website and platform, in line with the Protection of Personal Information Act (POPIA).',
    ],
  },
  {
    title: 'Information we collect',
    paragraphs: [
      'Account data: names, email addresses, phone numbers, firm details, and role assignments for workspace users.',
      'Client data: information your firm uploads about its clients (company details, directors, tax references, documents, messages, and compliance records). Your firm is the responsible party for client data; we process it on your instructions as an operator.',
      'Usage data: authentication logs, audit events, feature usage, and technical diagnostics needed to operate and secure the service.',
      'Communications: WhatsApp and email messages routed through the platform, including attachments your firm chooses to store.',
      'Billing data: subscription plan, payment references, and billing contact details. Card and bank payment details are handled by our payment partners (Paystack and, where available, Ozow) and are not stored on our servers.',
    ],
  },
  {
    title: 'How we use information',
    paragraphs: [
      'To provide, maintain, and improve PraxisOne for your firm.',
      'To send transactional emails (invites, password resets, compliance alerts, billing notices).',
      'To process documents (including OCR extraction) and automate workflows you configure.',
      'To enforce security, prevent abuse, and meet legal obligations.',
      'We do not sell personal information. We do not use client document vault contents for advertising.',
    ],
  },
  {
    title: 'Tenant isolation and access',
    paragraphs: [
      'Each firm operates in an isolated tenant workspace. Users only see data their role permits within that tenant.',
      'Platform administrators can access tenant configuration (billing, limits, suspension) but not client document vaults — the POPIA Privacy Shield model described in our admin console.',
      'Consultants are restricted to clients and tasks assigned to them unless your firm grants broader access.',
    ],
  },
  {
    title: 'Sub-processors and hosting',
    paragraphs: [
      'We work with carefully selected service providers to host the platform, store files securely, deliver email and WhatsApp messages, process payments, and (on eligible plans) assist with document automation.',
      'These partners process data only as needed to provide the service. We require appropriate contractual safeguards, including for cross-border transfers where applicable.',
      'A current list of categories of sub-processors is available on request.',
    ],
  },
  {
    title: 'Retention and deletion',
    paragraphs: [
      'We retain account and audit data for as long as your subscription is active and for a reasonable period afterward to meet legal and billing obligations.',
      'When a tenant is deleted, associated workspace data is removed from production systems subject to backup retention windows.',
      'Your firm controls client records and may delete clients, documents, and messages from within the dashboard.',
    ],
  },
  {
    title: 'Your rights',
    paragraphs: [
      'Under POPIA, data subjects may request access, correction, or deletion of personal information we hold about them as operator, subject to your firm\'s instructions and legal retention requirements.',
      'Workspace administrators can export firm data and manage user access from the dashboard.',
      'To exercise rights or raise a privacy concern, contact us using the details on our website.',
    ],
  },
  {
    title: 'Security',
    paragraphs: [
      'We use encryption in transit (TLS), role-based access control, audit logging, and infrastructure monitoring. See our Security page for an overview of controls.',
      'No system is perfectly secure. Report suspected incidents to us promptly so we can investigate.',
    ],
  },
  {
    title: 'Contact',
    paragraphs: [
      'For privacy enquiries or information officer requests, use the Contact form on our website or email the address listed on your invoice.',
    ],
  },
] as const;
