/* ============================================================
   PraxisOne — TypeScript Type Definitions
   ============================================================ */

// ── Roles ──────────────────────────────────────────────────
export type UserRole = 'administrator' | 'operations_manager' | 'consultant' | 'client';

// ── Tenants ────────────────────────────────────────────────
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'starter' | 'growth' | 'professional' | 'enterprise';
  settings: TenantSettings;
  created_at: string;
}

export interface TenantSettings {
  logo_url?: string;
  primary_color?: string;
  whatsapp_enabled?: boolean;
}

// ── Users ──────────────────────────────────────────────────
export interface User {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

// ── Clients ────────────────────────────────────────────────
export interface Director {
  name: string;
  id_number: string;
  email?: string;
  phone?: string;
}

export interface Client {
  id: string;
  tenant_id: string;
  company_name: string;
  registration_number?: string;
  tax_number?: string;
  vat_number?: string;
  directors: Director[];
  email?: string;
  phone?: string;
  whatsapp_number?: string;
  assigned_consultant_id?: string;
  assigned_consultant?: User;
  status: 'active' | 'inactive' | 'onboarding';
  created_at: string;
  updated_at: string;
}

// ── Workflow Templates ─────────────────────────────────────
export interface WorkflowTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  category: WorkflowCategory;
  is_active: boolean;
  steps?: WorkflowStep[];
  created_at: string;
}

export type WorkflowCategory =
  | 'company_registration'
  | 'tax_compliance'
  | 'vat_registration'
  | 'bee_certification'
  | 'annual_returns'
  | 'payroll_setup'
  | 'custom';

export interface WorkflowStep {
  id: string;
  template_id: string;
  name: string;
  description?: string;
  step_order: number;
  sla_days: number;
}

// ── Client Workflows (Active) ──────────────────────────────
export interface ClientWorkflow {
  id: string;
  client_id: string;
  template_id: string;
  tenant_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to?: string;
  started_at?: string;
  completed_at?: string;
  client?: Client;
  template?: WorkflowTemplate;
  progress?: WorkflowStepProgress[];
}

export interface WorkflowStepProgress {
  id: string;
  client_workflow_id: string;
  step_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  notes?: string;
  completed_by?: string;
  completed_at?: string;
  step?: WorkflowStep;
}

// ── Documents ──────────────────────────────────────────────
export type DocumentCategory =
  | 'id_document'
  | 'tax_certificate'
  | 'bank_statement'
  | 'cor_document'
  | 'vat_certificate'
  | 'bee_certificate'
  | 'financial_statement'
  | 'mandate'
  | 'other';

export interface Document {
  id: string;
  client_id: string;
  tenant_id: string;
  name: string;
  file_path: string;
  file_type: string;
  category: DocumentCategory;
  version: number;
  file_size: number;
  uploaded_by?: string;
  uploader?: User;
  client?: Client;
  created_at: string;
}

// ── Tasks ──────────────────────────────────────────────────
export type TaskStatus =
  | 'new'
  | 'waiting_on_client'
  | 'processing'
  | 'submitted'
  | 'completed'
  | 'overdue';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  tenant_id: string;
  client_id?: string;
  assigned_to?: string;
  workflow_id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  sla_days?: number;
  client?: Client;
  assignee?: User;
  created_at: string;
  updated_at: string;
}

// ── WhatsApp Conversations ─────────────────────────────────
export interface Conversation {
  id: string;
  client_id?: string;
  tenant_id: string;
  whatsapp_number: string;
  status: 'open' | 'closed' | 'pending';
  assigned_to?: string;
  last_message_at?: string;
  client?: Client;
  assignee?: User;
  messages?: Message[];
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  tenant_id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'template';
  media_url?: string;
  whatsapp_message_id?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  created_at: string;
}

// ── API Response Types ─────────────────────────────────────
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  count?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// ── Dashboard Stats ────────────────────────────────────────
export interface DashboardStats {
  total_clients: number;
  active_tasks: number;
  pending_documents: number;
  compliance_score: number;
  overdue_tasks: number;
  unread_messages: number;
}
