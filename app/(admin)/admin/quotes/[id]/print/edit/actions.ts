"use server";

import { revalidatePath } from "next/cache";

import { buildRevisionSnapshot } from "@/lib/quote-revisions";
import type { QuotePrintOverrides } from "@/lib/quote-print-overrides";
import { createSupabaseServerClient, createSupabaseServerClientForData } from "@/lib/supabase/server";

export async function saveQuotePrintOverrides(quoteId: string, overrides: QuotePrintOverrides | null) {
  const supabase = await createSupabaseServerClientForData();
  const { error } = await supabase.from("quotes").update({ print_overrides: overrides }).eq("id", quoteId);
  if (error) return { ok: false as const, message: error.message };
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

  const { data: q, error: qErr } = await supabaseData.from("quotes").select("*").eq("id", quoteId).single();
  if (qErr || !q) return { ok: false as const, message: "Quote not found" };

  const { data: items } = await supabaseData.from("quote_items").select("*").eq("quote_id", quoteId);

  const { data: maxRow } = await supabaseData
    .from("quote_revisions")
    .select("revision_number")
    .eq("quote_id", quoteId)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const next = (maxRow?.revision_number ?? 0) + 1;
  const snapshot = buildRevisionSnapshot({
    quote: q as never,
    items: items ?? [],
  });

  const { error } = await supabaseData.from("quote_revisions").insert({
    quote_id: quoteId,
    revision_number: next,
    label: label?.trim() || null,
    snapshot: snapshot as unknown as Record<string, unknown>,
    created_by: user?.id ?? null,
  });

  if (error) return { ok: false as const, message: error.message };
  revalidatePath(`/admin/quotes/${quoteId}`);
  return { ok: true as const };
}
