// ── Shared formatting & calculation utilities ──────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

/** Format a number as currency. Uses the user's preferred currency symbol. */
export function fmtCurrency(n: number, currency = 'INR'): string {
  const sym = CURRENCY_SYMBOLS[currency] ?? '₹';
  const rounded = Math.round(n);
  if (rounded >= 10000000) return `${sym}${(rounded / 10000000).toFixed(2)}Cr`;
  if (rounded >= 100000) return `${sym}${(rounded / 100000).toFixed(1)}L`;
  if (rounded >= 1000) return `${sym}${rounded.toLocaleString('en-IN')}`;
  return `${sym}${rounded}`;
}

/** Days until a future date string. Returns 999 if null. */
export function daysUntil(dateStr: string | null): number {
  if (!dateStr) return 999;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** Convert any billing cycle cost to a monthly equivalent. */
export function toMonthly(cost: number, billingCycle: string): number {
  if (billingCycle === 'yearly') return cost / 12;
  if (billingCycle === 'quarterly') return cost / 3;
  return cost;
}

/** Returns urgency color for days-until-renewal. */
export function renewalUrgencyColor(days: number): string {
  if (days <= 3) return '#dc2626';
  if (days <= 7) return '#f59e0b';
  return '#16a34a';
}

/** Download data as a CSV file. */
export function downloadCSV(filename: string, rows: string[][]): void {
  const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
