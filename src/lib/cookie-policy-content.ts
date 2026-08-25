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
      'Analytics: we use Vercel Analytics to collect aggregated, privacy-oriented usage metrics. This helps us understand performance and improve the product without building individual advertising profiles.',
    ],
  },
  {
    title: 'Third-party cookies',
    paragraphs: [
      'Payment checkout (Ozow, Paystack) may set cookies when you are redirected to their hosted payment pages.',
      'File uploads (UploadThing) and embedded services may use cookies necessary for their functionality.',
      'We do not use third-party advertising cookies on the PraxisOne application.',
    ],
  },
  {
    title: 'Managing cookies',
    paragraphs: [
      'You can block or delete cookies in your browser settings. Blocking essential cookies will prevent you from signing in or using the dashboard.',
      'To opt out of analytics, use your browser\'s "Do Not Track" setting or a privacy extension. Vercel Analytics is designed to respect privacy preferences where supported.',
    ],
  },
  {
    title: 'Updates',
    paragraphs: [
      'We may update this policy when our use of cookies changes. The "Last updated" date at the top reflects the latest revision.',
    ],
  },
] as const;
