export const DPA_LAST_UPDATED = '25 August 2026';

export const DPA_SECTIONS = [
  {
    title: 'Parties and scope',
    paragraphs: [
      'This Data Processing Agreement ("DPA") forms part of the agreement between your firm ("Controller") and MLK Computer Consulting, trading as PraxisOne ("Processor"), when you use the PraxisOne platform.',
      'It governs how we process personal information on your behalf as operator under the Protection of Personal Information Act 4 of 2013 (POPIA), including information about your staff, clients, and communications routed through the service.',
    ],
  },
  {
    title: 'Subject matter and duration',
    paragraphs: [
      'We process personal information solely to provide, secure, and improve the PraxisOne service for your firm for the duration of your subscription and any reasonable wind-down period required by law or contract.',
      'Processing includes storage of client records, document vault contents, compliance data, audit logs, WhatsApp and email messages, and billing references.',
    ],
  },
  {
    title: 'Nature and purpose of processing',
    paragraphs: [
      'Hosting and displaying workspace data to authorised users within your tenant.',
      'Document ingestion, OCR extraction, and workflow automation you configure.',
      'Compliance monitoring, deadline alerts, and reporting.',
      'Transactional communications (invites, password resets, alerts, billing notices).',
      'Security monitoring, abuse prevention, and support when you contact us.',
    ],
  },
  {
    title: 'Types of personal information',
    paragraphs: [
      'Staff account data: names, email addresses, phone numbers, roles, and authentication logs.',
      'Client data uploaded by your firm: company details, directors, tax and registration references, documents, messages, and compliance records.',
      'Communications metadata and content routed through integrated channels (email, WhatsApp).',
      'Billing and subscription contact details. Payment card data is processed by Paystack and not stored on our servers.',
    ],
  },
  {
    title: 'Controller obligations',
    paragraphs: [
      'You are responsible for ensuring you have a lawful basis to collect and upload client personal information to PraxisOne.',
      'You will provide data subjects with appropriate privacy notices and honour access, correction, and deletion requests in line with POPIA.',
      'You will configure role-based access appropriately and promptly disable users who should no longer have access.',
      'You will not upload special personal information unless strictly necessary and permitted by law.',
    ],
  },
  {
    title: 'Processor obligations',
    paragraphs: [
      'We process personal information only on your documented instructions, including those in this DPA, our Terms of Service, and your use of platform features.',
      'We implement appropriate technical and organisational measures to protect personal information, as described on our Security page.',
      'We maintain tenant isolation so users only access data permitted by their role within your workspace.',
      'We do not sell personal information or use client document vault contents for advertising.',
      'We will notify you without undue delay if we become aware of a personal information breach affecting your tenant.',
    ],
  },
  {
    title: 'Sub-processors',
    paragraphs: [
      'We use carefully selected sub-processors for hosting, file storage, email delivery, WhatsApp messaging, payments, and (on eligible plans) document automation assistance.',
      'Sub-processors process data only as needed to provide the service and are bound by contractual safeguards appropriate to the nature of processing.',
      'A current list of categories of sub-processors is available on request. Material changes will be communicated in advance where required.',
    ],
  },
  {
    title: 'International transfers',
    paragraphs: [
      'Some sub-processors may process data outside South Africa. Where this occurs, we rely on appropriate safeguards such as standard contractual clauses or equivalent protections required by POPIA.',
    ],
  },
  {
    title: 'Assistance with data subject rights',
    paragraphs: [
      'We will assist you, taking into account the nature of processing, with responding to data subject requests to access, correct, or delete personal information we process on your behalf, where technically feasible.',
      'Workspace administrators can export firm data and manage users from the dashboard.',
    ],
  },
  {
    title: 'Retention and deletion',
    paragraphs: [
      'We retain data for as long as your subscription is active and for a reasonable period afterward to meet legal, billing, and security obligations.',
      'Upon verified termination and deletion request, we will delete or anonymise your tenant data from production systems subject to backup retention windows.',
      'You may delete clients, documents, and messages from within the dashboard at any time.',
    ],
  },
  {
    title: 'Audits and information',
    paragraphs: [
      'We will make available information reasonably necessary to demonstrate compliance with this DPA, such as security summaries and sub-processor categories.',
      'Formal audits may be conducted no more than once per year on reasonable notice, subject to confidentiality and without disrupting other customers.',
    ],
  },
  {
    title: 'Contact',
    paragraphs: [
      'For DPA or information officer enquiries, use the Contact form on our website or email the address listed on your invoice.',
      'This DPA should be read together with our Privacy Policy, Terms of Service, and Security page.',
    ],
  },
] as const;
