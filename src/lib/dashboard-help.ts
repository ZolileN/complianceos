/** Map dashboard routes to relevant help article slugs for contextual ? help. */
export const DASHBOARD_HELP_BY_PATH: Array<{ prefix: string; slug: string; label: string }> = [
  { prefix: '/dashboard/documents/unassigned', slug: 'sars-document-intelligence', label: 'Unassigned SARS documents' },
  { prefix: '/dashboard/documents', slug: 'upload-ocr', label: 'Documents & OCR' },
  { prefix: '/dashboard/clients', slug: 'add-clients', label: 'Clients' },
  { prefix: '/dashboard/compliance', slug: 'compliance-deadlines', label: 'Compliance' },
  { prefix: '/dashboard/inbox', slug: 'inbox-communications', label: 'Inbox' },
  { prefix: '/dashboard/workflows', slug: 'add-clients', label: 'Workflows' },
  { prefix: '/dashboard/revenue', slug: 'plans-and-trials', label: 'Revenue' },
  { prefix: '/dashboard/billing', slug: 'plans-and-trials', label: 'Billing' },
  { prefix: '/dashboard/settings', slug: 'create-workspace', label: 'Settings' },
  { prefix: '/dashboard/team', slug: 'create-workspace', label: 'Team' },
  { prefix: '/dashboard', slug: 'create-workspace', label: 'Dashboard' },
];

export function helpForDashboardPath(pathname: string): { slug: string; label: string } | null {
  const sorted = [...DASHBOARD_HELP_BY_PATH].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const entry of sorted) {
    if (pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`)) {
      return { slug: entry.slug, label: entry.label };
    }
  }
  return null;
}

export function helpArticlePath(slug: string): string {
  if (slug === 'plans-and-trials') return '/#pricing';
  if (slug === 'billing-refunds') return '/refund-policy';
  return `/help/${slug}`;
}
