import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { SubmitButton } from "@/components/SubmitButton";
import { deleteQuoteAndOptionalJob } from "@/lib/job-destruct";
import { formatCents } from "@/lib/money";
import { workflowStageLabel } from "@/lib/quote-workflow";
import { getOfficeSessionOrNull, UNAUTHORIZED_TOAST } from "@/lib/server-action-guards";
import { setToastCookie } from "@/lib/toast";
import { VW_STONE_WORX_COUNTERTOP_TEMPLATE_ID } from "@/lib/quote-templates";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function deleteQuoteFromList(formData: FormData) {
  "use server";
  const quoteId = String(formData.get("quote_id") ?? "").trim();
  if (!quoteId) return;
  const session = await getOfficeSessionOrNull();
  if (!session) {
    await setToastCookie(UNAUTHORIZED_TOAST);
    revalidatePath("/admin/quotes");
    return;
  }
  const { supabase } = session;
  const result = await deleteQuoteAndOptionalJob(supabase, quoteId);
  if (!result.ok) {
    await setToastCookie(result.message);
    revalidatePath("/admin/quotes");
    return;
  }
  revalidatePath("/admin/quotes");
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/customers");
  await setToastCookie("Deleted");
  redirect("/admin/quotes");
}

type ListSearchParams = {
  q?: string;
  stage?: string;
  status?: string;
  link?: string;
};

function filterQuotes<
  T extends {
    title: string;
    status: string;
    workflow_stage?: string | null;
    job_id: string | null;
    customers: { id: string; name: string } | { id: string; name: string }[] | null;
  },
>(rows: T[], sp: ListSearchParams, getCustomerName: (q: T) => string | undefined): T[] {
  const q = sp.q?.trim().toLowerCase() ?? "";
  const stage = sp.stage ?? "all";
  const status = sp.status ?? "all";
  const link = sp.link ?? "all";

  let out = rows;

  if (link === "open") {
    out = out.filter((r) => !r.job_id);
  } else if (link === "linked") {
    out = out.filter((r) => !!r.job_id);
  }

  if (stage === "estimate") {
    out = out.filter((r) => !r.job_id && (r.workflow_stage ?? "estimate") !== "quote");
  } else if (stage === "quote") {
    out = out.filter((r) => !r.job_id && r.workflow_stage === "quote");
  } else if (stage === "job") {
    out = out.filter((r) => !!r.job_id);
  }

  if (status !== "all") {
    out = out.filter((r) => r.status === status);
  }

  if (q) {
    out = out.filter((r) => {
      const name = (getCustomerName(r) ?? "").toLowerCase();
      return r.title.toLowerCase().includes(q) || name.includes(q);
    });
  }

  return out;
}

export default async function QuotesListPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("id,title,status,workflow_stage,total_cents,created_at,job_id,customers(id,name)")
    .order("created_at", { ascending: false });

  type QuoteRow = {
    id: string;
    title: string;
    status: string;
    workflow_stage?: string | null;
    total_cents: number;
    created_at: string;
    job_id: string | null;
    customers: { id: string; name: string } | { id: string; name: string }[] | null;
  };

  const rows: QuoteRow[] = (quotes ?? []) as QuoteRow[];
  const getCustomerName = (q: QuoteRow) =>
    Array.isArray(q.customers) ? q.customers[0]?.name : q.customers?.name;

  const filtered = filterQuotes(rows, sp, getCustomerName);

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-section schedule-delay-0 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Estimates &amp; quotes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">New records start as estimates; promote when pricing is firm.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/quotes/new" className="btn-primary">
            New estimate
          </Link>
          <Link href="/admin/quotes/templates" className="btn-secondary">
            Templates
          </Link>
          <Link
            href={`/admin/quotes/new?template=${VW_STONE_WORX_COUNTERTOP_TEMPLATE_ID}`}
            className="btn-secondary"
          >
            VW / Stone Worx countertop
          </Link>
        </div>
      </div>

      <form
        method="get"
        className="animate-card-in schedule-delay-50 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
      >
        <label className="min-w-[12rem] flex-1">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Search</span>
          <input
            name="q"
            type="search"
            defaultValue={sp.q ?? ""}
            placeholder="Title or customer"
            className="field w-full"
          />
        </label>
        <label className="min-w-[9rem]">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Stage</span>
          <select name="stage" defaultValue={sp.stage ?? "all"} className="field w-full">
            <option value="all">All stages</option>
            <option value="estimate">Estimate</option>
            <option value="quote">Formal quote</option>
            <option value="job">On job</option>
          </select>
        </label>
        <label className="min-w-[9rem]">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Sales status</span>
          <select name="status" defaultValue={sp.status ?? "all"} className="field w-full">
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
          </select>
        </label>
        <label className="min-w-[9rem]">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Job link</span>
          <select name="link" defaultValue={sp.link ?? "all"} className="field w-full">
            <option value="all">All</option>
            <option value="open">Open (no job)</option>
            <option value="linked">Linked to job</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primary">
            Apply filters
          </button>
          <Link href="/admin/quotes" className="btn-secondary">
            Clear
          </Link>
        </div>
      </form>

      <section className="animate-card-in schedule-delay-75 rounded-2xl border border-border bg-card overflow-hidden shadow-lg shadow-black/5 transition-shadow duration-300 hover:shadow-xl">
        <div className="table-wrap overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="table-header py-3 pl-5 pr-4">Title</th>
                <th className="table-header py-3 pr-4">Customer</th>
                <th className="table-header py-3 pr-4">Stage</th>
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
                    colSpan={7}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No estimates yet. Create one to send pricing to customers before scheduling a job.
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    No estimates match these filters.{" "}
                    <Link href="/admin/quotes" className="text-primary underline">
                      Clear filters
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                filtered.map((q) => (
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
                      <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        {q.job_id ? "Job" : workflowStageLabel(q.workflow_stage)}
                      </span>
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
