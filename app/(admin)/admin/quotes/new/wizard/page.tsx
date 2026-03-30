import Link from "next/link";

import { normalizeTemplateIdInList, toQuoteTemplateClientOptions } from "@/lib/quote-templates";
import { fetchMergedQuoteTemplateDefinitions } from "@/lib/quote-templates-load";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { QuoteNewWizard } from "../QuoteNewWizard";

export default async function NewQuoteWizardPage({
  searchParams,
}: {
  searchParams?: Promise<{ customer_id?: string; template?: string; wstep?: string }>;
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

  const wstepRaw = resolvedSearch.wstep?.trim() ?? "";
  const initialWizardStep =
    wstepRaw && /^[1-4]$/.test(wstepRaw) ? Number.parseInt(wstepRaw, 10) : null;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">New estimate — guided</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Walk through customer, template, job site, and scope in a few focused screens. Prefer the full form? Switch
          anytime—both flows create the same estimate.
        </p>
        <p className="mt-3">
          <Link href="/admin/quotes/new" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Use standard form instead
          </Link>
        </p>
      </div>

      <QuoteNewWizard
        customers={customers ?? []}
        preselectCustomerId={preselectCustomerId}
        initialTemplateId={initialTemplateId}
        templateOptions={templateOptions}
        initialWizardStep={initialWizardStep}
      />
    </div>
  );
}
