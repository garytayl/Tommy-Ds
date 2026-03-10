"use client";

import { useState } from "react";

type SendReceiptForSignatureProps = {
  invoiceId: string;
  customerEmail: string | null;
  customerName: string | null;
};

export function SendReceiptForSignature({
  invoiceId,
  customerEmail,
  customerName,
}: SendReceiptForSignatureProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!customerEmail) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/docusign/send-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          signerEmail: customerEmail,
          signerName: customerName ?? "Customer",
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { signingUrl?: string; error?: string; message?: string }
        | null;
      if (!res.ok) {
        throw new Error(data?.error ?? data?.message ?? "Failed to send for signature");
      }
      if (data?.signingUrl) {
        window.open(data.signingUrl, "_blank");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  if (!customerEmail) {
    return (
      <span className="text-xs text-muted-foreground">
        Add customer email on the job to send receipt for signature.
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={handleSend}
        disabled={loading || sent}
        className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Sending…" : sent ? "Sent for signature" : "Send receipt for DocuSign signature"}
      </button>
      {sent ? (
        <span className="text-xs text-muted-foreground">
          Sent to <strong>{customerEmail}</strong>. They&apos;ll receive an email from DocuSign to sign.
        </span>
      ) : null}
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : null}
    </div>
  );
}
