/**
 * Canonical SA compliance obligations (PRD Phase 3) + alias resolution
 * and recurring due-date helpers.
 */

export type ComplianceCategory = 'SARS' | 'CIPC' | 'Labour' | 'BEE';

export interface ComplianceObligation {
  category: ComplianceCategory;
  name: string;
  /** Days before dueDate to treat as "approaching" when still compliant */
  warnDays: number;
  /**
   * How to roll dueDate forward when marked compliant.
   * - annual: +1 year from previous due (or from now if none)
   * - month_end: next calendar month-end
   * - quarter_end: next calendar quarter-end (Mar/Jun/Sep/Dec)
   * - none: leave dueDate unchanged
   */
  rollForward: 'annual' | 'month_end' | 'quarter_end' | 'none';
}

/** PRD catalog — single source of truth for seeding and matching */
export const DEFAULT_COMPLIANCE_ITEMS: ComplianceObligation[] = [
  { category: 'SARS', name: 'VAT', warnDays: 7, rollForward: 'month_end' },
  { category: 'SARS', name: 'PAYE', warnDays: 7, rollForward: 'month_end' },
  { category: 'SARS', name: 'Income Tax', warnDays: 7, rollForward: 'annual' },
  { category: 'CIPC', name: 'Annual Returns', warnDays: 7, rollForward: 'annual' },
  { category: 'CIPC', name: 'Beneficial Ownership', warnDays: 7, rollForward: 'annual' },
  { category: 'Labour', name: 'UIF', warnDays: 7, rollForward: 'month_end' },
  { category: 'Labour', name: 'COIDA', warnDays: 7, rollForward: 'annual' },
  { category: 'Labour', name: 'Employment Equity', warnDays: 7, rollForward: 'annual' },
  { category: 'BEE', name: 'Certificate Expiry', warnDays: 60, rollForward: 'annual' },
  { category: 'BEE', name: 'Verification Schedule', warnDays: 60, rollForward: 'annual' },
];

/** Legacy / OCR names → canonical { category, name } */
const OBLIGATION_ALIASES: Record<string, { category: ComplianceCategory; name: string }> = {
  'b-bbee certificate': { category: 'BEE', name: 'Certificate Expiry' },
  'bbbee certificate': { category: 'BEE', name: 'Certificate Expiry' },
  'bee certificate': { category: 'BEE', name: 'Certificate Expiry' },
  'certificate expiry': { category: 'BEE', name: 'Certificate Expiry' },
  'tax clearance': { category: 'SARS', name: 'Income Tax' },
  'tax clearance certificate': { category: 'SARS', name: 'Income Tax' },
  'income tax': { category: 'SARS', name: 'Income Tax' },
  'vat': { category: 'SARS', name: 'VAT' },
  'paye': { category: 'SARS', name: 'PAYE' },
  'annual returns': { category: 'CIPC', name: 'Annual Returns' },
  'beneficial ownership': { category: 'CIPC', name: 'Beneficial Ownership' },
};

function normalizeKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function resolveObligation(
  category: string,
  name: string
): { category: ComplianceCategory; name: string } {
  const alias = OBLIGATION_ALIASES[normalizeKey(name)];
  if (alias) return alias;

  const cat = (['SARS', 'CIPC', 'Labour', 'BEE'].includes(category)
    ? category
    : 'SARS') as ComplianceCategory;

  const match = DEFAULT_COMPLIANCE_ITEMS.find(
    (i) => i.category === cat && normalizeKey(i.name) === normalizeKey(name)
  );
  if (match) return { category: match.category, name: match.name };

  return { category: cat, name: name.trim() };
}

export function getObligationMeta(
  category: string,
  name: string
): ComplianceObligation | undefined {
  const resolved = resolveObligation(category, name);
  return DEFAULT_COMPLIANCE_ITEMS.find(
    (i) => i.category === resolved.category && i.name === resolved.name
  );
}

/** Seed rows for createMany (status set by caller) */
export function seedComplianceRows(clientId: string, tenantId: string, status = 'action_required') {
  return DEFAULT_COMPLIANCE_ITEMS.map((item) => ({
    clientId,
    tenantId,
    category: item.category,
    name: item.name,
    status,
    notes: '',
  }));
}

function endOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12, 0, 0));
}

function nextQuarterEnd(from: Date): Date {
  const month = from.getUTCMonth(); // 0-11
  const year = from.getUTCFullYear();
  const quarterEnds = [2, 5, 8, 11]; // Mar, Jun, Sep, Dec
  for (const m of quarterEnds) {
    const candidate = new Date(Date.UTC(year, m + 1, 0, 12, 0, 0));
    if (candidate.getTime() > from.getTime()) return candidate;
  }
  return new Date(Date.UTC(year + 1, 3, 0, 12, 0, 0)); // next Mar 31
}

/**
 * Roll dueDate forward after an item is marked compliant.
 * Assumptions (SA practice approximations, not SARS API):
 * - VAT / PAYE / UIF: next month-end
 * - Income Tax / CIPC / Labour annual / BEE: +1 year from prior due (or now)
 * - Verification Schedule: +1 year
 */
export function rollForwardDueDate(
  category: string,
  name: string,
  previousDue: Date | null | undefined,
  from: Date = new Date()
): Date | null {
  const meta = getObligationMeta(category, name);
  if (!meta || meta.rollForward === 'none') return previousDue ?? null;

  const base = previousDue && !Number.isNaN(previousDue.getTime()) ? previousDue : from;

  switch (meta.rollForward) {
    case 'annual': {
      const next = new Date(base);
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      if (next.getTime() <= from.getTime()) {
        const fromPlus = new Date(from);
        fromPlus.setUTCFullYear(fromPlus.getUTCFullYear() + 1);
        return fromPlus;
      }
      return next;
    }
    case 'month_end': {
      const start = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
      let candidate = endOfMonth(start);
      if (candidate.getTime() <= from.getTime()) {
        candidate = endOfMonth(new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1)));
      }
      return candidate;
    }
    case 'quarter_end':
      return nextQuarterEnd(from);
    default:
      return previousDue ?? null;
  }
}

export function startOfUtcDay(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function daysUntil(due: Date, from: Date = startOfUtcDay()): number {
  const dueDay = startOfUtcDay(due);
  return Math.floor((dueDay.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}
