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
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground">Invoice</h3>
        <p className="mt-2 text-sm text-muted-foreground">No invoice created yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Invoice</h3>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
          {invoice.status.replace("_", " ")}
        </span>
      </div>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="tabular-nums">{formatCents(invoice.subtotal_cents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Tax</dt>
          <dd className="tabular-nums">{formatCents(invoice.tax_cents)}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-2 font-medium">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatCents(invoice.total_cents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Paid</dt>
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
