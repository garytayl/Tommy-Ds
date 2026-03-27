import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns true if the job has any invoice payment rows (blocks destructive actions
 * that would remove invoice/payment history).
 */
export async function jobHasRecordedPayments(
  supabase: SupabaseClient,
  jobId: string,
): Promise<boolean> {
  const { data: invs, error: invErr } = await supabase
    .from("invoices")
    .select("id")
    .eq("job_id", jobId);
  if (invErr) return true;
  const ids = (invs ?? []).map((i: { id: string }) => i.id);
  if (ids.length === 0) return false;
  const { count, error } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .in("invoice_id", ids);
  if (error) return true;
  return (count ?? 0) > 0;
}

export type DeleteQuoteResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Deletes a quote. If it is linked to a job, deletes the job first (same as revert, but removes the quote too).
 * Blocked when the linked job has payment rows.
 */
export async function deleteQuoteAndOptionalJob(
  supabase: SupabaseClient,
  quoteId: string,
): Promise<DeleteQuoteResult> {
  const { data: row, error: qErr } = await supabase
    .from("quotes")
    .select("id,job_id")
    .eq("id", quoteId)
    .maybeSingle();
  if (qErr || !row) return { ok: false, message: "Quote not found" };
  if (row.job_id) {
    if (await jobHasRecordedPayments(supabase, row.job_id)) {
      return { ok: false, message: "Cannot delete: linked job has recorded invoice payments" };
    }
    const { error: delJobErr } = await supabase.from("jobs").delete().eq("id", row.job_id);
    if (delJobErr) return { ok: false, message: delJobErr.message };
  }
  const { error: delQ } = await supabase.from("quotes").delete().eq("id", quoteId);
  if (delQ) return { ok: false, message: delQ.message };
  return { ok: true };
}
