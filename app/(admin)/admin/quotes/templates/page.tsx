import Link from "next/link";

import { QuoteNotesSectionFields } from "@/components/QuoteNotesSectionFields";
import { SubmitButton } from "@/components/SubmitButton";
import { quoteNotesToSections } from "@/lib/quote-notes-sections";
import { BLANK_QUOTE_TEMPLATE_ID, coerceQuoteTemplateLineItems, QUOTE_TEMPLATES } from "@/lib/quote-templates";
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

  const builtIns = QUOTE_TEMPLATES;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Estimate templates</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Pick a starter when you create an estimate, or add your own reusable templates. Built-ins ship with the app; custom
          ones are stored in your project and appear in the new-estimate template picker alongside these.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="border-b border-border bg-muted/50 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-foreground">Built-in templates</h2>
          <p className="mt-1 text-xs text-muted-foreground">Always available — use guided setup or the single-page form.</p>
        </div>
        <div className="table-wrap overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="table-header py-3 pl-5 pr-4 text-left">Name</th>
                <th className="table-header py-3 pr-4 text-left hidden md:table-cell">Description</th>
                <th className="table-header py-3 pr-4 text-left hidden lg:table-cell">Default title</th>
                <th className="table-header py-3 pr-5 text-right">Start estimate</th>
              </tr>
            </thead>
            <tbody>
              {builtIns.map((t) => (
                <tr key={t.id} className="border-b border-border transition hover:bg-muted/30">
                  <td className="py-3 pl-5 pr-4 font-medium text-foreground">{t.name}</td>
                  <td className="py-3 pr-4 text-muted-foreground hidden md:table-cell max-w-md">
                    {t.description || "—"}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground hidden lg:table-cell">
                    {t.defaultTitle?.trim() || "—"}
                  </td>
                  <td className="py-3 pr-5 text-right whitespace-nowrap">
                    {t.id === BLANK_QUOTE_TEMPLATE_ID ? (
                      <span className="text-muted-foreground">Choose on new estimate</span>
                    ) : (
                      <span className="inline-flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                        <Link
                          href={`/admin/quotes/new?template=${encodeURIComponent(t.id)}`}
                          className="text-primary hover:underline"
                        >
                          Guided
                        </Link>
                        <span className="text-muted-foreground" aria-hidden>
                          ·
                        </span>
                        <Link
                          href={`/admin/quotes/new/form?template=${encodeURIComponent(t.id)}`}
                          className="text-primary hover:underline"
                        >
                          Form
                        </Link>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="border-b border-border bg-muted/50 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-foreground">Your templates</h2>
          <p className="mt-1 text-xs text-muted-foreground">Saved in the database — edit or delete anytime.</p>
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
                    No custom templates yet. Add one below.
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
                      <td className="py-3 pr-5 text-right whitespace-nowrap">
                        <span className="inline-flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
                          <Link
                            href={`/admin/quotes/new?template=${encodeURIComponent(r.id)}`}
                            className="text-primary hover:underline"
                          >
                            Guided
                          </Link>
                          <span className="text-muted-foreground" aria-hidden>
                            ·
                          </span>
                          <Link
                            href={`/admin/quotes/new/form?template=${encodeURIComponent(r.id)}`}
                            className="text-primary hover:underline"
                          >
                            Form
                          </Link>
                          <span className="text-muted-foreground" aria-hidden>
                            ·
                          </span>
                          <Link href={`/admin/quotes/templates/${r.id}`} className="text-primary hover:underline">
                            Edit
                          </Link>
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Create template</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pre-fill title, the same scope sections as a new estimate, and optional line items. Staff can still edit everything
          on the estimate.
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
    </div>
  );
}
