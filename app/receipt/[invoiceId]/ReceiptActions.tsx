"use client";

import { useState } from "react";

type ReceiptActionsProps = {
  invoiceId: string;
  customerEmail: string | null;
  customerName: string | null;
};

export function ReceiptActions({
  invoiceId,
  customerEmail,
  customerName,
}: ReceiptActionsProps) {
  const [docusignLoading, setDocusignLoading] = useState(false);
  const [docusignError, setDocusignError] = useState<string | null>(null);
  const [docusignSent, setDocusignSent] = useState(false);

  function onPrint() {
    window.print();
  }

  async function onSendForSignature() {
    setDocusignLoading(true);
    setDocusignError(null);
    try {
      const res = await fetch("/api/docusign/send-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          signerEmail: customerEmail ?? undefined,
          signerName: customerName ?? undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { signingUrl?: string; envelopeId?: string; error?: string; message?: string }
        | null;
      if (!res.ok) {
        throw new Error(data?.error ?? data?.message ?? "Failed to send for signature");
      }
      if (data?.signingUrl) {
        window.open(data.signingUrl, "_blank");
      }
      setDocusignSent(true);
    } catch (err) {
      setDocusignError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setDocusignLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onPrint}
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
      >
        Print receipt
      </button>
      <button
        type="button"
        onClick={onSendForSignature}
        disabled={docusignLoading || (!customerEmail && !docusignSent)}
        className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {docusignLoading ? "Sending…" : docusignSent ? "Sent for signature" : "Send for DocuSign signature"}
      </button>
      {!customerEmail && !docusignSent ? (
        <span className="text-xs text-muted-foreground">Add customer email on the job to enable.</span>
      ) : null}
      {docusignError ? (
        <span className="text-xs text-destructive">{docusignError}</span>
      ) : null}
    </div>
  );
}
