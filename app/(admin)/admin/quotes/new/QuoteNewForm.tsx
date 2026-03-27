"use client";

import Link from "next/link";
import { useState } from "react";

import {
  BLANK_QUOTE_TEMPLATE_ID,
  getQuoteTemplate,
  normalizeTemplateId,
  QUOTE_TEMPLATES,
} from "@/lib/quote-templates";

import { SubmitButton } from "@/components/SubmitButton";

import { createQuoteFromForm, quickAddCustomer } from "./actions";

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
          <div className="mt-3 rounded-lg border border-border bg-muted/25 px-3 py-3">
            <p className="text-xs font-medium text-foreground">Quick add customer</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Name required; phone and email optional. Saves and selects them here so you can continue the estimate.
            </p>
            <form action={quickAddCustomer} className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
              <input type="hidden" name="template_id" value={templateId} />
              <input
                name="name"
                type="text"
                required
                placeholder="Customer name"
                className="field min-w-[10rem] flex-1 sm:max-w-xs"
                autoComplete="organization"
              />
              <input
                name="phone"
                type="text"
                placeholder="Phone"
                className="field min-w-[8rem] sm:w-40"
                autoComplete="tel"
              />
              <input
                name="email"
                type="email"
                placeholder="Email"
                className="field min-w-[10rem] flex-1 sm:max-w-xs"
                autoComplete="email"
              />
              <SubmitButton variant="secondary" pendingLabel="Adding…" className="shrink-0">
                Add customer
              </SubmitButton>
            </form>
          </div>
          <Link href="/admin/customers#add" className="mt-2 inline-block text-sm text-primary hover:underline">
            Open full customer form
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
