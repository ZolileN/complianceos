export const SECURITY_PAGE_LAST_UPDATED = '25 August 2026';

export const SECURITY_PAGE_SECTIONS = [
  {
    title: 'Our commitment',
    paragraphs: [
      'PraxisOne is built for firms that handle sensitive client and regulatory data. Security and tenant isolation are foundational — not add-ons.',
    ],
  },
  {
    title: 'Tenant isolation',
    paragraphs: [
      'Every firm operates in a dedicated workspace. Data is kept separate between firms; users cannot access another firm\'s records through the application.',
      'Role-based access limits what each user can see: administrators, operations managers, and consultants have different permissions.',
      'Platform administration covers billing and workspace configuration — not your client document vaults.',
    ],
  },
  {
    title: 'Authentication and access',
    paragraphs: [
      'Passwords are stored using industry-standard hashing. Sessions are protected with secure tokens.',
      'Administrators can revoke user sessions and reset passwords. Suspended workspaces and disabled users are blocked from signing in.',
      'Automated system integrations authenticate with secrets and never rely on a user\'s browser session alone.',
    ],
  },
  {
    title: 'Data protection',
    paragraphs: [
      'All traffic between your browser and PraxisOne is encrypted in transit (HTTPS).',
      'Documents are stored in encrypted cloud storage.',
      'Workspace data is held in managed databases with encryption at rest.',
      'Audit logs record significant create, update, and delete actions for administrative transparency.',
    ],
  },
  {
    title: 'Monitoring and reliability',
    paragraphs: [
      'The platform runs on enterprise cloud infrastructure with continuous monitoring for errors and performance.',
      'Scheduled background tasks are monitored so billing, compliance reminders, and automations are alerted if they fail.',
      'If a non-critical supporting service is temporarily unavailable, core workspace access continues where possible.',
    ],
  },
  {
    title: 'POPIA alignment',
    paragraphs: [
      'We process personal information as an operator on your firm\'s instructions. Your firm remains responsible for lawful collection and client consent.',
      'See our Privacy Policy for data subject rights, retention, and sub-processor details.',
    ],
  },
  {
    title: 'Responsible disclosure',
    paragraphs: [
      'If you discover a security vulnerability, please report it responsibly via our Contact form. Do not publicly disclose issues before we have had a reasonable opportunity to remediate.',
    ],
  },
] as const;
