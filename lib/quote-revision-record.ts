import type { SupabaseClient } from "@supabase/supabase-js";

import type { QuotePrintOverrides } from "@/lib/quote-print-overrides";
import { buildRevisionSnapshot, type QuoteRevisionSnapshot } from "@/lib/quote-revisions";

/** JSON.stringify with sorted keys on every plain object; arrays keep element order. */
export function stableStringifyForCompare(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringifyForCompare).join(",")}]`;
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringifyForCompare(obj[k])}`).join(",")}}`;
}

/**
 * Coerce a snapshot from DB JSON or a live QuoteRevisionSnapshot into a consistent shape so
 * comparisons ignore missing optional keys (e.g. deposit_received), key order in print_overrides,
 * and numeric/string drift from PostgREST.
 */
export function normalizeSnapshotFromUnknown(raw: unknown): QuoteRevisionSnapshot {
  if (raw == null || typeof raw !== "object") {
    return {
      title: "",
      address_line1: "",
      address_line2: null,
      city: "",
      state: "",
      zip: "",
      status: "draft",
      notes: null,
      subtotal_cents: 0,
      tax_cents: 0,
      total_cents: 0,
      deposit_received: false,
      print_overrides: null,
      items: [],
    };
  }
  const x = raw as Record<string, unknown>;
  const items = Array.isArray(x.items) ? x.items : [];
  return {
    title: String(x.title ?? ""),
    address_line1: String(x.address_line1 ?? ""),
    address_line2: x.address_line2 != null && String(x.address_line2).trim() !== "" ? String(x.address_line2) : null,
    city: String(x.city ?? ""),
    state: String(x.state ?? ""),
    zip: String(x.zip ?? ""),
    status: String(x.status ?? ""),
    workflow_stage: x.workflow_stage != null && String(x.workflow_stage).trim() !== "" ? String(x.workflow_stage) : undefined,
    notes: x.notes != null ? String(x.notes).replace(/\r\n/g, "\n") : null,
    subtotal_cents: Number(x.subtotal_cents ?? 0),
    tax_cents: Number(x.tax_cents ?? 0),
    total_cents: Number(x.total_cents ?? 0),
    deposit_received: Boolean(x.deposit_received),
    print_overrides: (x.print_overrides ?? null) as QuotePrintOverrides | null,
    items: items.map((it) => {
      const row = it as Record<string, unknown>;
      return {
        description: String(row.description ?? ""),
        qty: Number(row.qty ?? 0),
        unit_price_cents: Number(row.unit_price_cents ?? 0),
        line_total_cents: Number(row.line_total_cents ?? 0),
      };
    }),
  };
}

function snapshotPayloadForCompare(s: QuoteRevisionSnapshot): Record<string, unknown> {
  return {
    title: s.title,
    address_line1: s.address_line1,
    address_line2: s.address_line2,
    city: s.city,
    state: s.state,
    zip: s.zip,
    status: s.status,
    workflow_stage: s.workflow_stage ?? null,
    notes: s.notes ?? null,
    subtotal_cents: s.subtotal_cents,
    tax_cents: s.tax_cents,
    total_cents: s.total_cents,
    deposit_received: Boolean(s.deposit_received),
    print_overrides: s.print_overrides ?? null,
    items: s.items.map((i) => ({
      description: i.description,
      qty: Number(i.qty),
      unit_price_cents: i.unit_price_cents,
      line_total_cents: i.line_total_cents,
    })),
  };
}

/** Stable fingerprint for comparing two snapshots (live vs stored revision). */
export function canonicalSnapshotString(s: QuoteRevisionSnapshot | unknown): string {
  const n = normalizeSnapshotFromUnknown(s);
  return stableStringifyForCompare(snapshotPayloadForCompare(n));
}

/**
 * Returns the highest revision number whose snapshot equals `liveSnapshot` (revisions should be
 * ordered by `revision_number` descending). Used to show "you are on Rev N".
 */
export function findMatchingRevisionNumber(
  revisions: Array<{ revision_number: number; snapshot: unknown }>,
  liveSnapshot: QuoteRevisionSnapshot,
): number | null {
  const fp = canonicalSnapshotString(liveSnapshot);
  for (const r of revisions) {
    if (canonicalSnapshotString(r.snapshot) === fp) {
      return r.revision_number;
    }
  }
  return null;
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
