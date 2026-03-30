"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { composeNotesFromSections, formDataToNotesSections } from "@/lib/quote-notes-sections";
import type { QuoteTemplateLineItem } from "@/lib/quote-templates";
import { setToastCookie } from "@/lib/toast";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

function parseLineItemsJson(raw: string): QuoteTemplateLineItem[] {
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    const out: QuoteTemplateLineItem[] = [];
    for (const row of arr) {
      if (!row || typeof row !== "object") continue;
      const o = row as Record<string, unknown>;
      const description = String(o.description ?? "").trim();
      if (!description) continue;
      const qty = Number(o.qty);
      const unit = Math.round(Number(o.unit_price_cents) || 0);
      const line = Math.round(Number(o.line_total_cents) || 0);
      out.push({
        description,
        qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
        unit_price_cents: unit,
        line_total_cents: line,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function createQuoteTemplate(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const defaultTitle = String(formData.get("default_title") ?? "").trim();
  const notesText = composeNotesFromSections(formDataToNotesSections(formData));
  const sortOrder = Math.round(Number.parseFloat(String(formData.get("sort_order") ?? "0")) || 0);
  const lineItems = parseLineItemsJson(String(formData.get("line_items_json") ?? "[]"));

  if (!name) {
    await setToastCookie("Template name is required.");
    return;
  }

  const supabase = await createSupabaseServerClientForData();
  const { error } = await supabase.from("quote_templates").insert({
    name,
    description,
    default_title: defaultTitle,
    notes_text: notesText,
    line_items: lineItems,
    sort_order: sortOrder,
  });

  if (error) {
    await setToastCookie(error.message);
    return;
  }

  await setToastCookie("Template created");
  revalidatePath("/admin/quotes/templates");
  revalidatePath("/admin/quotes/new");
  redirect("/admin/quotes/templates");
}

export async function updateQuoteTemplate(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const defaultTitle = String(formData.get("default_title") ?? "").trim();
  const notesText = composeNotesFromSections(formDataToNotesSections(formData));
  const sortOrder = Math.round(Number.parseFloat(String(formData.get("sort_order") ?? "0")) || 0);
  const lineItems = parseLineItemsJson(String(formData.get("line_items_json") ?? "[]"));

  if (!id || !name) {
    await setToastCookie("Name is required.");
    return;
  }

  const supabase = await createSupabaseServerClientForData();
  const { error } = await supabase
    .from("quote_templates")
    .update({
      name,
      description,
      default_title: defaultTitle,
      notes_text: notesText,
      line_items: lineItems,
      sort_order: sortOrder,
    })
    .eq("id", id);

  if (error) {
    await setToastCookie(error.message);
    return;
  }

  await setToastCookie("Template saved");
  revalidatePath("/admin/quotes/templates");
  revalidatePath("/admin/quotes/new");
  redirect("/admin/quotes/templates");
}

export async function deleteQuoteTemplate(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const supabase = await createSupabaseServerClientForData();
  const { error } = await supabase.from("quote_templates").delete().eq("id", id);

  if (error) {
    await setToastCookie(error.message);
    return;
  }

  await setToastCookie("Template deleted");
  revalidatePath("/admin/quotes/templates");
  revalidatePath("/admin/quotes/new");
  redirect("/admin/quotes/templates");
}
