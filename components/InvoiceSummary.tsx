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
      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold">Invoice</h3>
        <p className="mt-2 text-sm text-zinc-500">No invoice created yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Invoice</h3>
        <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs">
          {invoice.status}
        </span>
      </div>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-zinc-600">Subtotal</dt>
          <dd>{formatCents(invoice.subtotal_cents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-zinc-600">Tax</dt>
          <dd>{formatCents(invoice.tax_cents)}</dd>
        </div>
        <div className="flex justify-between border-t pt-2 font-medium">
          <dt>Total</dt>
          <dd>{formatCents(invoice.total_cents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-zinc-600">Paid</dt>
          <dd>{formatCents(invoice.deposit_paid_cents)}</dd>
        </div>
        <div className="flex justify-between font-semibold">
          <dt>Balance Due</dt>
          <dd>{formatCents(invoice.balance_due_cents)}</dd>
        </div>
      </dl>
    </div>
  );
}
