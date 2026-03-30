import Link from "next/link";

import { QuoteNotesSectionFields } from "@/components/QuoteNotesSectionFields";
import { SubmitButton } from "@/components/SubmitButton";
import { quoteNotesToSections } from "@/lib/quote-notes-sections";
import { coerceQuoteTemplateLineItems } from "@/lib/quote-templates";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { createQuoteTemplate } from "./actions";
import { QuoteTemplateLineItemsEditor } from "./QuoteTemplateLineItemsEditor";

export default async function QuoteTemplatesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase
    .from("quote_templates")
    .select("id,name,description,default_title,sort_order,line_items")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Estimate templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Custom templates appear alongside built-in starters on{" "}
          <Link href="/admin/quotes/new" className="text-primary hover:underline">
            New estimate
          </Link>{" "}
          (step 1 cards or the single-page form dropdown) and in{" "}
          <Link href="/admin/quotes/new/form" className="text-primary hover:underline">
            single-page form
          </Link>
          .
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">
          Pre-fill title, the same scope sections as a new estimate, and optional line items. Staff can still edit
          everything on the estimate.
        </p>
        <form action={createQuoteTemplate} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
            <input name="name" type="text" required placeholder="e.g. Bathroom vanity" className="field w-full" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Short description</label>
            <input
              name="description"
              type="text"
              placeholder="Shown under the name when picking a template"
              className="field w-full"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Default title</label>
            <input name="default_title" type="text" placeholder="Pre-filled estimate title" className="field w-full" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Sort order</label>
            <input name="sort_order" type="number" defaultValue={0} className="field w-full" />
          </div>
          <div className="sm:col-span-2">
            <QuoteNotesSectionFields defaults={quoteNotesToSections("")} variant="new" />
          </div>
          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Starter line items (optional)</p>
            <QuoteTemplateLineItemsEditor initialLineItems={[]} />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <SubmitButton pendingLabel="Creating…">Create template</SubmitButton>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="border-b border-border bg-muted/50 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-foreground">Your templates</h2>
        </div>
        <div className="table-wrap overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="table-header py-3 pl-5 pr-4 text-left">Name</th>
                <th className="table-header py-3 pr-4 text-left">Default title</th>
                <th className="table-header py-3 pr-4 text-left">Lines</th>
                <th className="table-header py-3 pr-5 text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">
                    No custom templates yet. Add one above.
                  </td>
                </tr>
              ) : (
                (rows ?? []).map((r) => {
                  const n = coerceQuoteTemplateLineItems(r.line_items).length;
                  return (
                    <tr key={r.id} className="border-b border-border transition hover:bg-muted/30">
                      <td className="py-3 pl-5 pr-4 font-medium text-foreground">{r.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{r.default_title?.trim() || "—"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{n}</td>
                      <td className="py-3 pr-5 text-right">
                        <Link href={`/admin/quotes/templates/${r.id}`} className="text-primary hover:underline">
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
