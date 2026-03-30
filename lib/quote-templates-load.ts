import type { SupabaseClient } from "@supabase/supabase-js";

import {
  dbRowToDefinition,
  getQuoteTemplate,
  isUuidString,
  mergeQuoteTemplateDefinitions,
  type QuoteTemplateDbRow,
  type QuoteTemplateDefinition,
} from "@/lib/quote-templates";

export async function fetchMergedQuoteTemplateDefinitions(
  supabase: SupabaseClient,
): Promise<QuoteTemplateDefinition[]> {
  const { data, error } = await supabase
    .from("quote_templates")
    .select("id,name,description,default_title,notes_text,line_items,sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("quote_templates fetch:", error.message);
    return mergeQuoteTemplateDefinitions([]);
  }

  return mergeQuoteTemplateDefinitions((data ?? []) as QuoteTemplateDbRow[]);
}

/** Resolve a template for creating a quote (built-in or DB row). */
export async function resolveQuoteTemplateForCreate(
  supabase: SupabaseClient,
  templateId: string,
): Promise<QuoteTemplateDefinition | null> {
  const builtIn = getQuoteTemplate(templateId);
  if (builtIn) return builtIn;
  if (!isUuidString(templateId)) return null;
  const { data, error } = await supabase
    .from("quote_templates")
    .select("id,name,description,default_title,notes_text,line_items,sort_order")
    .eq("id", templateId)
    .maybeSingle();

  if (error || !data) return null;
  return dbRowToDefinition(data as QuoteTemplateDbRow);
}
