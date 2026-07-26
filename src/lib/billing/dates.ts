/** Month-to-month: next period ends one calendar month after the payment date. */
export function addOneMonth(from: Date): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return d;
}
