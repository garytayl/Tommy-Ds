import { formatCents } from "@/lib/money";

type InvoiceSummaryProps = {
  invoice: {
    id: string;
    status: string;
    subtotal_cents: number;
    tax_cents: number;
    total_cents: number;
    deposit_paid_cents: number;
    balance_due_cents: number;
  } | null;
};

export function InvoiceSummary({ invoice }: InvoiceSummaryProps) {
  if (!invoice) {
    return (
      <div className="card p-5">
        <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Invoice</h3>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>No invoice created yet.</p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Invoice</h3>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-medium capitalize"
          style={{ backgroundColor: "var(--muted-bg)", color: "var(--muted)" }}
        >
          {invoice.status.replace("_", " ")}
        </span>
      </div>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt style={{ color: "var(--muted)" }}>Subtotal</dt>
          <dd className="tabular-nums">{formatCents(invoice.subtotal_cents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt style={{ color: "var(--muted)" }}>Tax</dt>
          <dd className="tabular-nums">{formatCents(invoice.tax_cents)}</dd>
        </div>
        <div className="flex justify-between border-t pt-2 font-medium" style={{ borderColor: "var(--border)" }}>
          <dt>Total</dt>
          <dd className="tabular-nums">{formatCents(invoice.total_cents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt style={{ color: "var(--muted)" }}>Paid</dt>
          <dd className="tabular-nums">{formatCents(invoice.deposit_paid_cents)}</dd>
        </div>
        <div className="flex justify-between font-semibold">
          <dt>Balance Due</dt>
          <dd className="tabular-nums">{formatCents(invoice.balance_due_cents)}</dd>
        </div>
      </dl>
    </div>
  );
}
