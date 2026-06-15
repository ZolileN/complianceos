/* ============================================================
   ComplianceOS — Application Constants
   ============================================================ */

export const APP_NAME = 'ComplianceOS';
export const APP_DESCRIPTION = 'The Operating System for South African Compliance, Accounting & Advisory Firms';

// ── Task Statuses ──────────────────────────────────────────
export const TASK_STATUSES = [
  { value: 'new', label: 'New', color: '#6366f1' },
  { value: 'waiting_on_client', label: 'Waiting on Client', color: '#f59e0b' },
  { value: 'processing', label: 'Processing', color: '#3b82f6' },
  { value: 'submitted', label: 'Submitted', color: '#8b5cf6' },
  { value: 'completed', label: 'Completed', color: '#10b981' },
  { value: 'overdue', label: 'Overdue', color: '#ef4444' },
] as const;

// ── Task Priorities ────────────────────────────────────────
export const TASK_PRIORITIES = [
  { value: 'low', label: 'Low', color: '#6b7280' },
  { value: 'medium', label: 'Medium', color: '#3b82f6' },
  { value: 'high', label: 'High', color: '#f59e0b' },
  { value: 'critical', label: 'Critical', color: '#ef4444' },
] as const;

// ── Document Categories ────────────────────────────────────
export const DOCUMENT_CATEGORIES = [
  { value: 'id_document', label: 'ID Document', icon: '🪪' },
  { value: 'tax_certificate', label: 'Tax Certificate', icon: '📜' },
  { value: 'bank_statement', label: 'Bank Statement', icon: '🏦' },
  { value: 'cor_document', label: 'COR Document', icon: '📋' },
  { value: 'vat_certificate', label: 'VAT Certificate', icon: '🧾' },
  { value: 'bee_certificate', label: 'BEE Certificate', icon: '🐝' },
  { value: 'financial_statement', label: 'Financial Statement', icon: '📊' },
  { value: 'mandate', label: 'Mandate', icon: '✍️' },
  { value: 'other', label: 'Other', icon: '📄' },
] as const;

// ── Workflow Categories ────────────────────────────────────
export const WORKFLOW_CATEGORIES = [
  { value: 'company_registration', label: 'Company Registration', icon: '🏢', color: '#6366f1' },
  { value: 'tax_compliance', label: 'Tax Compliance', icon: '💰', color: '#10b981' },
  { value: 'vat_registration', label: 'VAT Registration', icon: '🧾', color: '#3b82f6' },
  { value: 'bee_certification', label: 'BEE Certification', icon: '🐝', color: '#f59e0b' },
  { value: 'annual_returns', label: 'Annual Returns', icon: '📅', color: '#8b5cf6' },
  { value: 'payroll_setup', label: 'Payroll Setup', icon: '💼', color: '#ec4899' },
  { value: 'custom', label: 'Custom', icon: '⚙️', color: '#6b7280' },
] as const;

// ── User Roles ─────────────────────────────────────────────
export const USER_ROLES = [
  { value: 'administrator', label: 'Administrator', description: 'Full access — manage users, configure workflows' },
  { value: 'operations_manager', label: 'Operations Manager', description: 'Monitor workload, assign work' },
  { value: 'consultant', label: 'Consultant', description: 'Manage clients, process tasks' },
  { value: 'client', label: 'Client', description: 'Upload documents, view status' },
] as const;

// ── Client Statuses ────────────────────────────────────────
export const CLIENT_STATUSES = [
  { value: 'active', label: 'Active', color: '#10b981' },
  { value: 'inactive', label: 'Inactive', color: '#6b7280' },
  { value: 'onboarding', label: 'Onboarding', color: '#3b82f6' },
] as const;

// ── Navigation Items ───────────────────────────────────────
export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { href: '/dashboard/clients', label: 'Clients', icon: 'users' },
  { href: '/dashboard/team', label: 'Team', icon: 'user' },
  { href: '/dashboard/tasks', label: 'Tasks', icon: 'check-square' },
  { href: '/dashboard/workflows', label: 'Workflows', icon: 'git-branch' },
  { href: '/dashboard/documents', label: 'Documents', icon: 'folder' },
  { href: '/dashboard/inbox', label: 'Inbox', icon: 'message-circle' },
] as const;

// ── Pricing Plans ──────────────────────────────────────────
export const PRICING_PLANS = [
  { value: 'starter', label: 'Starter', price: 999, users: 3, clients: 100 },
  { value: 'growth', label: 'Growth', price: 2999, users: 10, clients: 1000 },
  { value: 'professional', label: 'Professional', price: 7999, users: -1, clients: -1 },
  { value: 'enterprise', label: 'Enterprise', price: -1, users: -1, clients: -1 },
] as const;
