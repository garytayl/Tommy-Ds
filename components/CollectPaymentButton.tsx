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

  const isTestMode =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_STRIPE_TEST_MODE === "true";

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onCollectPayment}
        disabled={disabled || isLoading}
        className="btn-primary w-full"
      >
        {isLoading ? "Creating Pay Link…" : "Collect Payment (Send Pay Link)"}
      </button>
      {isTestMode ? (
        <p className="text-xs text-muted-foreground">
          Test mode — no real charges. Use Stripe test card 4242 4242 4242 4242.
        </p>
      ) : null}
      {error ? (
        <p className="text-xs font-medium" style={{ color: "var(--destructive)" }}>{error}</p>
      ) : null}
    </div>
  );
}
