export const COOKIE_POLICY_LAST_UPDATED = '25 August 2026';

export const COOKIE_POLICY_SECTIONS = [
  {
    title: 'What are cookies?',
    paragraphs: [
      'Cookies are small text files stored on your device when you visit a website. They help the site remember preferences, keep you signed in, and understand how the service is used.',
    ],
  },
  {
    title: 'How PraxisOne uses cookies',
    paragraphs: [
      'Essential cookies: required for authentication, session security, and core platform functionality. The service cannot operate without these.',
      'Preference cookies: remember theme (light/dark) and similar UI choices on your device.',
      'Analytics: we collect aggregated, privacy-oriented usage metrics to understand performance and improve the product. We do not use these cookies to build advertising profiles.',
    ],
  },
  {
    title: 'Third-party cookies',
    paragraphs: [
      'Payment checkout: when you pay for a subscription, Paystack (and Ozow where available) may set cookies on their secure hosted payment pages.',
      'File uploads and embedded checkout flows may use cookies necessary for those features to work.',
      'We do not use third-party advertising cookies on the PraxisOne application.',
    ],
  },
  {
    title: 'Managing cookies',
    paragraphs: [
      'You can block or delete cookies in your browser settings. Blocking essential cookies will prevent you from signing in or using the dashboard.',
      'To limit analytics tracking, use your browser\'s "Do Not Track" setting or a privacy extension.',
    ],
  },
  {
    title: 'Updates',
    paragraphs: [
      'We may update this policy when our use of cookies changes. The "Last updated" date at the top reflects the latest revision.',
    ],
  },
] as const;
