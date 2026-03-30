import type { QuoteNotesSections } from "@/lib/quote-notes-sections";
import { FORM_PREFIX, QUOTE_NOTES_SECTION_PLACEHOLDERS } from "@/lib/quote-notes-sections";
import { cn } from "@/lib/utils";

const field = (
  name: keyof QuoteNotesSections,
  label: string,
  hint: string,
  rows: number,
  defaults: QuoteNotesSections,
  placeholder: string,
) => (
  <div className="rounded-lg border border-border bg-card px-3 py-3 shadow-sm">
    <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor={`${FORM_PREFIX}${name}`}>
      {label}
    </label>
    <p className="mb-1.5 text-[0.65rem] leading-relaxed text-muted-foreground">{hint}</p>
    <textarea
      id={`${FORM_PREFIX}${name}`}
      name={`${FORM_PREFIX}${name}`}
      rows={rows}
      defaultValue={defaults[name]}
      placeholder={placeholder}
      className="field min-h-[4.5rem] w-full resize-y font-mono text-sm leading-relaxed placeholder:text-muted-foreground/70"
      spellCheck={false}
    />
  </div>
);

export function QuoteNotesSectionFields({
  defaults,
  variant = "detail",
}: {
  defaults: QuoteNotesSections;
  /** detail: full labels; new: slightly tighter copy for create-estimate flow */
  variant?: "detail" | "new";
}) {
  const tight = variant === "new";

  return (
    <div className={cn("space-y-3", !tight && "sm:space-y-4")}>
      <div>
        <h3 className="text-xs font-semibold tracking-tight text-foreground">Scope & terms</h3>
        <p className="mt-1 text-[0.65rem] leading-relaxed text-muted-foreground">
          {tight
            ? "Each block becomes a section in the PDF preview. Leave a block empty to skip it."
            : "Each field maps to one section in the formatted preview and PDF. Leave a field empty to omit that section."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {field(
          "cover",
          "Cover",
          tight
            ? "Title line and date (optional quote # on the COUNTERTOP line)."
            : "First lines after COUNTERTOP ESTIMATE — e.g. date and quote number. You can start with COUNTERTOP ESTIMATE (Quote #1) or leave that to the system.",
          tight ? 5 : 6,
          defaults,
          QUOTE_NOTES_SECTION_PLACEHOLDERS.cover,
        )}
        {field(
          "customer_information",
          "Customer information",
          "Name, address, phone — lines under CUSTOMER INFORMATION.",
          tight ? 4 : 5,
          defaults,
          QUOTE_NOTES_SECTION_PLACEHOLDERS.customer_information,
        )}
        {field(
          "project_details",
          "Project details",
          "Materials, edge, backsplash, sink, installation notes under PROJECT DETAILS.",
          tight ? 5 : 6,
          defaults,
          QUOTE_NOTES_SECTION_PLACEHOLDERS.project_details,
        )}
        {field(
          "pricing",
          "Pricing (reference)",
          "Reference subtotal/tax/total; line items still control system totals.",
          tight ? 4 : 5,
          defaults,
          QUOTE_NOTES_SECTION_PLACEHOLDERS.pricing,
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {field(
          "scope_notes",
          "Scope notes",
          "Fabricator limits, measurement caveats, what is included or excluded.",
          tight ? 5 : 6,
          defaults,
          QUOTE_NOTES_SECTION_PLACEHOLDERS.scope_notes,
        )}
        {field(
          "key_terms",
          "Key terms / conditions",
          "Validity, deposit, exclusions, plumbing, template rules.",
          tight ? 6 : 8,
          defaults,
          QUOTE_NOTES_SECTION_PLACEHOLDERS.key_terms,
        )}
      </div>

      <div className="rounded-lg border border-dashed border-border bg-muted/15 px-3 py-3">
        <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor={`${FORM_PREFIX}misc`}>
          Other / unstructured
        </label>
        <p className="mb-1.5 text-[0.65rem] leading-relaxed text-muted-foreground">
          Extra text appended after the sections above (legacy DETAILS & NOTES, cover letters, etc.).
        </p>
        <textarea
          id={`${FORM_PREFIX}misc`}
          name={`${FORM_PREFIX}misc`}
          rows={tight ? 3 : 4}
          defaultValue={defaults.misc}
          placeholder={QUOTE_NOTES_SECTION_PLACEHOLDERS.misc}
          className="field min-h-[3rem] w-full resize-y font-mono text-sm leading-relaxed placeholder:text-muted-foreground/70"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
