"use client";

import { useState } from "react";

type PayWithCardButtonProps = {
  invoiceId: string;
  label?: string;
  className?: string;
};

/**
 * Calls POST /api/checkout/create and redirects to Stripe Checkout.
 * Used on the public pay page and receipt page when balance is due.
 */
export function PayWithCardButton({
  invoiceId,
  label = "Pay with card",
  className,
}: PayWithCardButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!invoiceId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const body = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!res.ok) {
        throw new Error(body?.error ?? "Could not start payment");
      }
      if (body?.url) {
        window.location.href = body.url;
        return;
      }
      throw new Error("No payment link returned");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className={
          className ??
          "inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        }
      >
        {isLoading ? "…" : label}
      </button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
