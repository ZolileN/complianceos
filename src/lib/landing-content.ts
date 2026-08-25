export const LANDING_FAQS = [
  {
    question: 'Does the Starter trial require a credit card?',
    answer:
      'No. Starter is a 14-day free trial — sign up with your firm details only. No payment details required.',
  },
  {
    question: 'How do Growth and Professional plans work?',
    answer:
      'You complete signup details, pay your first month via secure Ozow checkout, then your workspace is created immediately.',
  },
  {
    question: 'Is PraxisOne POPIA compliant?',
    answer:
      'Each firm operates in an isolated tenant workspace. Platform admin access is restricted to configuration — not client document vaults. See our Privacy Policy and Security page for details.',
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes. Administrators can schedule cancellation at period end from the billing page in your dashboard.',
  },
  {
    question: 'Does PraxisOne file returns to SARS or CIPC?',
    answer:
      'No. PraxisOne helps your firm track deadlines, organise documents, and automate workflows. All submissions to SARS and CIPC remain your responsibility via eFiling and CIPC eServices.',
  },
  {
    question: 'How does document OCR work?',
    answer:
      'Upload COR14.3, tax clearance, VAT certificates, and SARS correspondence. The platform extracts key fields and your team approves before records are updated.',
  },
  {
    question: 'Can clients log in to PraxisOne?',
    answer:
      'There is no client login portal. Clients interact via WhatsApp, email, your public onboarding link, and mandate signing — keeping your firm in control of the relationship.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'Paid plans are billed in South African Rand via Ozow and Paystack hosted checkout. Enterprise pricing is available on request.',
  },
] as const;

export const LANDING_TESTIMONIALS = [
  {
    quote:
      'We replaced three spreadsheets and a shared WhatsApp phone with one dashboard. Compliance deadlines are visible to the whole team now.',
    role: 'Operations Manager',
    firmType: 'Mid-size accounting firm',
    region: 'Gauteng',
  },
  {
    quote:
      'Document OCR on COR14.3 and tax certificates saves hours every month. Staff still approve everything before it hits the client file.',
    role: 'Compliance Lead',
    firmType: 'Corporate secretarial practice',
    region: 'Western Cape',
  },
  {
    quote:
      'The WhatsApp inbox linked to client records changed how we respond. Nothing gets lost in personal phones anymore.',
    role: 'Senior Consultant',
    firmType: 'Tax and advisory firm',
    region: 'KwaZulu-Natal',
  },
] as const;
