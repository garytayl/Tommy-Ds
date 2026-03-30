"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { BLANK_QUOTE_TEMPLATE_ID, normalizeTemplateIdInList } from "@/lib/quote-templates";
import { fetchMergedQuoteTemplateDefinitions, resolveQuoteTemplateForCreate } from "@/lib/quote-templates-load";
import {
  composeNotesFromSections,
  emptyQuoteNotesSections,
  formDataToNotesSections,
  isNotesSectionsColumnError,
  quoteNotesToSections,
  serializeNotesSections,
} from "@/lib/quote-notes-sections";
import { computeTaxCents } from "@/lib/tax";
import { getOfficeSessionOrNull, UNAUTHORIZED_TOAST } from "@/lib/server-action-guards";
import { setToastCookie } from "@/lib/toast";

/** Add a customer from the new-estimate page, then return with that customer selected. */
export async function quickAddCustomer(formData: FormData) {
  const session = await getOfficeSessionOrNull();
  if (!session) {
    await setToastCookie(UNAUTHORIZED_TOAST);
    return;
  }
  const { supabase } = session;
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const returnTo = String(formData.get("return_to") ?? "").trim();
  const merged = await fetchMergedQuoteTemplateDefinitions(supabase);
  const templateId = normalizeTemplateIdInList(String(formData.get("template_id") ?? ""), merged);

  if (!name) {
    await setToastCookie("Enter a customer name to quick add.");
    return;
  }

  const { data: row, error } = await supabase
    .from("customers")
    .insert({
      name,
      phone: phone || null,
      email: email || null,
    })
    .select("id")
    .single();

  if (error || !row) {
    await setToastCookie(error?.message ?? "Could not add customer");
    return;
  }

  await setToastCookie("Customer added");
  revalidatePath("/admin/quotes/new");
  revalidatePath("/admin/quotes/new/form");
  revalidatePath("/admin/quotes/new/wizard");
  revalidatePath("/admin/customers");

  const params = new URLSearchParams();
  params.set("customer_id", String(row.id));
  params.set("template", templateId);
  params.set("wstep", "2");
  if (returnTo === "form") {
    redirect(`/admin/quotes/new/form?${params.toString()}`);
  }
  redirect(`/admin/quotes/new?${params.toString()}`);
}

export async function createQuoteFromForm(formData: FormData) {
  const session = await getOfficeSessionOrNull();
  if (!session) {
    await setToastCookie(UNAUTHORIZED_TOAST);
    return;
  }
  const { supabase } = session;
  const customerId = String(formData.get("customer_id") ?? "").trim();
  const merged = await fetchMergedQuoteTemplateDefinitions(supabase);
  const templateId = normalizeTemplateIdInList(String(formData.get("template_id") ?? ""), merged);
  const template = await resolveQuoteTemplateForCreate(supabase, templateId);

  let title = String(formData.get("title") ?? "").trim();
  const address1 = String(formData.get("address_line1") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "IN").trim() || "IN";
  const zip = String(formData.get("zip") ?? "").trim();

  if (!customerId || !address1 || !city || !zip || !template) {
    await setToastCookie("Fill in customer, address, city, and zip.");
    return;
  }

  if (!title && templateId !== BLANK_QUOTE_TEMPLATE_ID && template.defaultTitle) {
    title = template.defaultTitle;
  }
  if (!title) {
    await setToastCookie("Add a title for this estimate.");
    return;
  }

  const sections = formDataToNotesSections(formData);
  const composed = composeNotesFromSections(sections);
  let notes: string | null = composed;
  if (!notes && templateId !== BLANK_QUOTE_TEMPLATE_ID && template.buildNotes) {
    notes = template.buildNotes();
  }
  const sectionsPayload =
    composed !== null ? sections : notes ? quoteNotesToSections(notes) : emptyQuoteNotesSections();

  const insertBase = {
    customer_id: customerId,
    title,
    address_line1: address1,
    address_line2: String(formData.get("address_line2") ?? "").trim() || null,
    city,
    state,
    zip,
    notes,
    status: "draft" as const,
    workflow_stage: "estimate" as const,
  };

  let quoteRes = await supabase
    .from("quotes")
    .insert({
      ...insertBase,
      notes_sections: serializeNotesSections(sectionsPayload),
    })
    .select("id")
    .single();

  if (quoteRes.error && isNotesSectionsColumnError(quoteRes.error)) {
    quoteRes = await supabase.from("quotes").insert(insertBase).select("id").single();
  }

  const quote = quoteRes.data;
  const quoteInsertError = quoteRes.error;

  if (quoteInsertError || !quote) {
    await setToastCookie(quoteInsertError?.message ?? "Could not create estimate");
    return;
  }

  const quoteId = quote.id as string;

  if (template.lineItems.length > 0) {
    const { error: itemsErr } = await supabase.from("quote_items").insert(
      template.lineItems.map((row, index) => ({
        quote_id: quoteId,
        description: row.description,
        qty: row.qty,
        unit_price_cents: row.unit_price_cents,
        line_total_cents: row.line_total_cents,
        sort_order: index,
      })),
    );
    if (itemsErr) {
      await supabase.from("quotes").delete().eq("id", quoteId);
      await setToastCookie(itemsErr.message);
      return;
    }

    await supabase.rpc("recompute_quote_totals", { p_quote_id: quoteId });
    const { data: row } = await supabase.from("quotes").select("subtotal_cents").eq("id", quoteId).maybeSingle();
    const sub = row?.subtotal_cents ?? 0;
    if (sub > 0) {
      await supabase
        .from("quotes")
        .update({ tax_cents: computeTaxCents(sub) })
        .eq("id", quoteId);
      await supabase.rpc("recompute_quote_totals", { p_quote_id: quoteId });
    }
  }

  await setToastCookie("Estimate created");
  revalidatePath("/admin/quotes");
  redirect(`/admin/quotes/${quoteId}`);
}
