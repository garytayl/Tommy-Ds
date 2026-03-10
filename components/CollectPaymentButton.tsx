"use client";

import { useState } from "react";
import { DevHint } from "@/components/DevHint";

type CollectPaymentButtonProps = {
  invoiceId: string;
  disabled?: boolean;
  /** Inline/small variant for tables and cards */
  compact?: boolean;
};

export function CollectPaymentButton({
  invoiceId,
  disabled,
  compact,
}: CollectPaymentButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payLink, setPayLink] = useState<string | null>(null);
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);

  async function onSendViaSms() {
    setSmsLoading(true);
    setSmsError(null);
    setSmsSent(false);
    try {
      const res = await fetch("/api/sms/send-payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? data?.message ?? "Failed to send SMS");
      }
      setSmsSent(true);
    } catch (err) {
      setSmsError(err instanceof Error ? err.message : "SMS failed");
    } finally {
      setSmsLoading(false);
    }
  }

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

  if (compact) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        {payLink ? (
          <>
            <span className="text-xs text-muted-foreground">Copied.</span>
            <a
              href={payLink}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-primary hover:underline"
            >
              Open
            </a>
            <button
              type="button"
              onClick={() => setPayLink(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onCollectPayment}
              disabled={disabled || isLoading}
              className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
            >
              {isLoading ? "…" : "Pay link"}
            </button>
            <button
              type="button"
              onClick={onSendViaSms}
              disabled={disabled || smsLoading}
              className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
            >
              {smsLoading ? "…" : smsSent ? "Sent" : "SMS"}
            </button>
            {error && <span className="text-xs text-destructive">{error}</span>}
            {smsError && <span className="text-xs text-destructive">{smsError}</span>}
          </>
        )}
      </span>
    );
  }

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
              onClick={onSendViaSms}
              disabled={smsLoading}
              className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
            >
              {smsLoading ? "Sending…" : smsSent ? "Sent via SMS" : "Send via SMS"}
            </button>
            {smsError && <span className="text-xs text-destructive self-center">{smsError}</span>}
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
          <DevHint message="POST /api/checkout/create → Stripe Checkout session. Link copied to clipboard; customer can pay with card, Apple Pay, or Google Pay.">
            <button
              type="button"
              onClick={onCollectPayment}
              disabled={disabled || isLoading}
              className="btn-primary w-full"
            >
              {isLoading ? "Creating link…" : "Copy pay link"}
            </button>
          </DevHint>
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
