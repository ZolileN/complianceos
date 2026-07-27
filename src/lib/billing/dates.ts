/** Month-to-month: next period ends one calendar month after the payment date. */
export function addOneMonth(from: Date): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return d;
}

/**
 * Where the next paid period should end. Early renewals extend from the
 * current period end (no lost days); late renewals start from payment time.
 */
export function nextPeriodEnd(now: Date, currentPeriodEnd?: Date | null): Date {
  const base =
    currentPeriodEnd && currentPeriodEnd.getTime() > now.getTime()
      ? currentPeriodEnd
      : now;
  return addOneMonth(base);
}
