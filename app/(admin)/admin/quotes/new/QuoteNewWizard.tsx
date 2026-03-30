"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { QuoteNotesSectionFields } from "@/components/QuoteNotesSectionFields";
import { SubmitButton } from "@/components/SubmitButton";
import { formatCustomerInformationForQuoteNotes } from "@/lib/customer-quote-notes";
import { applyDefaultPricingReferenceIfEmpty, quoteNotesToSections } from "@/lib/quote-notes-sections";
import {
  BLANK_QUOTE_TEMPLATE_ID,
  findQuoteTemplateInList,
  normalizeTemplateIdInList,
  type QuoteTemplateClientOption,
} from "@/lib/quote-templates";
import { cn } from "@/lib/utils";

import { createQuoteFromForm, quickAddCustomer } from "./actions";

const STORAGE_KEY = "tommy_quote_wizard_v1";

type CustomerOption = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

type Draft = {
  step: number;
  customerId: string;
  templateId: string;
  title: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
};

const STEPS = [
  { n: 1, label: "Customer & template", short: "Start" },
  { n: 2, label: "Job site", short: "Site" },
  { n: 3, label: "Scope", short: "Scope" },
] as const;

function loadDraft(): Partial<Draft> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<Draft>;
  } catch {
    return null;
  }
}

function saveDraft(d: Draft) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
  } catch {
    /* ignore quota */
  }
}

export function QuoteNewWizard({
  customers,
  preselectCustomerId,
  initialTemplateId,
  templateOptions,
  initialWizardStep,
}: {
  customers: CustomerOption[];
  preselectCustomerId: string;
  initialTemplateId: string;
  templateOptions: QuoteTemplateClientOption[];
  /** When set (e.g. after quick-add), jump to this step and skip draft step restore. */
  initialWizardStep: number | null;
}) {
  const [step, setStep] = useState(() => initialWizardStep ?? 1);

  const [customerId, setCustomerId] = useState(preselectCustomerId);
  const [templateId, setTemplateId] = useState(() =>
    normalizeTemplateIdInList(initialTemplateId, templateOptions),
  );
  const [title, setTitle] = useState("");
  const [address_line1, setAddressLine1] = useState("");
  const [address_line2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("IN");
  const [zip, setZip] = useState("");

  const [hydratedFromStorage, setHydratedFromStorage] = useState(false);

  useEffect(() => {
    if (initialWizardStep != null) {
      setStep(initialWizardStep);
      setCustomerId(preselectCustomerId);
      setTemplateId(normalizeTemplateIdInList(initialTemplateId, templateOptions));
      const draft = loadDraft();
      if (draft?.title != null) setTitle(draft.title);
      if (draft?.address_line1 != null) setAddressLine1(draft.address_line1);
      if (draft?.address_line2 != null) setAddressLine2(draft.address_line2);
      if (draft?.city != null) setCity(draft.city);
      if (draft?.state != null) setState(draft.state);
      if (draft?.zip != null) setZip(draft.zip);
      setHydratedFromStorage(true);
      return;
    }

    const draft = loadDraft();
    if (draft) {
      if (draft.customerId) setCustomerId(draft.customerId);
      if (draft.templateId) setTemplateId(normalizeTemplateIdInList(draft.templateId, templateOptions));
      if (draft.title != null) setTitle(draft.title);
      if (draft.address_line1 != null) setAddressLine1(draft.address_line1);
      if (draft.address_line2 != null) setAddressLine2(draft.address_line2);
      if (draft.city != null) setCity(draft.city);
      if (draft.state != null) setState(draft.state);
      if (draft.zip != null) setZip(draft.zip);
      if (typeof draft.step === "number" && draft.step >= 1 && draft.step <= 4) {
        const legacyToNew: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 3 };
        setStep(legacyToNew[draft.step] ?? 1);
      }
    }
    setHydratedFromStorage(true);
  }, [initialWizardStep, preselectCustomerId, initialTemplateId, templateOptions]);

  const template = findQuoteTemplateInList(templateId, templateOptions)!;
  const sectionDefaults = useMemo(() => {
    const t = findQuoteTemplateInList(templateId, templateOptions)!;
    let merged =
      templateId === BLANK_QUOTE_TEMPLATE_ID ? quoteNotesToSections("") : quoteNotesToSections(t.defaultNotes);
    const c = customers.find((x) => x.id === customerId);
    if (c) {
      const customerBlock = formatCustomerInformationForQuoteNotes(c);
      if (customerBlock.trim()) {
        merged = { ...merged, customer_information: customerBlock };
      }
    }
    return applyDefaultPricingReferenceIfEmpty(merged);
  }, [templateId, templateOptions, customerId, customers]);

  const persist = useCallback(() => {
    saveDraft({
      step,
      customerId,
      templateId,
      title,
      address_line1,
      address_line2,
      city,
      state,
      zip,
    });
  }, [step, customerId, templateId, title, address_line1, address_line2, city, state, zip]);

  useEffect(() => {
    if (!hydratedFromStorage) return;
    persist();
  }, [hydratedFromStorage, persist]);

  const copyCustomerAddress = () => {
    const c = customers.find((x) => x.id === customerId);
    if (!c) return;
    setAddressLine1(c.address_line1 ?? "");
    setAddressLine2(c.address_line2 ?? "");
    setCity(c.city ?? "");
    setState(c.state ?? "IN");
    setZip(c.zip ?? "");
  };

  const canGoNext =
    step === 1
      ? Boolean(customerId)
      : step === 2
        ? Boolean(
            title.trim() &&
              address_line1.trim() &&
              city.trim() &&
              state.trim() &&
              zip.trim(),
          )
        : true;

  const clearWizard = () => {
    localStorage.removeItem(STORAGE_KEY);
    setStep(1);
    setCustomerId(preselectCustomerId);
    setTemplateId(normalizeTemplateIdInList(initialTemplateId, templateOptions));
    setTitle("");
    setAddressLine1("");
    setAddressLine2("");
    setCity("");
    setState("IN");
    setZip("");
  };

  const standardFormHref = useMemo(() => {
    const p = new URLSearchParams();
    if (customerId) p.set("customer_id", customerId);
    if (templateId) p.set("template", templateId);
    const q = p.toString();
    return q ? `/admin/quotes/new/form?${q}` : "/admin/quotes/new/form";
  }, [customerId, templateId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ol className="flex flex-wrap items-center gap-1.5 sm:gap-2" aria-label="Steps">
          {STEPS.map((s) => {
            const active = step === s.n;
            const done = step > s.n;
            return (
              <li key={s.n} className="flex items-center gap-1.5 sm:gap-2">
                {s.n > 1 && (
                  <span className="text-muted-foreground/50" aria-hidden>
                    /
                  </span>
                )}
                <button
                  type="button"
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium transition-colors sm:px-3",
                    active && "bg-primary text-primary-foreground shadow-sm",
                    done && !active && "bg-muted text-muted-foreground hover:bg-muted/80",
                    !active && !done && "bg-muted/40 text-muted-foreground",
                  )}
                  onClick={() => {
                    if (s.n <= step) setStep(s.n);
                  }}
                  aria-current={active ? "step" : undefined}
                >
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.short}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={standardFormHref} className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Single-page form
          </Link>
          <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={clearWizard}>
            Start over
          </button>
        </div>
      </div>

      <section
        className={cn(
          "rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8",
          "animate-fade-in",
        )}
        key={step}
      >
        {step === 1 && (
          <div className="space-y-6">
            <header>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Step 1</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">Customer &amp; starting template</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose who the estimate is for, then pick a template to pre-fill line items and notes (including blank and any
                custom templates from{" "}
                <Link href="/admin/quotes/templates" className="font-medium text-primary underline-offset-4 hover:underline">
                  Templates
                </Link>
                ).
              </p>
            </header>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="wizard-customer-id">
                Customer
              </label>
              <select
                id="wizard-customer-id"
                className="field w-full max-w-xl"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
              >
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-xs font-medium text-foreground">Quick add customer</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Name required; phone and email optional. You&apos;ll return here with them selected so you can choose a
                template and continue.
              </p>
              <form action={quickAddCustomer} className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                <input type="hidden" name="template_id" value={templateId} />
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Customer name"
                  className="field min-w-[10rem] flex-1 sm:max-w-xs"
                  autoComplete="organization"
                />
                <input name="phone" type="text" placeholder="Phone" className="field min-w-[8rem] sm:w-40" autoComplete="tel" />
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

            <Link href="/admin/customers#add" className="inline-block text-sm text-primary hover:underline">
              Open full customer form
            </Link>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">Starting template</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {templateOptions.map((t) => {
                  const selected = templateId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        const next = normalizeTemplateIdInList(t.id, templateOptions);
                        if (next === templateId) return;
                        setTemplateId(next);
                        const nt = findQuoteTemplateInList(next, templateOptions)!;
                        setTitle(next === BLANK_QUOTE_TEMPLATE_ID ? "" : nt.defaultTitle);
                      }}
                      className={cn(
                        "rounded-xl border-2 p-4 text-left transition-all",
                        selected
                          ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                          : "border-border bg-card hover:border-primary/40 hover:bg-muted/30",
                      )}
                    >
                      <p className="font-semibold text-foreground">{t.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                className="btn-primary"
                disabled={!customerId}
                onClick={() => {
                  setTitle((prev) => {
                    if (prev.trim()) return prev;
                    const nt = findQuoteTemplateInList(templateId, templateOptions)!;
                    return templateId === BLANK_QUOTE_TEMPLATE_ID ? "" : nt.defaultTitle;
                  });
                  setStep(2);
                }}
              >
                Continue
              </button>
              <Link href="/admin/quotes" className="btn-secondary">
                Back to estimates
              </Link>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <header>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Step 2</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">Title &amp; job site</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Where the work happens (can differ from the customer&apos;s billing address).
              </p>
            </header>

            <div className="grid max-w-xl gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="wizard-title">
                  Title / description
                </label>
                <input
                  id="wizard-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Garage door install - 123 Main St"
                  className="field w-full"
                  required
                />
              </div>
              <div className="flex flex-wrap items-end justify-between gap-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Project / service address</label>
                <button type="button" className="btn-secondary text-sm" onClick={copyCustomerAddress}>
                  Use customer address
                </button>
              </div>
              <input
                type="text"
                value={address_line1}
                onChange={(e) => setAddressLine1(e.target.value)}
                required
                placeholder="Address line 1"
                className="field w-full"
              />
              <input
                type="text"
                value={address_line2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Address line 2"
                className="field w-full"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  placeholder="City"
                  className="field"
                />
                <input type="text" value={state} onChange={(e) => setState(e.target.value)} className="field" />
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  required
                  placeholder="Zip"
                  className="field sm:col-span-2"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button type="button" className="btn-primary" disabled={!canGoNext} onClick={() => setStep(3)}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <header>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Step 3</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">Scope &amp; create</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Fine-tune PDF sections, then create the estimate. Line items from <strong className="font-medium text-foreground">{template.name}</strong> are applied automatically.
              </p>
            </header>

            <form
              action={createQuoteFromForm}
              className="space-y-6"
              onSubmit={() => {
                try {
                  localStorage.removeItem(STORAGE_KEY);
                } catch {
                  /* ignore */
                }
              }}
            >
              <input type="hidden" name="customer_id" value={customerId} />
              <input type="hidden" name="template_id" value={templateId} />
              <input type="hidden" name="title" value={title.trim()} />
              <input type="hidden" name="address_line1" value={address_line1.trim()} />
              <input type="hidden" name="address_line2" value={address_line2.trim()} />
              <input type="hidden" name="city" value={city.trim()} />
              <input type="hidden" name="state" value={state.trim() || "IN"} />
              <input type="hidden" name="zip" value={zip.trim()} />

              <div className="rounded-lg border border-dashed border-border bg-muted/10 px-3 py-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Customer:</span>{" "}
                {customers.find((c) => c.id === customerId)?.name ?? "—"}
                <br />
                <span className="font-medium text-foreground">Job site:</span> {address_line1}
                {address_line2 ? `, ${address_line2}` : ""}, {city} {state} {zip}
              </div>

              <QuoteNotesSectionFields
                key={`${templateId}-${customerId}`}
                defaults={sectionDefaults}
                variant="new"
              />

              <div className="flex flex-wrap gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setStep(2)}>
                  Back
                </button>
                <SubmitButton pendingLabel="Creating…" disabled={!customerId}>
                  Create estimate
                </SubmitButton>
              </div>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
