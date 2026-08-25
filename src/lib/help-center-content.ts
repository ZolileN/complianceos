export type HelpArticle = {
  title: string;
  summary: string;
  href: string;
  category: string;
};

export const HELP_CENTER_CATEGORIES = [
  'Getting started',
  'Clients & compliance',
  'Documents & OCR',
  'Communications',
  'Billing & plans',
] as const;

export const HELP_CENTER_ARTICLES: HelpArticle[] = [
  {
    category: 'Getting started',
    title: 'Create your workspace',
    summary: 'Sign up, invite your team, and configure your firm profile from Settings.',
    href: '/signup?plan=starter',
  },
  {
    category: 'Getting started',
    title: 'Connect WhatsApp',
    summary: 'Link your firm WhatsApp number so consultants can message clients from the inbox.',
    href: '/login',
  },
  {
    category: 'Clients & compliance',
    title: 'Add and onboard clients',
    summary: 'Create client records manually or share your public onboarding link (/onboard/your-slug).',
    href: '/login',
  },
  {
    category: 'Clients & compliance',
    title: 'Track compliance deadlines',
    summary: 'Use the Compliance dashboard for portfolio-wide VAT, PAYE, CIPC, and BEE monitoring.',
    href: '/login',
  },
  {
    category: 'Documents & OCR',
    title: 'Upload and approve OCR',
    summary: 'Upload COR14.3, tax certificates, and VAT docs. Review extracted fields before they update client records.',
    href: '/login',
  },
  {
    category: 'Documents & OCR',
    title: 'SARS document intelligence',
    summary: 'ITA34, VAT201 confirmations, and SARS letters are classified automatically when uploaded or received by email.',
    href: '/login',
  },
  {
    category: 'Communications',
    title: 'WhatsApp and email inbox',
    summary: 'Manage client conversations, save attachments to the document vault, and link unmatched emails to clients.',
    href: '/login',
  },
  {
    category: 'Communications',
    title: 'Mandate e-signing',
    summary: 'Send mandate links for clients to sign without logging in.',
    href: '/login',
  },
  {
    category: 'Billing & plans',
    title: 'Plans and trials',
    summary: 'Starter includes a 14-day trial. Upgrade from Dashboard → Billing.',
    href: '/#pricing',
  },
  {
    category: 'Billing & plans',
    title: 'Cancel or refund questions',
    summary: 'Review our refund policy and contact support for billing disputes.',
    href: '/refund-policy',
  },
];
