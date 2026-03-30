import Link from "next/link";

import { normalizeTemplateIdInList, toQuoteTemplateClientOptions } from "@/lib/quote-templates";
import { fetchMergedQuoteTemplateDefinitions } from "@/lib/quote-templates-load";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { QuoteNewWizard } from "./QuoteNewWizard";

export default async function NewQuotePage({
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
      .select("id,name,phone,email,address_line1,address_line2,city,state,zip")
      .order("name", { ascending: true }),
  ]);

  const initialTemplateId = normalizeTemplateIdInList(resolvedSearch.template, templateDefinitions);
  const templateOptions = toQuoteTemplateClientOptions(templateDefinitions);

  const wstepRaw = resolvedSearch.wstep?.trim() ?? "";
  const initialWizardStep = (() => {
    if (!wstepRaw || !/^[1-4]$/.test(wstepRaw)) return null;
    const n = Number.parseInt(wstepRaw, 10);
    const legacyToNew: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 3 };
    return legacyToNew[n] ?? null;
  })();

  const formHref = (() => {
    const p = new URLSearchParams();
    if (preselectCustomerId) p.set("customer_id", preselectCustomerId);
    if (initialTemplateId) p.set("template", initialTemplateId);
    const q = p.toString();
    return q ? `/admin/quotes/new/form?${q}` : "/admin/quotes/new/form";
  })();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">New estimate</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Pick a customer and a starting template on step 1, then job site and scope. Prefer everything on one screen? Use the{" "}
          <Link href={formHref} className="font-medium text-primary underline-offset-4 hover:underline">
            single-page form
          </Link>
          —same result.
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
