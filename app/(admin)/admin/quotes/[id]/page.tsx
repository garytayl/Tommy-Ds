import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { QuoteDetailHeader } from "@/components/QuoteDetailHeader";
import { QuoteDetailTabRow } from "@/components/QuoteDetailTabRow";
import { QuoteNotesDisplay, quoteNotesSectionTitle, quoteNotesShowSubtitle } from "@/components/QuoteNotesDisplay";
import { QuoteRecordActions } from "@/components/QuoteRecordActions";
import { normalizeQuoteDetailTab } from "@/components/QuoteDetailTabs";
import { SubmitButton } from "@/components/SubmitButton";
import { deleteQuoteAndOptionalJob } from "@/lib/job-destruct";
import { centsToDollars, formatCents, dollarsToCents } from "@/lib/money";
import { getPrintVsLiveDriftMessages } from "@/lib/quote-print-drift";
import type { ItemLike } from "@/lib/quote-print-overrides";
import type { QuoteRevisionSnapshot } from "@/lib/quote-revisions";
import { setToastCookie } from "@/lib/toast";
import { workflowStageLabel } from "@/lib/quote-workflow";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

import {
  addQuoteLineItem,
  deleteQuoteLineItem,
  moveQuoteLineItem,
  restoreQuoteFromRevision,
  updateQuoteDetails,
  updateQuoteLineItem,
} from "./quote-detail-actions";
import { recordQuoteRevision } from "./print/edit/actions";

const QUOTE_STATUSES = ["draft", "sent", "accepted", "declined"];
const QUOTE_DOC_MAX_BYTES = 30 * 1024 * 1024;

type QuoteDocRow = {
  id: string;
  storage_path: string;
  file_name: string;
  fabricator_label: string | null;
  created_at: string;
};

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const rawTab = typeof sp.tab === "string" ? sp.tab : Array.isArray(sp.tab) ? sp.tab[0] : undefined;
  const tab = normalizeQuoteDetailTab(rawTab);
  const supabase = await createSupabaseServerClientForData();

  const [quoteResult, itemsResult, docsResult, revResult] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "id,customer_id,title,address_line1,address_line2,city,state,zip,status,workflow_stage,deposit_received,subtotal_cents,tax_cents,total_cents,notes,job_id,created_at,print_overrides,customers(id,name,phone,email,address_line1,address_line2,city,state,zip)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("quote_items")
      .select("id,description,qty,unit_price_cents,line_total_cents,created_at,sort_order")
      .eq("quote_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("quote_documents")
      .select("id,storage_path,file_name,fabricator_label,created_at")
      .eq("quote_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("quote_revisions")
      .select("id,revision_number,label,created_at,created_by,snapshot")
      .eq("quote_id", id)
      .order("revision_number", { ascending: false }),
  ]);

  const quote = quoteResult.data;
  const items = itemsResult.data ?? [];
  const docs = (docsResult.data ?? []) as QuoteDocRow[];
  const revisions = revResult.data ?? [];
  const latestRevision = revisions.length > 0 ? revisions[0] : null;

  const authorIds = [...new Set(revisions.map((r) => r.created_by).filter(Boolean))] as string[];
  let authorNames = new Map<string, string | null>();
  if (authorIds.length > 0) {
    const { data: profs } = await supabase.from("profiles").select("user_id,full_name").in("user_id", authorIds);
    authorNames = new Map((profs ?? []).map((p) => [p.user_id, p.full_name]));
  }

  if (!quote) notFound();

  const po = (quote as { print_overrides?: unknown }).print_overrides;
  const hasPrintOverrides =
    po != null && typeof po === "object" && Object.keys(po as Record<string, unknown>).length > 0;

  const customer = Array.isArray(quote.customers) ? quote.customers[0] : quote.customers;
  type CustomerRow = {
    id?: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    address_line1?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  };
  const cust = customer as CustomerRow | null;
  const hasCustomerProfileAddress = Boolean(
    cust &&
      [cust.address_line1, cust.address_line2, cust.city, cust.state, cust.zip].some(
        (v) => v != null && String(v).trim() !== "",
      ),
  );
  const workflowStage =
    (quote as { workflow_stage?: string }).workflow_stage === "quote" ? "quote" : "estimate";
  const canConvertToJob =
    !quote.job_id && workflowStage === "quote" && (quote.status === "draft" || quote.status === "sent");
  const depositReceivedFlag = Boolean((quote as { deposit_received?: boolean }).deposit_received);
  const showQuoteNotesSubtitle = quote.notes ? quoteNotesShowSubtitle(quote.notes) : false;

  const itemsForDrift: ItemLike[] = items.map((i) => ({
    description: i.description,
    qty: Number(i.qty),
    unit_price_cents: i.unit_price_cents,
    line_total_cents: i.line_total_cents,
  }));
  const driftMessages = getPrintVsLiveDriftMessages(
    {
      title: quote.title,
      address_line1: quote.address_line1,
      address_line2: quote.address_line2,
      city: quote.city,
      state: quote.state,
      zip: quote.zip,
      subtotal_cents: quote.subtotal_cents,
      tax_cents: quote.tax_cents,
      total_cents: quote.total_cents,
      notes: quote.notes,
      created_at: quote.created_at,
    },
    customer ? { name: customer.name, phone: customer.phone, email: customer.email } : null,
    itemsForDrift,
    workflowStageLabel(workflowStage),
    po,
  );

  let docsWithUrls: (QuoteDocRow & { signed_url: string | null })[] = docs.map((d) => ({
    ...d,
    signed_url: null,
  }));
  try {
    const serviceClient = createSupabaseServiceClient();
    docsWithUrls = await Promise.all(
      docs.map(async (doc) => {
        const { data } = await serviceClient.storage
          .from("quote-documents")
          .createSignedUrl(doc.storage_path, 60 * 30);
        return { ...doc, signed_url: data?.signedUrl ?? null };
      }),
    );
  } catch {
    // no service role
  }

  async function updateQuoteTax(formData: FormData) {
    "use server";

    const taxCents = dollarsToCents(String(formData.get("tax") ?? "0"));
    const supabase = await createSupabaseServerClientForData();
    await supabase.from("quotes").update({ tax_cents: taxCents }).eq("id", id);
    await supabase.rpc("recompute_quote_totals", { p_quote_id: id });

    await setToastCookie("Tax updated");
    revalidatePath(`/admin/quotes/${id}`);
  }

  async function updateQuoteStatus(formData: FormData) {
    "use server";

    const status = String(formData.get("status") ?? "draft");
    if (!QUOTE_STATUSES.includes(status)) return;

    const supabase = await createSupabaseServerClientForData();
    const { data: current } = await supabase.from("quotes").select("job_id,status").eq("id", id).single();
    await supabase.from("quotes").update({ status }).eq("id", id);

    if (current?.job_id && status === "sent") {
      await supabase.from("activities").insert({
        job_id: current.job_id,
        type: "quote_sent",
        title: "Quote sent",
        status: "completed",
      });
    }
    if (current?.job_id && status === "accepted") {
      await supabase.from("jobs").update({ status: "approved" }).eq("id", current.job_id);
      await supabase.from("activities").insert({
        job_id: current.job_id,
        type: "customer_acceptance",
        title: "Customer accepted quote",
        status: "completed",
      });
    }

    await setToastCookie("Quote updated");
    revalidatePath(`/admin/quotes/${id}`);
    revalidatePath(`/jobs/${current?.job_id ?? ""}`);
  }

  async function convertQuoteToJob(formData: FormData) {
    "use server";

    const quoteId = formData.get("quote_id");
    if (typeof quoteId !== "string") return;

    const supabase = await createSupabaseServerClientForData();
    const { data: quoteRow } = await supabase
      .from("quotes")
      .select("id,customer_id,title,address_line1,address_line2,city,state,zip,notes,subtotal_cents,tax_cents,total_cents,job_id,workflow_stage,deposit_received")
      .eq("id", quoteId)
      .maybeSingle();

    if (!quoteRow || quoteRow.job_id) return;
    const rowStage = (quoteRow as { workflow_stage?: string }).workflow_stage ?? "estimate";
    if (rowStage !== "quote") {
      await setToastCookie("Promote this record to a formal quote before converting to a job");
      return;
    }

    const depositConfirmation = String(formData.get("deposit_confirmation") ?? "").trim();
    if (depositConfirmation !== "received" && depositConfirmation !== "not_yet") {
      await setToastCookie("Confirm whether the customer has paid a deposit before converting");
      return;
    }

    const { data: newJob } = await supabase
      .from("jobs")
      .insert({
        customer_id: quoteRow.customer_id,
        title: quoteRow.title,
        address_line1: quoteRow.address_line1,
        address_line2: quoteRow.address_line2 ?? null,
        city: quoteRow.city,
        state: quoteRow.state,
        zip: quoteRow.zip,
        job_kind: "installation",
        status: "lead",
        notes: quoteRow.notes ?? null,
      })
      .select("id")
      .single();

    if (!newJob) return;

    const { data: newInvoice } = await supabase
      .from("invoices")
      .insert({
        job_id: newJob.id,
        status: "draft",
        subtotal_cents: quoteRow.subtotal_cents,
        tax_cents: quoteRow.tax_cents,
        total_cents: quoteRow.total_cents,
        balance_due_cents: quoteRow.total_cents,
      })
      .select("id")
      .single();

    const itemsRes = await supabase
      .from("quote_items")
      .select("description,qty,unit_price_cents,line_total_cents")
      .eq("quote_id", quoteId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    const quoteItems = itemsRes.data ?? [];
    if (newInvoice && quoteItems.length > 0) {
      await supabase.from("invoice_items").insert(
        quoteItems.map((item) => ({
          invoice_id: newInvoice.id,
          description: item.description,
          qty: item.qty,
          unit_price_cents: item.unit_price_cents,
          line_total_cents: item.line_total_cents,
        }))
      );
      await supabase.rpc("recompute_invoice_totals", { p_invoice_id: newInvoice.id });
    }

    const hadDeposit = Boolean((quoteRow as { deposit_received?: boolean }).deposit_received);
    const depositReceived = depositConfirmation === "received" ? true : hadDeposit;

    await supabase
      .from("quotes")
      .update({ job_id: newJob.id, status: "accepted", deposit_received: depositReceived })
      .eq("id", quoteId);
    await supabase.from("jobs").update({ status: "approved" }).eq("id", newJob.id);
    await supabase.from("activities").insert({
      job_id: newJob.id,
      type: "customer_acceptance",
      title: "Customer accepted quote",
      status: "completed",
    });

    await setToastCookie("Converted to job");
    revalidatePath("/admin/quotes");
    revalidatePath(`/admin/quotes/${id}`);
    revalidatePath("/admin/jobs");
    revalidatePath("/admin/schedule");
    const { redirect: rd } = await import("next/navigation");
    rd(`/jobs/${newJob.id}`);
  }

  async function promoteToFormalQuote() {
    "use server";
    const supabase = await createSupabaseServerClientForData();
    const { data: row } = await supabase.from("quotes").select("job_id,workflow_stage").eq("id", id).maybeSingle();
    if (!row || row.job_id) return;
    if ((row as { workflow_stage?: string }).workflow_stage === "quote") return;
    await supabase.from("quotes").update({ workflow_stage: "quote" }).eq("id", id);
    await setToastCookie("Promoted to formal quote — you can convert to a job when ready");
    revalidatePath(`/admin/quotes/${id}`);
    revalidatePath("/admin/quotes");
  }

  async function updateDepositReceived(formData: FormData) {
    "use server";
    const supabase = await createSupabaseServerClientForData();
    const { data: row } = await supabase.from("quotes").select("job_id").eq("id", id).maybeSingle();
    if (!row || row.job_id) return;
    const checked = formData.get("deposit_received") === "true";
    await supabase.from("quotes").update({ deposit_received: checked }).eq("id", id);
    await setToastCookie(checked ? "Deposit marked as received" : "Deposit not marked");
    revalidatePath(`/admin/quotes/${id}`);
    revalidatePath("/admin/quotes");
  }

  async function uploadQuoteDocument(formData: FormData) {
    "use server";

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) return;
    if (file.size > QUOTE_DOC_MAX_BYTES) {
      await setToastCookie("File too large (max 30 MB)");
      revalidatePath(`/admin/quotes/${id}`);
      return;
    }

    const fabricatorLabel = String(formData.get("fabricator_label") ?? "").trim() || null;
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
    const storagePath = `${id}/${Date.now()}-${safeName}`;

    const supabase = await createSupabaseServerClientForData();
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabase.storage.from("quote-documents").upload(storagePath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
    if (uploadError) {
      const detail = uploadError.message ? `: ${uploadError.message}` : "";
      await setToastCookie(`Upload failed${detail}`.slice(0, 220));
      revalidatePath(`/admin/quotes/${id}`);
      return;
    }

    const { error: insertError } = await supabase.from("quote_documents").insert({
      quote_id: id,
      storage_path: storagePath,
      file_name: file.name,
      fabricator_label: fabricatorLabel,
      content_type: file.type || null,
    });

    if (insertError) {
      await supabase.storage.from("quote-documents").remove([storagePath]);
      await setToastCookie(
        (insertError.message
          ? `Saved file but could not attach: ${insertError.message}`
          : "Saved file but could not attach to this quote (database error)."
        ).slice(0, 220),
      );
      revalidatePath(`/admin/quotes/${id}`);
      return;
    }

    await setToastCookie("Document attached");
    revalidatePath(`/admin/quotes/${id}`);
  }

  async function deleteQuoteDocument(formData: FormData) {
    "use server";

    const docId = String(formData.get("doc_id") ?? "");
    if (!docId) return;

    const supabase = await createSupabaseServerClientForData();
    const { data: row } = await supabase
      .from("quote_documents")
      .select("id,storage_path,quote_id")
      .eq("id", docId)
      .eq("quote_id", id)
      .maybeSingle();

    if (!row) return;

    try {
      const serviceClient = createSupabaseServiceClient();
      await serviceClient.storage.from("quote-documents").remove([row.storage_path]);
    } catch {
      // still remove DB row
    }

    await supabase.from("quote_documents").delete().eq("id", docId);
    await setToastCookie("Document removed");
    revalidatePath(`/admin/quotes/${id}`);
  }

  async function deleteQuoteAction() {
    "use server";
    const supabase = await createSupabaseServerClientForData();
    const result = await deleteQuoteAndOptionalJob(supabase, id);
    if (!result.ok) {
      await setToastCookie(result.message);
      revalidatePath(`/admin/quotes/${id}`);
      return;
    }
    revalidatePath("/admin/quotes");
    revalidatePath("/admin/jobs");
    revalidatePath("/admin/customers");
    await setToastCookie("Deleted");
    redirect("/admin/quotes");
  }

  async function recordQuoteRevisionAction(formData: FormData) {
    "use server";
    const qid = String(formData.get("quote_id") ?? "");
    const message =
      String(formData.get("message") ?? "").trim() || String(formData.get("label") ?? "").trim();
    if (qid !== id) return;
    const result = await recordQuoteRevision(qid, message || null);
    if (!result.ok) {
      await setToastCookie(result.message);
      revalidatePath(`/admin/quotes/${id}`);
      return;
    }
    await setToastCookie("Snapshot saved to revision history");
    revalidatePath(`/admin/quotes/${id}`);
  }

  async function restoreQuoteRevisionAction(formData: FormData) {
    "use server";
    const qid = String(formData.get("quote_id") ?? "");
    if (qid !== id) return;
    await restoreQuoteFromRevision(id, formData);
  }

  const wfStage: "estimate" | "quote" = workflowStage === "quote" ? "quote" : "estimate";

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <QuoteDetailHeader
        quoteId={id}
        quoteTitle={quote.title}
        customerName={cust?.name ?? null}
        addressSummary={`${quote.address_line1}, ${quote.city}, ${quote.state} ${quote.zip}`}
        workflowStage={wfStage}
        jobId={quote.job_id}
        latestRevision={latestRevision}
        status={quote.status}
        totalCents={quote.total_cents}
      />

      <QuoteRecordActions
        quoteId={id}
        jobId={quote.job_id}
        workflowStage={wfStage}
        canConvertToJob={canConvertToJob}
        hasPrintOverrides={hasPrintOverrides}
        promoteToFormalQuote={promoteToFormalQuote}
      />

      {driftMessages.length > 0 && (
        <div
          className="flex flex-col gap-3 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          role="status"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">PDF differs from live data</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs opacity-90">
              {driftMessages.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
          <Link href={`/admin/quotes/${id}/print/edit`} className="btn-primary shrink-0 text-sm">
            Prepare PDF
          </Link>
        </div>
      )}

      <QuoteDetailTabRow
        quoteId={id}
        activeTab={tab}
        counts={{
          lines: items.length,
          documents: docsWithUrls.length,
          revisions: revisions.length,
        }}
      />

      <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {tab === "details" && (
          <>
        {!quote.job_id && (
          <section className="border-b border-border px-4 py-3 sm:px-5 sm:py-3.5">
            <h2 className="text-sm font-semibold text-foreground">Quote details</h2>
            {cust?.id && hasCustomerProfileAddress && (
              <div className="mt-3 rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                <p className="text-xs font-medium text-foreground">Customer address (billing)</p>
                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                  {[
                    [cust.address_line1, cust.address_line2].filter(Boolean).join(", "),
                    [cust.city, cust.state, cust.zip].filter(Boolean).join(", "),
                  ]
                    .filter(Boolean)
                    .join("\n")}
                </p>
                <Link href={`/admin/customers/${cust.id}`} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
                  Edit customer profile
                </Link>
              </div>
            )}
            <form action={updateQuoteDetails.bind(null, id)} className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
                <input
                  name="title"
                  type="text"
                  required
                  defaultValue={quote.title}
                  className="field w-full text-lg font-semibold tracking-tight"
                />
              </div>
              <div className="sm:col-span-2">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Project / service address</p>
                <p className="mb-2 text-[0.65rem] text-muted-foreground">
                  Job site or location for this estimate (separate from the customer&apos;s billing address above).
                </p>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Address line 1</label>
                <input
                  name="address_line1"
                  type="text"
                  required
                  defaultValue={quote.address_line1}
                  className="field w-full"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Address line 2</label>
                <input
                  name="address_line2"
                  type="text"
                  defaultValue={quote.address_line2 ?? ""}
                  className="field w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">City</label>
                <input name="city" type="text" required defaultValue={quote.city} className="field w-full" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">State</label>
                <input name="state" type="text" defaultValue={quote.state} className="field w-full" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">ZIP</label>
                <input name="zip" type="text" required defaultValue={quote.zip} className="field w-full" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes (scope, terms, details)</label>
                <textarea
                  name="notes"
                  rows={8}
                  defaultValue={quote.notes ?? ""}
                  className="field min-h-[8rem] w-full resize-y font-mono text-sm leading-relaxed"
                  placeholder="Optional — templates often include terms here"
                />
              </div>
              <div className="sm:col-span-2">
                <SubmitButton pendingLabel="Saving…">Save quote details</SubmitButton>
              </div>
            </form>
            {quote.notes && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-medium text-muted-foreground">Formatted preview</p>
                <div className="mt-2 rounded-lg border border-border bg-muted/20 p-3">
                  <QuoteNotesDisplay notes={quote.notes} compact />
                </div>
              </div>
            )}
          </section>
        )}

        {quote.job_id && quote.notes && (
          <section className="border-b border-border px-4 py-3 sm:px-5 sm:py-3.5">
            <h2 className="text-sm font-semibold text-foreground">{quoteNotesSectionTitle(quote.notes)}</h2>
            {showQuoteNotesSubtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Scope and terms; line items drive dollar totals.
              </p>
            )}
            <div className="mt-2">
              <QuoteNotesDisplay notes={quote.notes} compact />
            </div>
          </section>
        )}

        {quote.job_id && !quote.notes && (
          <section className="px-4 py-6 sm:px-5 sm:py-8">
            <p className="text-sm text-muted-foreground">
              No scope notes on this quote. Schedules, photos, and field work live on the job.
            </p>
            <Link href={`/jobs/${quote.job_id}`} className="btn-primary mt-4 inline-flex">
              Open job
            </Link>
          </section>
        )}

        {!quote.job_id && (
          <section className="border-t border-border px-4 py-3 sm:px-5 sm:py-3.5">
            <p className="text-sm text-muted-foreground">
              Sales status, deposit, and convert to job live on the{" "}
              <Link href={`/admin/quotes/${id}?tab=sales`} className="link font-medium text-foreground" scroll={false}>
                Sales
              </Link>{" "}
              tab.
            </p>
          </section>
        )}
          </>
        )}

        {tab === "sales" && (
          <>
        <section className="border-b border-border px-4 py-3 sm:px-5 sm:py-3.5">
          <h2 className="text-sm font-semibold text-foreground">Sales status</h2>
          <form action={updateQuoteStatus} className="mt-2 flex flex-wrap items-end gap-2">
            <select
              name="status"
              defaultValue={quote.status}
              className="field min-w-[10rem]"
              disabled={!!quote.job_id}
            >
              {QUOTE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {!quote.job_id && (
              <button type="submit" className="btn-primary">
                Update
              </button>
            )}
          </form>
        </section>

        {!quote.job_id && !canConvertToJob && (
          <section className="border-b border-border px-4 py-3 sm:px-5 sm:py-3.5">
            <h2 className="text-sm font-semibold text-foreground">Deposit</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Optional: mark if a deposit was collected (e.g. while still an estimate). After you promote to a formal
              quote, deposit is confirmed only under Convert to job — not here.
            </p>
            <form action={updateDepositReceived} className="mt-2 flex flex-wrap items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="deposit_received"
                  value="true"
                  defaultChecked={depositReceivedFlag}
                  className="h-4 w-4 rounded border-border"
                />
                <span>Customer deposit received</span>
              </label>
              <SubmitButton variant="secondary" pendingLabel="Saving…">
                Save
              </SubmitButton>
            </form>
          </section>
        )}

        {canConvertToJob && (
          <section
            id="convert-to-job"
            className="scroll-mt-24 border-b border-border px-4 py-3 sm:px-5 sm:py-3.5"
          >
            <h2 className="text-sm font-semibold text-foreground">Convert to job</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Creates the job and invoice. Deposit status is set here when you convert (no separate deposit section for
              this quote).
            </p>
            <form action={convertQuoteToJob} className="mt-3 space-y-3">
              <input type="hidden" name="quote_id" value={quote.id} />
              <fieldset className="space-y-2">
                <legend className="sr-only">Deposit confirmation</legend>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="deposit_confirmation"
                    value="received"
                    required
                    className="mt-1"
                    defaultChecked={depositReceivedFlag}
                  />
                  <span>
                    <span className="font-medium text-foreground">Deposit received</span>
                    <span className="block text-xs text-muted-foreground">
                      Customer paid the required deposit.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="deposit_confirmation"
                    value="not_yet"
                    className="mt-1"
                    defaultChecked={!depositReceivedFlag}
                  />
                  <span>
                    <span className="font-medium text-foreground">No deposit yet</span>
                    <span className="block text-xs text-muted-foreground">
                      Leave the quote without a deposit received flag unless you switch to Deposit received.
                    </span>
                  </span>
                </label>
              </fieldset>
              <SubmitButton pendingLabel="Converting…">Create job</SubmitButton>
            </form>
          </section>
        )}
          </>
        )}

        {tab === "danger" && (
        <section className="border-t border-destructive/30 bg-destructive/5 px-4 py-3 sm:px-5 sm:py-3.5">
          <h2 className="text-sm font-semibold text-foreground">Delete</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {quote.job_id
              ? "Removes this estimate/quote and its linked job (invoice, schedule, photos). Blocked if any payment was recorded on the job."
              : "Permanently delete this estimate (or formal quote) and its line items and attachments."}
          </p>
          <form action={deleteQuoteAction} className="mt-2">
            <SubmitButton variant="danger" pendingLabel="Deleting…">
              Delete estimate
            </SubmitButton>
          </form>
        </section>
        )}

        {tab === "lines" && (
        <section className="px-4 py-3 sm:px-5 sm:py-4">
        <span className="block h-0.5 w-10 rounded-full bg-primary/80" />
        <h2 className="mt-2 text-sm font-semibold text-foreground">Line items</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Description, quantity, unit price — totals update automatically. Use 0.00 for TBD pricing.
        </p>
        <form action={addQuoteLineItem.bind(null, id)} className="mt-2 grid gap-2 sm:grid-cols-4">
          <input
            name="description"
            type="text"
            required
            placeholder="Description"
            className="field sm:col-span-2"
          />
          <input
            name="qty"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue="1"
            className="field"
          />
          <input
            name="unit_price"
            type="number"
            min="0"
            step="0.01"
            placeholder="Unit price ($)"
            className="field"
          />
          <button type="submit" className="btn-primary sm:col-span-4" disabled={!!quote.job_id}>
            Add item
          </button>
        </form>

        {items.length === 0 && (
          <p className="mt-3 text-xs text-muted-foreground">No line items yet. Add a row or start from a template when creating the estimate.</p>
        )}

        <div className="table-wrap -mx-4 mt-3 overflow-x-auto sm:mx-0">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="table-header py-2 pl-4 pr-3 sm:pl-5">Description</th>
                <th className="table-header py-2 pr-3">Qty</th>
                <th className="table-header py-2 pr-3">Unit Price</th>
                <th className="table-header py-2 pr-3">Line Total</th>
                <th className="table-header py-2 pr-4 sm:pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, itemIndex) => (
                <tr key={item.id} className="border-b border-border align-top transition hover:bg-muted/30">
                  <td className="py-2 pl-4 pr-3 sm:pl-5">
                    <span className="block">{item.description}</span>
                    {!quote.job_id && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                          Edit line
                        </summary>
                        <form action={updateQuoteLineItem.bind(null, id)} className="mt-2 grid max-w-xl gap-2 sm:grid-cols-2">
                          <input type="hidden" name="item_id" value={item.id} />
                          <label className="sm:col-span-2">
                            <span className="mb-1 block text-xs text-muted-foreground">Description</span>
                            <input
                              name="description"
                              type="text"
                              required
                              defaultValue={item.description}
                              className="field w-full"
                            />
                          </label>
                          <label>
                            <span className="mb-1 block text-xs text-muted-foreground">Qty</span>
                            <input
                              name="qty"
                              type="number"
                              min="0.01"
                              step="0.01"
                              defaultValue={String(item.qty)}
                              className="field w-full"
                            />
                          </label>
                          <label>
                            <span className="mb-1 block text-xs text-muted-foreground">Unit price ($)</span>
                            <input
                              name="unit_price"
                              type="number"
                              min="0"
                              step="0.01"
                              defaultValue={centsToDollars(item.unit_price_cents).toFixed(2)}
                              className="field w-full"
                            />
                          </label>
                          <div className="sm:col-span-2">
                            <SubmitButton variant="secondary" pendingLabel="Saving…" className="text-xs">
                              Save line
                            </SubmitButton>
                          </div>
                        </form>
                      </details>
                    )}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{item.qty}</td>
                  <td className="py-2 pr-3 tabular-nums">{formatCents(item.unit_price_cents)}</td>
                  <td className="py-2 pr-3 font-medium tabular-nums">{formatCents(item.line_total_cents)}</td>
                  <td className="py-2 pr-4 sm:pr-5">
                    {!quote.job_id ? (
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <form action={moveQuoteLineItem.bind(null, id)} className="inline">
                          <input type="hidden" name="item_id" value={item.id} />
                          <input type="hidden" name="direction" value="up" />
                          <button
                            type="submit"
                            className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-40"
                            disabled={itemIndex === 0}
                            title="Move up"
                            aria-label="Move line up"
                          >
                            ↑
                          </button>
                        </form>
                        <form action={moveQuoteLineItem.bind(null, id)} className="inline">
                          <input type="hidden" name="item_id" value={item.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button
                            type="submit"
                            className="rounded border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-40"
                            disabled={itemIndex >= items.length - 1}
                            title="Move down"
                            aria-label="Move line down"
                          >
                            ↓
                          </button>
                        </form>
                        <form action={deleteQuoteLineItem.bind(null, id)} className="inline">
                          <input type="hidden" name="item_id" value={item.id} />
                          <SubmitButton variant="danger" className="text-xs" pendingLabel="Removing…">
                            Remove
                          </SubmitButton>
                        </form>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3">
          <form action={updateQuoteTax} className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-0.5 block text-xs font-medium text-muted-foreground">Tax ($)</label>
              <p className="mb-1 text-[0.65rem] text-muted-foreground">Auto 7% IN; override if needed.</p>
              <input
                type="number"
                name="tax"
                min="0"
                step="0.01"
                defaultValue={(quote.tax_cents / 100).toFixed(2)}
                className="field w-28"
                disabled={!!quote.job_id}
              />
            </div>
            {!quote.job_id && (
              <button type="submit" className="btn-primary">
                Save tax
              </button>
            )}
          </form>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Subtotal: {formatCents(quote.subtotal_cents)}</p>
            <p className="text-xs text-muted-foreground">Tax: {formatCents(quote.tax_cents)}</p>
            <p className="mt-0.5 text-base font-semibold text-foreground">
              Total: {formatCents(quote.total_cents)}
            </p>
          </div>
        </div>
        </section>
        )}

        {tab === "documents" && (
        <section className="px-4 py-3 sm:px-5 sm:py-3.5">
        <h2 className="text-sm font-semibold text-foreground">Fabricator documents</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          PDFs or scans (e.g. per fabricator). Optional vendor label.
        </p>
        <form action={uploadQuoteDocument} className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <input
            type="file"
            name="file"
            required
            disabled={!!quote.job_id}
            className="field min-w-[200px] flex-1 sm:max-w-md"
          />
          <input
            type="text"
            name="fabricator_label"
            placeholder="Fabricator name (optional)"
            disabled={!!quote.job_id}
            className="field sm:w-56"
          />
          <SubmitButton variant="secondary" disabled={!!quote.job_id}>
            Upload
          </SubmitButton>
        </form>

        <ul className="mt-2 space-y-1.5">
          {docsWithUrls.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/20 px-3 py-1.5 text-sm"
            >
              <div>
                <span className="font-medium text-foreground">{doc.file_name}</span>
                {doc.fabricator_label && (
                  <span className="ml-2 text-muted-foreground">· {doc.fabricator_label}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {doc.signed_url ? (
                  <a
                    href={doc.signed_url}
                    target="_blank"
                    rel="noreferrer"
                    className="link text-sm"
                  >
                    Open
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">Link unavailable</span>
                )}
                {!quote.job_id && (
                  <form action={deleteQuoteDocument}>
                    <input type="hidden" name="doc_id" value={doc.id} />
                    <SubmitButton variant="secondary" className="text-xs">
                      Remove
                    </SubmitButton>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
        {docsWithUrls.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">No documents yet.</p>
        )}
        </section>
        )}

        {tab === "revisions" && (
        <section
          id="quote-revisions"
          className="scroll-mt-24 px-4 py-3 sm:px-5 sm:py-3.5"
        >
          <h2 className="text-sm font-semibold text-foreground">Revision history</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Point-in-time snapshots of this quote (title, address, notes, line items, totals, and print overrides).
            Use after meaningful changes with the customer.
          </p>
          <form action={recordQuoteRevisionAction} className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <input type="hidden" name="quote_id" value={id} />
            <label className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-lg">
              <span className="text-xs font-medium text-muted-foreground">Revision message (optional)</span>
              <textarea
                name="message"
                rows={3}
                placeholder="e.g. After site visit — adjusted sink model and edge per customer request"
                className="field min-h-[4.5rem] w-full resize-y text-sm"
              />
            </label>
            <SubmitButton variant="secondary" pendingLabel="Saving…" className="shrink-0 sm:self-end">
              Save snapshot
            </SubmitButton>
          </form>
          {revisions.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">No snapshots yet.</p>
          ) : (
            <ol className="mt-4 space-y-4 border-l border-border pl-4">
              {revisions.map((r) => {
                const snap = r.snapshot as QuoteRevisionSnapshot | null | undefined;
                return (
                  <li key={r.id} className="relative text-sm">
                    <span className="absolute -left-[1.15rem] top-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden />
                    <p className="font-medium text-foreground">Revision {r.revision_number}</p>
                    {r.label && (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{r.label}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                      {r.created_by ? <> · {authorNames.get(r.created_by) ?? "Staff"}</> : null}
                    </p>
                    {snap && (
                      <details className="mt-2 rounded-lg border border-border bg-muted/15 px-3 py-2">
                        <summary className="cursor-pointer text-xs font-medium text-foreground">
                          View snapshot summary
                        </summary>
                        <dl className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                          <div>
                            <dt className="font-medium text-foreground">Title</dt>
                            <dd className="mt-0.5">{snap.title}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-foreground">Total</dt>
                            <dd className="mt-0.5 tabular-nums">{formatCents(snap.total_cents)}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-foreground">Line items</dt>
                            <dd className="mt-0.5">{snap.items?.length ?? 0}</dd>
                          </div>
                          <div>
                            <dt className="font-medium text-foreground">Status</dt>
                            <dd className="mt-0.5 capitalize">{snap.status}</dd>
                          </div>
                        </dl>
                      </details>
                    )}
                    {!quote.job_id && (
                      <form action={restoreQuoteRevisionAction} className="mt-2">
                        <input type="hidden" name="quote_id" value={id} />
                        <input type="hidden" name="revision_id" value={r.id} />
                        <p className="mb-2 text-xs text-muted-foreground">
                          Restores live title, address, notes, line items, totals, and print overrides to this point in
                          time.
                        </p>
                        <SubmitButton variant="danger" pendingLabel="Restoring…" className="text-xs">
                          Restore live to this snapshot
                        </SubmitButton>
                      </form>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
        )}
      </article>
    </div>
  );
}
