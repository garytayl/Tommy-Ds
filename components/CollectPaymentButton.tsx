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
  const [payLink, setPayLink] = useState<string | null>(null);

  async function onCollectPayment() {
    setIsLoading(true);
    setError(null);
    setPayLink(null);

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

      try {
        await navigator.clipboard.writeText(body.url);
      } catch {
        // clipboard may fail in some contexts (e.g. non-HTTPS)
      }
      setPayLink(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment link failed");
    } finally {
      setIsLoading(false);
    }
  }

  const isTestMode =
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_STRIPE_TEST_MODE === "true";

  return (
    <div className="space-y-2">
      {payLink ? (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-sm font-medium text-foreground">
            Pay link copied to clipboard.
          </p>
          <p className="text-xs text-muted-foreground">
            Send it to the customer (text, email, etc.). They can pay with card, Apple Pay, or Google Pay.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={payLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Open pay page
            </a>
            <button
              type="button"
              onClick={() => {
                setPayLink(null);
              }}
              className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={onCollectPayment}
            disabled={disabled || isLoading}
            className="btn-primary w-full"
          >
            {isLoading ? "Creating link…" : "Copy pay link"}
          </button>
          {isTestMode ? (
            <p className="text-xs text-muted-foreground">
              Test mode — no real charges. Use Stripe test card 4242 4242 4242 4242. Customer can also use Apple Pay / Google Pay on the checkout page.
            </p>
          ) : null}
          {error ? (
            <p className="text-xs font-medium text-destructive">{error}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
