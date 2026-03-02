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
