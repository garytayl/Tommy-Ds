"use client";

import { useState } from "react";

type CollectPaymentButtonProps = {
  invoiceId: string;
  disabled?: boolean;
};

export function CollectPaymentButton({
  invoiceId,
  disabled,
}: CollectPaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCollectPayment() {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Unable to create checkout session");
      }

      const body = (await res.json()) as { url?: string };
      if (!body.url) {
        throw new Error("Stripe checkout URL not returned");
      }
      window.location.assign(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment link failed");
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onCollectPayment}
        disabled={disabled || isLoading}
        className="w-full rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Creating Pay Link..." : "Collect Payment (Send Pay Link)"}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
