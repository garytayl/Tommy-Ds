/**
 * Default sales tax for Indiana (e.g. Bloomington).
 * Used to auto-fill tax on invoices and quotes; staff can override in the UI.
 */
export const DEFAULT_TAX_RATE = 0.07; // 7% Indiana state sales tax

/**
 * Compute tax in cents from subtotal in cents using the default rate.
 * Rounds to nearest cent.
 */
export function computeTaxCents(subtotalCents: number): number {
  if (subtotalCents <= 0) return 0;
  return Math.round(subtotalCents * DEFAULT_TAX_RATE);
}
