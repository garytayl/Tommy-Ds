import { normalizeTemplateId } from "@/lib/quote-templates";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

import { QuoteNewForm } from "./QuoteNewForm";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams?: Promise<{ customer_id?: string; template?: string }>;
}) {
  const resolvedSearch = (await searchParams) ?? {};
  const preselectCustomerId = resolvedSearch.customer_id?.trim() ?? "";
  const initialTemplateId = normalizeTemplateId(resolvedSearch.template);

  const supabase = await createSupabaseServerClientForData();
  const { data: customers } = await supabase
    .from("customers")
    .select("id,name,address_line1,address_line2,city,state,zip")
    .order("name", { ascending: true });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">New estimate</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Starts as an estimate. Choose a template to pre-fill scope and line items, or start blank. Promote to a formal
          quote when pricing is firm, then convert to a job.
        </p>
      </div>

      <QuoteNewForm
        customers={customers ?? []}
        preselectCustomerId={preselectCustomerId}
        initialTemplateId={initialTemplateId}
      />
    </div>
  );
}
