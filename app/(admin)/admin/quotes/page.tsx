import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { SubmitButton } from "@/components/SubmitButton";
import { deleteQuoteAndOptionalJob } from "@/lib/job-destruct";
import { formatCents } from "@/lib/money";
import { setToastCookie } from "@/lib/toast";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

async function deleteQuoteFromList(formData: FormData) {
  "use server";
  const quoteId = String(formData.get("quote_id") ?? "").trim();
  if (!quoteId) return;
  const supabase = await createSupabaseServerClientForData();
  const result = await deleteQuoteAndOptionalJob(supabase, quoteId);
  if (!result.ok) {
    await setToastCookie(result.message);
    revalidatePath("/admin/quotes");
    return;
  }
  revalidatePath("/admin/quotes");
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/customers");
  await setToastCookie("Quote deleted");
  redirect("/admin/quotes");
}

export default async function QuotesListPage() {
  const supabase = await createSupabaseServerClientForData();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("id,title,status,total_cents,created_at,job_id,customers(id,name)")
    .order("created_at", { ascending: false });

  type QuoteRow = {
    id: string;
    title: string;
    status: string;
    total_cents: number;
    created_at: string;
    job_id: string | null;
    customers: { id: string; name: string } | { id: string; name: string }[] | null;
  };

  const rows: QuoteRow[] = (quotes ?? []) as QuoteRow[];
  const getCustomerName = (q: QuoteRow) =>
    Array.isArray(q.customers) ? q.customers[0]?.name : q.customers?.name;

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-section schedule-delay-0 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Quotes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create estimates, send to customers, then convert to a job when approved.
          </p>
        </div>
        <Link href="/admin/quotes/new" className="btn-primary">
          New quote
        </Link>
      </div>

      <section className="animate-card-in schedule-delay-75 rounded-2xl border border-border bg-card overflow-hidden shadow-lg shadow-black/5 transition-shadow duration-300 hover:shadow-xl">
        <div className="table-wrap overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="table-header py-3 pl-5 pr-4">Title</th>
                <th className="table-header py-3 pr-4">Customer</th>
                <th className="table-header py-3 pr-4">Status</th>
                <th className="table-header py-3 pr-4 text-right">Total</th>
                <th className="table-header py-3 pr-4">Created</th>
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
                    No quotes yet. Create one to send estimates to customers before scheduling a job.
                  </td>
                </tr>
              ) : (
                rows.map((q) => (
                  <tr
                    key={q.id}
                    className="border-b border-border last:border-0 transition-all duration-200 hover:bg-muted/30"
                  >
                    <td className="py-3 pl-5 pr-4 font-medium text-foreground">
                      {q.title}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {getCustomerName(q) ?? "-"}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground capitalize">
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {formatCents(q.total_cents)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {new Date(q.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/admin/quotes/${q.id}`} className="link text-sm">
                          Open
                        </Link>
                        {q.job_id && (
                          <Link href={`/jobs/${q.job_id}`} className="link text-sm text-muted-foreground">
                            Job
                          </Link>
                        )}
                        <form action={deleteQuoteFromList} className="inline">
                          <input type="hidden" name="quote_id" value={q.id} />
                          <SubmitButton variant="danger" className="text-xs" pendingLabel="Deleting…">
                            Delete
                          </SubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
