import Link from "next/link";
import { notFound } from "next/navigation";

import { SubmitButton } from "@/components/SubmitButton";
import { coerceQuoteTemplateLineItems } from "@/lib/quote-templates";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

import { deleteQuoteTemplate, updateQuoteTemplate } from "../actions";
import { ConfirmDeleteButton } from "../ConfirmDeleteButton";
import { QuoteTemplateLineItemsEditor } from "../QuoteTemplateLineItemsEditor";

export default async function EditQuoteTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClientForData();
  const { data: row, error } = await supabase
    .from("quote_templates")
    .select("id,name,description,default_title,notes_text,line_items,sort_order")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) notFound();

  const lineItems = coerceQuoteTemplateLineItems(row.line_items);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Edit template</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <Link href="/admin/quotes/templates" className="text-primary hover:underline">
            ← All templates
          </Link>
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <form action={updateQuoteTemplate} className="space-y-4">
          <input type="hidden" name="id" value={row.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
              <input
                name="name"
                type="text"
                required
                defaultValue={row.name}
                className="field w-full"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Short description</label>
              <input
                name="description"
                type="text"
                defaultValue={row.description ?? ""}
                className="field w-full"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Default title</label>
              <input
                name="default_title"
                type="text"
                defaultValue={row.default_title ?? ""}
                className="field w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Sort order</label>
              <input
                name="sort_order"
                type="number"
                defaultValue={row.sort_order ?? 0}
                className="field w-full"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Scope / notes (plain text)</label>
              <textarea
                name="notes_text"
                rows={10}
                defaultValue={row.notes_text ?? ""}
                className="field min-h-[12rem] w-full font-mono text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Starter line items</p>
              <QuoteTemplateLineItemsEditor initialLineItems={lineItems} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
            <Link href="/admin/quotes/templates" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <h2 className="text-base font-semibold text-foreground">Delete template</h2>
        <p className="mt-1 text-sm text-muted-foreground">Removes this template from the list. Existing estimates are unchanged.</p>
        <form action={deleteQuoteTemplate} className="mt-3">
          <input type="hidden" name="id" value={row.id} />
          <ConfirmDeleteButton>Delete template</ConfirmDeleteButton>
        </form>
      </section>
    </div>
  );
}
