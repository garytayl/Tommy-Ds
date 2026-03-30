"use server";

import { revalidatePath } from "next/cache";

import { autoRecordQuoteRevisionIfChanged } from "@/lib/quote-revision-auto";
import { composeNotesFromSections, formDataToNotesSections, serializeNotesSections } from "@/lib/quote-notes-sections";
import { dollarsToCents } from "@/lib/money";
import { computeTaxCents } from "@/lib/tax";
import { setToastCookie } from "@/lib/toast";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

async function quoteUnlocked(supabase: Awaited<ReturnType<typeof createSupabaseServerClientForData>>, quoteId: string) {
  const { data } = await supabase.from("quotes").select("job_id").eq("id", quoteId).maybeSingle();
  return Boolean(data && !data.job_id);
}

async function applyDefaultTaxAfterItemsChange(supabase: Awaited<ReturnType<typeof createSupabaseServerClientForData>>, quoteId: string) {
  const { data: q } = await supabase.from("quotes").select("subtotal_cents").eq("id", quoteId).single();
  if (q?.subtotal_cents != null) {
    const taxCents = computeTaxCents(q.subtotal_cents);
    await supabase.from("quotes").update({ tax_cents: taxCents }).eq("id", quoteId);
    await supabase.rpc("recompute_quote_totals", { p_quote_id: quoteId });
  }
}

export async function updateQuoteDetails(quoteId: string, formData: FormData) {
  const supabase = await createSupabaseServerClientForData();
  if (!(await quoteUnlocked(supabase, quoteId))) {
    await setToastCookie("This estimate is locked because it is linked to a job.");
    revalidatePath(`/admin/quotes/${quoteId}`);
    return;
  }

  const title = String(formData.get("title") ?? "").trim();
  const address_line1 = String(formData.get("address_line1") ?? "").trim();
  const address_line2 = String(formData.get("address_line2") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim() || "IN";
  const zip = String(formData.get("zip") ?? "").trim();
  const sections = formDataToNotesSections(formData);
  const notes = composeNotesFromSections(sections);

  if (!title || !address_line1 || !city || !zip) {
    await setToastCookie("Title, address line 1, city, and zip are required.");
    revalidatePath(`/admin/quotes/${quoteId}`);
    return;
  }

  const { error } = await supabase
    .from("quotes")
    .update({
      title,
      address_line1,
      address_line2,
      city,
      state,
      zip,
      notes,
      notes_sections: serializeNotesSections(sections),
    })
    .eq("id", quoteId);

  if (error) {
    await setToastCookie(error.message);
    revalidatePath(`/admin/quotes/${quoteId}`);
    return;
  }

  await setToastCookie("Quote details saved");
  await autoRecordQuoteRevisionIfChanged(quoteId, "Quote details updated");
  revalidatePath(`/admin/quotes/${quoteId}`);
  revalidatePath("/admin/quotes");
}

export async function addQuoteLineItem(quoteId: string, formData: FormData) {
  const supabase = await createSupabaseServerClientForData();
  if (!(await quoteUnlocked(supabase, quoteId))) {
    await setToastCookie("This estimate is locked because it is linked to a job.");
    revalidatePath(`/admin/quotes/${quoteId}`);
    return;
  }

  const description = String(formData.get("description") ?? "").trim();
  const qty = Number.parseFloat(String(formData.get("qty") ?? "1"));
  const unitPriceCents = dollarsToCents(String(formData.get("unit_price") ?? "0"));

  if (!description) {
    await setToastCookie("Add a description for the line item.");
    revalidatePath(`/admin/quotes/${quoteId}`);
    return;
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    await setToastCookie("Quantity must be greater than zero.");
    revalidatePath(`/admin/quotes/${quoteId}`);
    return;
  }
  if (!Number.isFinite(unitPriceCents) || unitPriceCents < 0) {
    await setToastCookie("Unit price must be zero or more (use 0 for TBD pricing).");
    revalidatePath(`/admin/quotes/${quoteId}`);
    return;
  }

  const lineTotalCents = Math.round(qty * unitPriceCents);

  const { data: maxRow } = await supabase
    .from("quote_items")
    .select("sort_order")
    .eq("quote_id", quoteId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSort = (maxRow?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("quote_items").insert({
    quote_id: quoteId,
    description,
    qty,
    unit_price_cents: unitPriceCents,
    line_total_cents: lineTotalCents,
    sort_order: nextSort,
  });

  if (error) {
    await setToastCookie(error.message);
    revalidatePath(`/admin/quotes/${quoteId}`);
    return;
  }

  await applyDefaultTaxAfterItemsChange(supabase, quoteId);

  await setToastCookie("Line item added");
  await autoRecordQuoteRevisionIfChanged(quoteId, "Line item added");
  revalidatePath(`/admin/quotes/${quoteId}`);
  revalidatePath("/admin/quotes");
}

export async function updateQuoteLineItem(quoteId: string, formData: FormData) {
  const supabase = await createSupabaseServerClientForData();
  if (!(await quoteUnlocked(supabase, quoteId))) {
    await setToastCookie("This estimate is locked because it is linked to a job.");
    revalidatePath(`/admin/quotes/${quoteId}`);
    return;
  }

  const itemId = String(formData.get("item_id") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const qty = Number.parseFloat(String(formData.get("qty") ?? "1"));
  const unitPriceCents = dollarsToCents(String(formData.get("unit_price") ?? "0"));

  if (!itemId || !description) {
    await setToastCookie("Description is required.");
    revalidatePath(`/admin/quotes/${quoteId}`);
    return;
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    await setToastCookie("Quantity must be greater than zero.");
    revalidatePath(`/admin/quotes/${quoteId}`);
    return;
  }
  if (!Number.isFinite(unitPriceCents) || unitPriceCents < 0) {
    await setToastCookie("Unit price must be zero or more.");
    revalidatePath(`/admin/quotes/${quoteId}`);
    return;
  }

  const lineTotalCents = Math.round(qty * unitPriceCents);

  const { error } = await supabase
    .from("quote_items")
    .update({
      description,
      qty,
      unit_price_cents: unitPriceCents,
      line_total_cents: lineTotalCents,
    })
    .eq("id", itemId)
    .eq("quote_id", quoteId);

  if (error) {
    await setToastCookie(error.message);
    revalidatePath(`/admin/quotes/${quoteId}`);
    return;
  }

  await applyDefaultTaxAfterItemsChange(supabase, quoteId);

  await setToastCookie("Line item updated");
  await autoRecordQuoteRevisionIfChanged(quoteId, "Line item updated");
  revalidatePath(`/admin/quotes/${quoteId}`);
  revalidatePath("/admin/quotes");
}

export async function deleteQuoteLineItem(quoteId: string, formData: FormData) {
  const supabase = await createSupabaseServerClientForData();
  if (!(await quoteUnlocked(supabase, quoteId))) {
    await setToastCookie("This estimate is locked because it is linked to a job.");
    revalidatePath(`/admin/quotes/${quoteId}`);
    return;
  }

  const itemId = String(formData.get("item_id") ?? "").trim();
  if (!itemId) return;

  const { error } = await supabase.from("quote_items").delete().eq("id", itemId).eq("quote_id", quoteId);

  if (error) {
    await setToastCookie(error.message);
    revalidatePath(`/admin/quotes/${quoteId}`);
    return;
  }

  await applyDefaultTaxAfterItemsChange(supabase, quoteId);

  await setToastCookie("Line item removed");
  await autoRecordQuoteRevisionIfChanged(quoteId, "Line item removed");
  revalidatePath(`/admin/quotes/${quoteId}`);
  revalidatePath("/admin/quotes");
}

export async function moveQuoteLineItem(quoteId: string, formData: FormData) {
  const supabase = await createSupabaseServerClientForData();
  if (!(await quoteUnlocked(supabase, quoteId))) {
    await setToastCookie("This estimate is locked because it is linked to a job.");
    revalidatePath(`/admin/quotes/${quoteId}`);
    return;
  }

  const itemId = String(formData.get("item_id") ?? "").trim();
  const dir = String(formData.get("direction") ?? "").trim();
  if (!itemId || (dir !== "up" && dir !== "down")) return;

  const { data: rows } = await supabase
    .from("quote_items")
    .select("id,sort_order")
    .eq("quote_id", quoteId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const list = rows ?? [];
  const idx = list.findIndex((r) => r.id === itemId);
  if (idx < 0) return;
  const swapWith = dir === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= list.length) {
    await setToastCookie("Cannot move further in that direction.");
    revalidatePath(`/admin/quotes/${quoteId}`);
    return;
  }

  const a = list[idx];
  const b = list[swapWith];
  const sa = a.sort_order ?? 0;
  const sb = b.sort_order ?? 0;

  await supabase.from("quote_items").update({ sort_order: sb }).eq("id", a.id);
  await supabase.from("quote_items").update({ sort_order: sa }).eq("id", b.id);

  await setToastCookie("Line order updated");
  await autoRecordQuoteRevisionIfChanged(quoteId, "Line items reordered");
  revalidatePath(`/admin/quotes/${quoteId}`);
}

export async function restoreQuoteFromRevision(quoteId: string, formData: FormData) {
  const revisionId = String(formData.get("revision_id") ?? "").trim();
  if (!revisionId) return;

  const supabase = await createSupabaseServerClientForData();
  const { data: rev } = await supabase
    .from("quote_revisions")
    .select("id")
    .eq("id", revisionId)
    .eq("quote_id", quoteId)
    .maybeSingle();

  if (!rev) {
    await setToastCookie("Revision not found.");
    revalidatePath(`/admin/quotes/${quoteId}`);
    return;
  }

  const { error } = await supabase.rpc("restore_quote_from_revision", { p_revision_id: revisionId });
  if (error) {
    await setToastCookie(error.message);
    revalidatePath(`/admin/quotes/${quoteId}`);
    return;
  }

  await setToastCookie("Live quote restored from snapshot. Review totals and PDF overrides.");
  revalidatePath(`/admin/quotes/${quoteId}`);
  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${quoteId}/print`);
  revalidatePath(`/admin/quotes/${quoteId}/print/edit`);
}
