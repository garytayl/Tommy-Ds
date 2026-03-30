"use server";

import { revalidatePath } from "next/cache";

import { autoRecordQuoteRevisionIfChanged } from "@/lib/quote-revision-auto";
import type { QuotePrintOverrides } from "@/lib/quote-print-overrides";
import { insertQuoteRevisionRecord } from "@/lib/quote-revision-record";
import { createSupabaseServerClient, createSupabaseServerClientForData } from "@/lib/supabase/server";

export async function saveQuotePrintOverrides(quoteId: string, overrides: QuotePrintOverrides | null) {
  const supabase = await createSupabaseServerClientForData();
  const { error } = await supabase.from("quotes").update({ print_overrides: overrides }).eq("id", quoteId);
  if (error) return { ok: false as const, message: error.message };
  await autoRecordQuoteRevisionIfChanged(quoteId, "Print overrides updated");
  revalidatePath(`/admin/quotes/${quoteId}`);
  revalidatePath(`/admin/quotes/${quoteId}/print`);
  revalidatePath(`/admin/quotes/${quoteId}/print/edit`);
  return { ok: true as const };
}

export async function clearQuotePrintOverrides(quoteId: string) {
  return saveQuotePrintOverrides(quoteId, null);
}

export async function recordQuoteRevision(quoteId: string, label: string | null) {
  const supabaseData = await createSupabaseServerClientForData();
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const res = await insertQuoteRevisionRecord(supabaseData, quoteId, label, user?.id ?? null, {
    skipIfUnchanged: false,
  });
  if (!res.ok) return { ok: false as const, message: res.message };
  revalidatePath(`/admin/quotes/${quoteId}`);
  return { ok: true as const };
}
