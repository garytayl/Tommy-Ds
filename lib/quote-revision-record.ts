import type { SupabaseClient } from "@supabase/supabase-js";

import { buildRevisionSnapshot, type QuoteRevisionSnapshot } from "@/lib/quote-revisions";

/** Stable string for comparing two snapshots (order of keys in items array matters). */
export function canonicalSnapshotString(s: QuoteRevisionSnapshot): string {
  return JSON.stringify(s);
}

export async function insertQuoteRevisionRecord(
  supabase: SupabaseClient,
  quoteId: string,
  label: string | null,
  createdBy: string | null,
  options?: { skipIfUnchanged?: boolean },
): Promise<{ ok: true; inserted: boolean; revisionNumber?: number } | { ok: false; message: string }> {
  const { data: q, error: qErr } = await supabase.from("quotes").select("*").eq("id", quoteId).single();
  if (qErr || !q) return { ok: false, message: "Quote not found" };

  const { data: items } = await supabase
    .from("quote_items")
    .select("*")
    .eq("quote_id", quoteId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const snapshot = buildRevisionSnapshot({
    quote: q as never,
    items: items ?? [],
  });

  if (options?.skipIfUnchanged) {
    const { data: latest } = await supabase
      .from("quote_revisions")
      .select("snapshot")
      .eq("quote_id", quoteId)
      .order("revision_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest?.snapshot) {
      try {
        const prevSnap = latest.snapshot as unknown as QuoteRevisionSnapshot;
        if (canonicalSnapshotString(prevSnap) === canonicalSnapshotString(snapshot)) {
          return { ok: true, inserted: false };
        }
      } catch {
        // insert if comparison fails
      }
    }
  }

  const { data: maxRow } = await supabase
    .from("quote_revisions")
    .select("revision_number")
    .eq("quote_id", quoteId)
    .order("revision_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const next = (maxRow?.revision_number ?? 0) + 1;

  const { error } = await supabase.from("quote_revisions").insert({
    quote_id: quoteId,
    revision_number: next,
    label: label?.trim() || null,
    snapshot: snapshot as unknown as Record<string, unknown>,
    created_by: createdBy,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true, inserted: true, revisionNumber: next };
}
