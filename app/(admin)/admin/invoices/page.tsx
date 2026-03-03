import Link from "next/link";

import { formatCents } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function InvoicesListPage() {
  const supabase = await createSupabaseServerClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id,status,total_cents,balance_due_cents,jobs(id,title,customers(name))",
    )
    .order("created_at", { ascending: false });

  type InvoiceRow = {
    id: string;
    status: string;
    total_cents: number;
    balance_due_cents: number;
    jobs: unknown;
  };

  const rows: InvoiceRow[] = invoices ?? [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Invoices
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All invoices. Open to add line items, set tax, and manage status.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="table-wrap overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="table-header py-3 pl-5 pr-4">Job</th>
                <th className="table-header py-3 pr-4">Customer</th>
                <th className="table-header py-3 pr-4">Status</th>
                <th className="table-header py-3 pr-4 text-right">Total</th>
                <th className="table-header py-3 pr-4 text-right">Balance</th>
                <th className="table-header py-3 pr-5">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No invoices yet. Create a job, then create an invoice from the job page.
                  </td>
                </tr>
              ) : (
                rows.map((inv) => {
                  const job = Array.isArray(inv.jobs) ? inv.jobs[0] : inv.jobs;
                  const jobObj = job as { id?: string; title?: string; customers?: { name?: string } | { name?: string }[] } | null;
                  const customer = jobObj?.customers;
                  const name = Array.isArray(customer) ? customer[0]?.name : (customer as { name?: string } | undefined)?.name;
                  return (
                    <tr
                      key={inv.id}
                      className="border-b border-border last:border-0 transition hover:bg-muted/30"
                    >
                      <td className="py-3 pl-5 pr-4 font-medium text-foreground">
                        {jobObj?.title ?? "-"}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {name ?? "-"}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground capitalize">
                          {inv.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {formatCents(inv.total_cents)}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium tabular-nums">
                        {formatCents(inv.balance_due_cents)}
                      </td>
                      <td className="py-3 pr-5">
                        <Link
                          href={`/admin/invoices/${inv.id}`}
                          className="link text-sm"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
