"use client";

import Link from "next/link";
import { useState } from "react";

import {
  BLANK_QUOTE_TEMPLATE_ID,
  getQuoteTemplate,
  normalizeTemplateId,
  QUOTE_TEMPLATES,
} from "@/lib/quote-templates";

import { createQuoteFromForm } from "./actions";

type CustomerOption = { id: string; name: string };

export function QuoteNewForm({
  customers,
  preselectCustomerId,
  initialTemplateId,
}: {
  customers: CustomerOption[];
  preselectCustomerId: string;
  initialTemplateId: string;
}) {
  const [templateId, setTemplateId] = useState(() => normalizeTemplateId(initialTemplateId));
  const template = getQuoteTemplate(templateId)!;

  const titleDefault = templateId === BLANK_QUOTE_TEMPLATE_ID ? "" : template.defaultTitle;
  const notesDefault = templateId === BLANK_QUOTE_TEMPLATE_ID ? "" : template.buildNotes();

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <form action={createQuoteFromForm} className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Customer</label>
          <select
            name="customer_id"
            required
            className="field w-full"
            defaultValue={preselectCustomerId || ""}
          >
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Link href="/admin/customers#add" className="mt-1 inline-block text-sm text-primary hover:underline">
            Add customer
          </Link>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Template</label>
          <input type="hidden" name="template_id" value={templateId} />
          <select
            className="field w-full"
            value={templateId}
            onChange={(e) => setTemplateId(normalizeTemplateId(e.target.value))}
            aria-label="Estimate template"
          >
            {QUOTE_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted-foreground">{template.description}</p>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Title / description</label>
          <input
            key={`title-${templateId}`}
            name="title"
            type="text"
            required
            defaultValue={titleDefault}
            placeholder="e.g. Garage door install - 123 Main St"
            className="field w-full"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Address</label>
          <input
            name="address_line1"
            type="text"
            required
            placeholder="Address line 1"
            className="field w-full"
          />
        </div>
        <input name="address_line2" type="text" placeholder="Address line 2" className="field" />
        <input name="city" type="text" required placeholder="City" className="field" />
        <input name="state" type="text" defaultValue="IN" className="field" />
        <input name="zip" type="text" required placeholder="Zip" className="field" />
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes (optional)</label>
          <textarea
            key={`notes-${templateId}`}
            name="notes"
            placeholder="Scope, terms, fabricator notes…"
            rows={templateId === BLANK_QUOTE_TEMPLATE_ID ? 2 : 14}
            defaultValue={notesDefault}
            className="field min-h-[4.5rem] w-full resize-y text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="submit" className="btn-primary">
            Create estimate
          </button>
          <Link href="/admin/quotes" className="btn-secondary">
            Back to estimates
          </Link>
        </div>
      </form>
    </section>
  );
}
