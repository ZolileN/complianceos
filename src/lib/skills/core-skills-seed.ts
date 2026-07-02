/* Core skill seed data — used to populate the database with PraxisOne's built-in skills */

export const CORE_SKILLS = [
  {
    slug: 'document-ocr',
    name: 'Document OCR',
    description: 'Extract structured data from uploaded documents — invoices, IDs, tax certificates, and bank statements.',
    category: 'finance',
    icon: '🔍',
    isCore: true,
    isPublished: true,
    triggers: ['document.uploaded', 'invoice.uploaded'],
    requiredPermissions: ['documents.read', 'clients.read'],
    skillDefinition: 'When a document is uploaded, run OCR extraction to identify document type and extract structured fields. For invoices: supplier, amount, VAT, line items. For IDs: ID number, name, date of birth. For tax certs: tax number, status, expiry.',
    steps: [
      { name: 'Classify Document', stepOrder: 0, stepType: 'llm_call', config: { prompt: 'Classify this document as one of: invoice, id_document, tax_certificate, bank_statement, cor_document, vat_certificate, bee_certificate, other. Document text: {{input.ocrText}}' } },
      { name: 'Extract Fields', stepOrder: 1, stepType: 'llm_call', config: { prompt: 'Extract structured fields from this {{previous.result}} document. Return JSON with relevant fields. Text: {{input.ocrText}}' } },
      { name: 'Store Result', stepOrder: 2, stepType: 'database_query', config: { query: 'update_document_metadata' } },
    ],
  },
  {
    slug: 'email-understanding',
    name: 'Email Understanding',
    description: 'Parse incoming emails to extract company name, contact details, opportunity signals, and intent.',
    category: 'crm',
    icon: '📧',
    isCore: true,
    isPublished: true,
    triggers: ['message.received'],
    requiredPermissions: ['crm.read', 'crm.write'],
    skillDefinition: 'When an email or message is received, analyze the content to extract: sender company, contact person, communication intent (inquiry, complaint, follow-up, opportunity), and any actionable items.',
    steps: [
      { name: 'Extract Entities', stepOrder: 0, stepType: 'llm_call', config: { prompt: 'Extract entities from this message: company name, contact name, email, phone. Message: {{input.content}}' } },
      { name: 'Classify Intent', stepOrder: 1, stepType: 'llm_call', config: { prompt: 'Classify the intent of this message: inquiry, complaint, follow_up, opportunity, document_submission, scheduling. Message: {{input.content}}' } },
      { name: 'Lookup Client', stepOrder: 2, stepType: 'database_query', config: { query: 'client_lookup' } },
    ],
  },
  {
    slug: 'intent-detection',
    name: 'Intent Detection',
    description: 'Classify WhatsApp and chat messages into actionable intents for automated routing and response.',
    category: 'whatsapp',
    icon: '🎯',
    isCore: true,
    isPublished: true,
    triggers: ['message.received'],
    requiredPermissions: ['whatsapp.read'],
    skillDefinition: 'Analyze incoming WhatsApp messages to detect user intent: reschedule, complaint, document_upload, status_inquiry, payment_query, general_inquiry. Route to appropriate handler.',
    steps: [
      { name: 'Detect Intent', stepOrder: 0, stepType: 'llm_call', config: { prompt: 'Classify this WhatsApp message intent. Categories: reschedule, complaint, document_upload, status_inquiry, payment_query, general_inquiry. Message: "{{input.content}}"' } },
      { name: 'Check Context', stepOrder: 1, stepType: 'condition', config: { condition: 'exists:client' } },
      { name: 'Generate Response', stepOrder: 2, stepType: 'llm_call', config: { prompt: 'Generate a professional WhatsApp reply for intent: {{previous.result}}. Be concise and helpful. Context: {{input.content}}' } },
    ],
  },
];

export const CORE_BUSINESS_PACKS = [
  {
    slug: 'compliance-starter',
    name: 'Compliance Starter',
    description: 'Essential automation skills for South African compliance firms. Document processing, deadline monitoring, and client communication.',
    industry: 'compliance',
    icon: '🛡️',
    price: 0, // Included with PraxisOne
  },
  {
    slug: 'construction-pack',
    name: 'Construction Pack',
    description: 'BOQ analysis, quotation generation, progress report summaries, and site issue tracking.',
    industry: 'construction',
    icon: '🏗️',
    price: 49900, // R499/mo in cents
  },
  {
    slug: 'medical-pack',
    name: 'Medical Pack',
    description: 'Appointment triage, clinical note drafting, claims preparation, and follow-up messaging.',
    industry: 'medical',
    icon: '🏥',
    price: 69900,
  },
  {
    slug: 'legal-pack',
    name: 'Legal Pack',
    description: 'Contract review, case summaries, legal research assistance, and deadline tracking.',
    industry: 'legal',
    icon: '⚖️',
    price: 59900,
  },
  {
    slug: 'real-estate-pack',
    name: 'Real Estate Pack',
    description: 'Lead qualification, property description generation, viewing scheduling, and tenant screening.',
    industry: 'real-estate',
    icon: '🏠',
    price: 49900,
  },
];
