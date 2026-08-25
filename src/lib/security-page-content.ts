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
      'Every firm operates in a dedicated tenant workspace. Database queries are scoped by tenant ID; users cannot access another firm\'s data through the application.',
      'Role-based access control (RBAC) limits what each user can see: administrators, operations managers, and consultants have different permissions.',
      'Platform admin tools manage fleet configuration (billing, suspension, limits) without access to client document vaults.',
    ],
  },
  {
    title: 'Authentication and access',
    paragraphs: [
      'Passwords are hashed before storage. Sessions use industry-standard tokens via NextAuth.',
      'Administrators can revoke user sessions and reset passwords. Suspended tenants and disabled users are blocked at the gateway.',
      'Cron jobs and webhooks authenticate with secrets — they never rely on browser sessions alone.',
    ],
  },
  {
    title: 'Data protection',
    paragraphs: [
      'All traffic is encrypted in transit using TLS (HTTPS).',
      'Documents are stored in encrypted object storage via UploadThing.',
      'Database hosting uses managed PostgreSQL (Neon) with provider-level encryption at rest.',
      'Audit logs record significant create, update, and delete actions for administrative transparency.',
    ],
  },
  {
    title: 'Infrastructure and monitoring',
    paragraphs: [
      'The application runs on Vercel with serverless functions and edge middleware.',
      'Sentry monitors errors and performance in production. Cron failures and Redis outages are alerted.',
      'Redis (Upstash) backs skill-event queues and admin telemetry in production; the platform degrades gracefully if Redis is unavailable.',
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
