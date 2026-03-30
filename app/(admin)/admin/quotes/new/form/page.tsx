import Link from "next/link";

import { normalizeTemplateIdInList, toQuoteTemplateClientOptions } from "@/lib/quote-templates";
import { fetchMergedQuoteTemplateDefinitions } from "@/lib/quote-templates-load";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { QuoteNewForm } from "../QuoteNewForm";

export default async function NewQuoteFormPage({
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
      .select("id,name,phone,email,address_line1,address_line2,city,state,zip")
      .order("name", { ascending: true }),
  ]);

  const initialTemplateId = normalizeTemplateIdInList(resolvedSearch.template, templateDefinitions);
  const templateOptions = toQuoteTemplateClientOptions(templateDefinitions);

  const wizardHref = (() => {
    const p = new URLSearchParams();
    if (preselectCustomerId) p.set("customer_id", preselectCustomerId);
    if (initialTemplateId) p.set("template", initialTemplateId);
    const q = p.toString();
    return q ? `/admin/quotes/new?${q}` : "/admin/quotes/new";
  })();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">New estimate — single-page form</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a template to pre-fill line items, or start blank—then promote to a formal quote and convert to a job when
          ready.
        </p>
        <p className="mt-3">
          <Link href={wizardHref} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Use guided setup
          </Link>
          <span className="text-sm text-muted-foreground"> — recommended for new customers and estimates.</span>
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
