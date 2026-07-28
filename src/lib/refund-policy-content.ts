/**
 * Refund & cancellation policy copy for the public policy page.
 */

export const REFUND_POLICY_LAST_UPDATED = '28 July 2026';

export const REFUND_POLICY_SECTIONS = [
  {
    title: 'Overview',
    paragraphs: [
      'PraxisOne is a B2B software-as-a-service platform operated by MLK Computer Consulting. This policy explains how subscriptions, cancellations, and refunds work for firms using PraxisOne.',
      'By subscribing to a paid plan, you agree to the terms below. If you have questions, contact us before disputing a charge.',
    ],
  },
  {
    title: 'Subscriptions and billing',
    paragraphs: [
      'Paid plans (Growth and Professional) are billed monthly in South African Rand (ZAR). The Starter plan includes a 14-day free trial with no payment required to begin.',
      'When you upgrade to a paid plan, your first month is charged at checkout. Your subscription renews automatically each billing period unless you schedule cancellation at period end.',
      'Current public pricing is published on our Plans section at praxis.mlkcomputer.com/#pricing.',
    ],
  },
  {
    title: 'Cancellation',
    paragraphs: [
      'Firm administrators may cancel a subscription at any time from Dashboard → Billing.',
      'Cancellation is scheduled for the end of the current paid billing period. You retain full access until that date and will not be charged again after the period ends.',
      'We do not charge cancellation fees. Deleting users or clients does not automatically cancel your subscription — you must schedule cancellation from the billing page.',
    ],
  },
  {
    title: 'Refunds',
    paragraphs: [
      'Starter trial: No charge applies during the 14-day trial period, so no refund is necessary.',
      'Paid monthly subscriptions: Fees for the current billing period are non-refundable once payment has been processed. If you cancel, service continues until the period ends.',
      'Billing errors or duplicate charges: Contact us within 7 calendar days of the charge and we will investigate and correct verified errors.',
      'Enterprise agreements: Refund terms follow the signed quote or contract where applicable.',
    ],
  },
  {
    title: 'Chargebacks and disputes',
    paragraphs: [
      'If you believe a charge is incorrect, please email us before initiating a chargeback so we can resolve the issue directly.',
      'Chargebacks for valid subscription charges may result in suspension of the workspace until the matter is resolved.',
    ],
  },
  {
    title: 'Contact',
    paragraphs: [
      'For billing questions, refund requests, or cancellation help, use the Contact form on our website or email the address listed on your invoice.',
    ],
  },
] as const;
