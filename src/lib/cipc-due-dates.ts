/** Compute the next CIPC annual returns due date from a registration date (YYYY-MM-DD or DD/MM/YYYY). */
export function computeAnnualReturnsDueDate(
  registrationDateInput: string,
  asOf: Date = new Date()
): Date | null {
  let regDateStr = registrationDateInput.trim();
  const regParts = regDateStr.split('/');
  if (regParts.length === 3 && regParts[0].length === 2) {
    regDateStr = `${regParts[2]}-${regParts[1]}-${regParts[0]}`;
  }

  const regDate = new Date(regDateStr);
  if (isNaN(regDate.getTime())) return null;

  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const currentYear = asOf.getFullYear();
  let nextAnniversary = new Date(currentYear, regDate.getMonth(), regDate.getDate());

  if (asOf.getTime() - nextAnniversary.getTime() > thirtyDaysMs) {
    nextAnniversary = new Date(currentYear + 1, regDate.getMonth(), regDate.getDate());
  }

  return new Date(nextAnniversary.getTime() + thirtyDaysMs);
}

export function annualReturnsStatusForDueDate(dueDate: Date, asOf: Date = new Date()): string {
  const anniversary = new Date(dueDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const windowStart = new Date(anniversary);
  if (asOf >= windowStart && asOf <= dueDate) return 'action_required';
  if (asOf > dueDate) return 'critical';
  return 'compliant';
}
