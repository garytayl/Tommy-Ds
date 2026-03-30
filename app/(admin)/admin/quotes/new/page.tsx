import { normalizeTemplateIdInList, toQuoteTemplateClientOptions } from "@/lib/quote-templates";
import { fetchMergedQuoteTemplateDefinitions } from "@/lib/quote-templates-load";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { QuoteNewForm } from "./QuoteNewForm";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams?: Promise<{ customer_id?: string; template?: string }>;
}) {
  const resolvedSearch = (await searchParams) ?? {};
  const preselectCustomerId = resolvedSearch.customer_id?.trim() ?? "";

  const supabase = await createSupabaseServerClient();
  const [templateDefinitions, { data: customers }] = await Promise.all([
    fetchMergedQuoteTemplateDefinitions(supabase),
    supabase
      .from("customers")
      .select("id,name,address_line1,address_line2,city,state,zip")
      .order("name", { ascending: true }),
  ]);

  const initialTemplateId = normalizeTemplateIdInList(resolvedSearch.template, templateDefinitions);
  const templateOptions = toQuoteTemplateClientOptions(templateDefinitions);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">New estimate</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a template to pre-fill line items, or start blank—then promote to a formal quote and convert to a job when
          ready.
        </p>
      </div>

      <QuoteNewForm
        customers={customers ?? []}
        preselectCustomerId={preselectCustomerId}
        initialTemplateId={initialTemplateId}
        templateOptions={templateOptions}
      />
    </div>
  );
}
