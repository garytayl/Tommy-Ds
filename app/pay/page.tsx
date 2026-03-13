"use client";

import { useState } from "react";
import Link from "next/link";

import { PublicShell } from "@/components/PublicShell";
import { PayWithCardButton } from "@/components/PayWithCardButton";
import { formatCents } from "@/lib/money";

type LookupResult =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "not_found"; error?: string }
  | { status: "already_paid"; invoiceId: string; invoiceNumber?: number }
  | {
      status: "balance_due";
      invoiceId: string;
      balanceDueCents: number;
      customerName: string | null;
      invoiceNumber?: number;
    };

export default function PayInvoicePage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<LookupResult>({ status: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = input.trim();
    if (!value) return;
    setResult({ status: "loading" });
    try {
      const params = new URLSearchParams({ id: value });
      const res = await fetch(`/api/invoices/lookup?${params}`);
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        invoiceId?: string;
        invoiceNumber?: number;
        balanceDueCents?: number;
        alreadyPaid?: boolean;
        customerName?: string | null;
      } | null;
      if (!res.ok) {
        setResult({
          status: "not_found",
          error: data?.error ?? "Invoice not found",
        });
        return;
      }
      if (data?.alreadyPaid && data?.invoiceId) {
        setResult({ status: "already_paid", invoiceId: data.invoiceId, invoiceNumber: data.invoiceNumber });
        return;
      }
      if (
        data?.invoiceId != null &&
        typeof data.balanceDueCents === "number" &&
        data.balanceDueCents > 0
      ) {
        setResult({
          status: "balance_due",
          invoiceId: data.invoiceId,
          balanceDueCents: data.balanceDueCents,
          customerName: data.customerName ?? null,
          invoiceNumber: data.invoiceNumber,
        });
        return;
      }
      setResult({ status: "not_found", error: "Invoice not found" });
    } catch {
      setResult({ status: "not_found", error: "Lookup failed. Please try again." });
    }
  }

  return (
    <PublicShell>
      <div className="container mx-auto max-w-lg flex-1 px-4 py-10 md:px-6 md:py-14">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Pay your invoice
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your invoice number from your bill, or use the link we sent you to pay by card
          online.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label htmlFor="invoice-number" className="block text-sm font-medium text-foreground">
            Invoice number
          </label>
          <input
            id="invoice-number"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. first 8 characters or full ID"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={result.status === "loading"}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {result.status === "loading" ? "Looking up…" : "Look up invoice"}
          </button>
        </form>

        {result.status === "not_found" && (
          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-foreground">
              {result.error ?? "Invoice not found."}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Check the number and try again, or pay by check to the address on your bill.
            </p>
          </div>
        )}

        {result.status === "already_paid" && (
          <div className="mt-6 rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">
              This invoice is paid.{result.invoiceNumber != null && ` (Invoice #${result.invoiceNumber})`}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              <Link href={`/receipt/${result.invoiceId}`} className="text-primary hover:underline">
                View your receipt →
              </Link>
            </p>
          </div>
        )}

        {result.status === "balance_due" && (
          <div className="mt-6 rounded-xl border border-border bg-card p-4 space-y-4">
            <p className="text-sm text-foreground">
              {result.invoiceNumber != null && (
                <span className="font-medium tabular-nums">Invoice #{result.invoiceNumber}</span>
              )}
              {result.invoiceNumber != null && (result.customerName || result.balanceDueCents > 0) && (
                <span className="text-muted-foreground"> · </span>
              )}
              {result.customerName ? (
                <span className="font-medium">{result.customerName}</span>
              ) : null}
              {result.customerName && result.balanceDueCents > 0 && (
                <span className="text-muted-foreground"> · </span>
              )}
              Balance due: <span className="font-semibold tabular-nums">{formatCents(result.balanceDueCents)}</span>
            </p>
            <PayWithCardButton invoiceId={result.invoiceId} />
          </div>
        )}

        <p className="mt-8 text-xs text-muted-foreground">
          You can also send a check to the address on your bill. Questions?{" "}
          <a href="tel:812-330-8898" className="text-primary hover:underline">
            812-330-8898
          </a>
        </p>
      </div>
    </PublicShell>
  );
}
