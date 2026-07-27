/**
 * Platform areas tenants can tag when suggesting product improvements.
 */

export const IMPROVEMENT_URGENCIES = [
  { value: 'nice_to_have', label: 'Nice to have' },
  { value: 'important', label: 'Important' },
  { value: 'critical', label: 'Critical' },
] as const;

export type ImprovementUrgency = (typeof IMPROVEMENT_URGENCIES)[number]['value'];

export const IMPROVEMENT_CATEGORIES = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'clients', label: 'Clients' },
  { value: 'team', label: 'Team' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'workflows', label: 'Workflows' },
  { value: 'documents', label: 'Documents' },
  { value: 'inbox', label: 'Inbox (Email & WhatsApp)' },
  { value: 'revenue', label: 'Revenue & Invoicing' },
  { value: 'marketplace', label: 'Marketplace & Skills' },
  { value: 'billing', label: 'Billing & Subscriptions' },
  { value: 'settings', label: 'Settings & Profile' },
  { value: 'audit_logs', label: 'Audit Logs' },
  { value: 'onboarding', label: 'Client Onboarding' },
  { value: 'mandates', label: 'Mandates & E-sign' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'search', label: 'Search' },
  { value: 'integrations', label: 'Integrations (WhatsApp, Email, Payments)' },
  { value: 'mobile_ux', label: 'Mobile & General UX' },
  { value: 'other', label: 'Other' },
] as const;

export type ImprovementCategory = (typeof IMPROVEMENT_CATEGORIES)[number]['value'];

export function improvementCategoryLabel(value: string): string {
  return IMPROVEMENT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function improvementUrgencyLabel(value: string): string {
  return IMPROVEMENT_URGENCIES.find((u) => u.value === value)?.label ?? value;
}
