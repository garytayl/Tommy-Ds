export function centsToDollars(cents: number | null | undefined): number {
  return (cents ?? 0) / 100;
}

export function formatCents(cents: number | null | undefined): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(centsToDollars(cents));
}

export function dollarsToCents(input: string | number): number {
  const amount = typeof input === "number" ? input : Number.parseFloat(input);
  if (!Number.isFinite(amount)) {
    return 0;
  }
  return Math.round(amount * 100);
}

/**
 * Converts whole-dollar digit input to cents (e.g. "125" -> 12500).
 * Returns 0 when input is not strictly digits.
 */
export function wholeDollarsToCents(input: string | number): number {
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input < 0) return 0;
    return Math.round(input) * 100;
  }
  const normalized = input.trim();
  if (!/^\d+$/.test(normalized)) return 0;
  const dollars = Number.parseInt(normalized, 10);
  if (!Number.isFinite(dollars)) return 0;
  return dollars * 100;
}
