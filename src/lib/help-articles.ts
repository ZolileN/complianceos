export type HelpArticleSection = {
  heading?: string;
  paragraphs: string[];
  bullets?: string[];
};

export type HelpArticleContent = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  sections: HelpArticleSection[];
};

export const HELP_ARTICLES: HelpArticleContent[] = [
  {
    slug: 'create-workspace',
    title: 'Create your workspace',
    summary: 'Sign up, invite your team, and configure your firm profile from Settings.',
    category: 'Getting started',
    sections: [
      {
        paragraphs: [
          'PraxisOne gives each firm its own secure workspace. Start with a 14-day Starter trial — no credit card required.',
        ],
        bullets: [
          'Go to the homepage and choose Starter under Plans.',
          'Enter your firm name, your name, email, and a password (minimum 6 characters).',
          'Accept the Terms of Service and Privacy Policy, then click Start free trial.',
          'You are signed in automatically and land on the dashboard.',
        ],
      },
      {
        heading: 'After signup',
        paragraphs: [
          'From Settings you can upload your firm logo, set your inbound email address slug, and invite administrators or consultants.',
        ],
      },
    ],
  },
  {
    slug: 'connect-whatsapp',
    title: 'Connect WhatsApp',
    summary: 'Link your firm WhatsApp number so consultants can message clients from the inbox.',
    category: 'Getting started',
    sections: [
      {
        paragraphs: [
          'WhatsApp lets consultants reply to clients from the same inbox as email, with conversation history tied to the client record.',
        ],
        bullets: [
          'Open Dashboard → Settings → Integrations.',
          'Follow the WhatsApp Business connection steps for your Meta Business account.',
          'Once connected, new WhatsApp messages appear in Dashboard → Inbox.',
          'Link unmatched threads to a client so attachments can be saved to the document vault.',
        ],
      },
    ],
  },
  {
    slug: 'add-clients',
    title: 'Add and onboard clients',
    summary: 'Create client records manually or share your public onboarding link.',
    category: 'Clients & compliance',
    sections: [
      {
        paragraphs: [
          'Every compliance item, document, and conversation is tied to a client record.',
        ],
        bullets: [
          'Dashboard → Clients → Add client to create a record manually.',
          'Share your public link: /onboard/your-tenant-slug for self-service onboarding.',
          'Assign a consultant so they see the client in their workspace.',
          'Add registration number, tax number, and VAT number for better automatic matching.',
        ],
      },
    ],
  },
  {
    slug: 'compliance-deadlines',
    title: 'Track compliance deadlines',
    summary: 'Use the Compliance dashboard for portfolio-wide VAT, PAYE, CIPC, and BEE monitoring.',
    category: 'Clients & compliance',
    sections: [
      {
        paragraphs: [
          'The compliance calendar tracks canonical South African obligations per client: SARS (VAT, PAYE, Income Tax), CIPC (Annual Returns, Beneficial Ownership), Labour, and BEE.',
        ],
        bullets: [
          'Open Dashboard → Compliance for a portfolio view with filters by status.',
          'Open a client → Compliance tab to edit due dates, status, and linked documents.',
          'Statuses include compliant, action required, critical, and not applicable.',
          'Uploading or approving relevant documents can roll due dates forward automatically.',
        ],
      },
    ],
  },
  {
    slug: 'upload-ocr',
    title: 'Upload and approve OCR',
    summary: 'Upload COR14.3, tax certificates, and VAT docs. Review extracted fields before they update client records.',
    category: 'Documents & OCR',
    sections: [
      {
        paragraphs: [
          'When you upload a PDF, PraxisOne runs OCR in the background and extracts structured fields.',
        ],
        bullets: [
          'Open a client → Documents tab, or Dashboard → Documents for firm-wide search.',
          'Upload COR14.3, BEE certificates, tax clearance, bank statements, or SARS PDFs.',
          'When OCR completes, open the document viewer and review extracted fields.',
          'Click Approve to write verified fields to the client profile and update compliance items.',
        ],
      },
    ],
  },
  {
    slug: 'sars-document-intelligence',
    title: 'SARS document intelligence',
    summary: 'ITA34, VAT201 confirmations, and SARS letters are classified automatically when uploaded or received by email.',
    category: 'Documents & OCR',
    sections: [
      {
        paragraphs: [
          'SARS Phase 1A classifies common SARS PDFs without eFiling integration. Documents can arrive via upload, inbound email, or the unassigned queue.',
        ],
        bullets: [
          'Supported types: ITA34 assessments, VAT201/EMP201 confirmations, SARS letters, eFiling acknowledgements.',
          'Forward SARS mail to your tenant inbound address (shown in Dashboard → Inbox).',
          'Matched clients get documents automatically; unmatched PDFs go to Dashboard → Documents → Unassigned.',
          'After OCR, approve ITA34 or VAT201 to update Income Tax or VAT compliance due dates.',
        ],
      },
    ],
  },
  {
    slug: 'inbox-communications',
    title: 'WhatsApp and email inbox',
    summary: 'Manage client conversations, save attachments to the document vault, and link unmatched emails to clients.',
    category: 'Communications',
    sections: [
      {
        paragraphs: [
          'The unified inbox shows inbound email and WhatsApp threads in one place.',
        ],
        bullets: [
          'Each tenant has a unique inbound email: {slug}@your-configured-domain.',
          'Link an unmatched email to a client before saving attachments manually.',
          'SARS PDF attachments on unmatched emails are auto-saved to the unassigned queue.',
          'Reply to emails directly from the inbox; replies are logged on the thread.',
        ],
      },
    ],
  },
  {
    slug: 'mandate-esign',
    title: 'Mandate e-signing',
    summary: 'Send mandate links for clients to sign without logging in.',
    category: 'Communications',
    sections: [
      {
        paragraphs: [
          'Mandates let clients sign engagement letters on a public page — no PraxisOne login required.',
        ],
        bullets: [
          'Open a client → Mandates tab and create a new mandate from your template.',
          'Send the signing link (/sign/{token}) to the client by email or WhatsApp.',
          'The client reviews and signs; you receive a notification when complete.',
          'Signed PDFs are stored on the client record for audit purposes.',
        ],
      },
    ],
  },
  {
    slug: 'plans-and-trials',
    title: 'Plans and trials',
    summary: 'Starter includes a 14-day trial. Upgrade from Dashboard → Billing.',
    category: 'Billing & plans',
    sections: [
      {
        paragraphs: [
          'Starter is free for 14 days with core compliance and document features. Growth and Professional add more users and clients.',
        ],
        bullets: [
          'Upgrade from Dashboard → Billing when you are ready.',
          'Paid plans use secure Paystack checkout — you are redirected back to sign in after payment.',
          'Enterprise plans are customised — contact sales from the homepage.',
        ],
      },
    ],
  },
  {
    slug: 'billing-refunds',
    title: 'Cancel or refund questions',
    summary: 'Review our refund policy and contact support for billing disputes.',
    category: 'Billing & plans',
    sections: [
      {
        paragraphs: [
          'You can cancel a paid subscription from Dashboard → Billing. Access continues until the end of the current billing period.',
        ],
        bullets: [
          'Read the full Refund Policy at /refund-policy.',
          'For billing disputes, contact support via the homepage contact form with your firm name and invoice reference.',
          'Trial workspaces can be left to expire without charge.',
        ],
      },
    ],
  },
];

export function getHelpArticle(slug: string): HelpArticleContent | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug);
}

export const HELP_ARTICLE_SLUGS = HELP_ARTICLES.map((a) => a.slug);
