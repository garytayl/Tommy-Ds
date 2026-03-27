import type { ReactNode } from "react";

import { parseStructuredQuoteNotes } from "@/lib/quote-notes-parse";
import { cn } from "@/lib/utils";

type NotesVariant = "default" | "print";

/** Admin view: white paper on dark shell. Print: light zinc. */
function paperText(isPrint: boolean, primary: boolean) {
  if (isPrint) return primary ? "text-zinc-900" : "text-zinc-800";
  return primary ? "text-zinc-900" : "text-zinc-800";
}

function SectionBody({
  lines,
  variant,
  sectionTitle,
  compact,
}: {
  lines: string[];
  variant: NotesVariant;
  sectionTitle: string;
  compact?: boolean;
}) {
  const isPrint = variant === "print";
  const tight = Boolean(compact);
  const keyTermsBulletBlock = /key terms/i.test(sectionTitle);
  const segments: ReactNode[] = [];
  let i = 0;
  const sectionIsKeyTermsOnly = /key terms/i.test(sectionTitle);
  let afterKeyTermsHeader = sectionIsKeyTermsOnly;
  let footerBrandRendered = false;
  let footerThanksRendered = false;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    if (/^KEY TERMS/i.test(line.trim())) {
      if (!sectionIsKeyTermsOnly) {
        segments.push(
          <h6
            key={`kt-h-${i}`}
            className={cn(
              "border-b border-zinc-200 pb-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#7A1D2B]",
              tight ? "mt-3" : "mt-5",
              isPrint && "text-[#8b2942]",
            )}
          >
            {line.trim()}
          </h6>,
        );
      }
      afterKeyTermsHeader = true;
      i++;
      continue;
    }

    if (/^CUSTOMER INFORMATION$/i.test(line.trim())) {
      segments.push(
        <h6
          key={`ci-${i}`}
          className={cn(
            "text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500",
            tight ? "mt-3" : "mt-5",
          )}
        >
          Customer information
        </h6>,
      );
      i++;
      continue;
    }

    if (/^PROJECT DETAILS$/i.test(line.trim())) {
      segments.push(
        <h6
          key={`pd-${i}`}
          className={cn(
            "text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500",
            tight ? "mt-3" : "mt-5",
          )}
        >
          Project details
        </h6>,
      );
      i++;
      continue;
    }

    if (/^PRICING\b/i.test(line.trim()) && line.trim().length < 120) {
      segments.push(
        <h6
          key={`pr-${i}`}
          className={cn(
            "text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500",
            tight ? "mt-3" : "mt-5",
          )}
        >
          {line.trim()}
        </h6>,
      );
      i++;
      continue;
    }

    if (/^COUNTERTOP ESTIMATE/i.test(line.trim())) {
      segments.push(
        <h5
          key={`subhero-${i}`}
          className={cn(
            "font-bold tracking-tight",
            tight ? "text-base" : "text-lg",
            paperText(isPrint, true),
            !isPrint && "text-[#7A1D2B]",
          )}
        >
          {line.trim()}
        </h5>,
      );
      i++;
      continue;
    }

    if (line.includes("\t")) {
      const tabLines: string[] = [];
      while (i < lines.length && lines[i].includes("\t")) {
        tabLines.push(lines[i]);
        i++;
      }
      segments.push(
        <div
          key={`tab-${i}-${segments.length}`}
          className={cn(
            "overflow-x-auto rounded-lg border p-3 font-mono text-[0.7rem] leading-snug whitespace-pre text-zinc-800 shadow-inner",
            isPrint ? "border-zinc-200 bg-white" : "border-zinc-200 bg-zinc-50",
          )}
        >
          {tabLines.join("\n")}
        </div>,
      );
      continue;
    }

    if (/^\s*[•\-\*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[•\-\*]\s/.test(lines[i])) {
        const m = lines[i].match(/^\s*[•\-\*]\s*(.+)$/);
        if (m) items.push(m[1].trim());
        i++;
      }
      segments.push(
        <ul
          key={`ul-${i}-${segments.length}`}
          className={cn(
            "list-none border-l-2",
            isPrint && keyTermsBulletBlock
              ? "columns-2 border-[#8b2942]/40 pl-3 [column-gap:0.925rem] [column-fill:_balance]"
              : cn(
                  "pl-4",
                  isPrint ? "space-y-2.5 border-[#8b2942]/55" : "space-y-2.5 border-[#7A1D2B]/50",
                ),
          )}
        >
          {items.map((t, j) => (
            <li
              key={j}
              className={cn(
                "leading-relaxed",
                isPrint && keyTermsBulletBlock && "break-inside-avoid text-[0.65rem] leading-snug",
                isPrint && !keyTermsBulletBlock && "text-xs leading-snug",
                !isPrint && "text-sm",
                paperText(isPrint, false),
              )}
            >
              {t}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    const kv = line.match(/^([^:]+):\s*(.*)$/);
    if (kv && kv[1].trim().length > 0 && kv[1].length < 55) {
      const key = kv[1].trim();
      let val = kv[2].trim();
      let next = i + 1;
      if (key.toLowerCase() === "sink" && !val) {
        const rest: string[] = [];
        while (next < lines.length) {
          const L = lines[next];
          if (/^[A-Za-z][A-Za-z\s/&]+:\s/.test(L)) break;
          rest.push(L);
          next++;
        }
        val = rest.join("\n").trim();
        i = next;
      } else {
        i++;
      }
      segments.push(
        <div
          key={`kv-${i}-${segments.length}`}
          className={cn(
            "flex flex-col sm:flex-row sm:items-baseline",
            isPrint ? "gap-1.25 sm:gap-5" : "gap-1 sm:gap-5",
          )}
        >
          <span
            className={cn(
              "shrink-0 text-[0.7rem] font-semibold uppercase tracking-[0.14em] sm:w-40",
              isPrint ? "text-zinc-500" : "text-zinc-500",
            )}
          >
            {key}
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 whitespace-pre-wrap leading-relaxed",
              isPrint ? "text-xs leading-snug" : "text-sm",
              paperText(isPrint, false),
            )}
          >
            {val || "—"}
          </span>
        </div>,
      );
      continue;
    }

    if (/^TOMMY D/i.test(line.trim())) {
      const brand = line.trim();
      if (footerBrandRendered) {
        i++;
        continue;
      }
      footerBrandRendered = true;
      afterKeyTermsHeader = false;
      segments.push(
        <p
          key={`footer-brand-${i}`}
          className={cn(
            "text-center text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-zinc-700",
            tight ? "mt-4" : "mt-6",
          )}
        >
          {brand}
        </p>,
      );
      i++;
      continue;
    }

    if (/^Thank you for your business/i.test(line.trim())) {
      const thanks = line.trim();
      if (footerThanksRendered) {
        i++;
        continue;
      }
      footerThanksRendered = true;
      segments.push(
        <p
          key={`footer-thanks-${i}`}
          className="mx-auto mt-2 max-w-md text-center text-xs leading-relaxed text-zinc-500"
        >
          {thanks}
        </p>,
      );
      i++;
      continue;
    }

    const keyTermsActive = afterKeyTermsHeader;

    if (keyTermsActive && !/^\s*[•\-\*]\s/.test(line)) {
      segments.push(
        <p
          key={`kt-line-${i}`}
          className={cn(
            "border-l-2 border-[#7A1D2B]/35 pl-3 leading-relaxed",
            isPrint ? "text-xs leading-snug" : "text-sm",
            paperText(isPrint, false),
            isPrint && "border-[#8b2942]/40",
          )}
        >
          {line.trim()}
        </p>,
      );
      i++;
      continue;
    }

    segments.push(
      <p
        key={`p-${i}`}
        className={cn(isPrint ? "text-xs leading-snug" : "text-sm leading-relaxed", paperText(isPrint, false))}
      >
        {line}
      </p>,
    );
    i++;
  }

  return (
    <div className={cn(tight ? "space-y-2" : "space-y-3", isPrint && "space-y-1.5")}>{segments}</div>
  );
}

function classifySectionTitleSafe(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (/^COUNTERTOP ESTIMATE/i.test(t)) return true;
  if (/^QUOTE$/i.test(t)) return true;
  if (/^CUSTOMER INFORMATION$/i.test(t)) return true;
  if (/^CUSTOMER$/i.test(t)) return true;
  if (/^PROJECT ADDRESS$/i.test(t)) return true;
  if (/^PROJECT DETAILS$/i.test(t)) return true;
  if (/^PRICING\b/i.test(t)) return true;
  if (/^KEY TERMS/i.test(t)) return true;
  if (/^SCOPE NOTES$/i.test(t)) return true;
  if (/^DETAILS\s*&\s*NOTES$/i.test(t)) return true;
  if (/^DETAILS\s+AND\s+NOTES$/i.test(t)) return true;
  if (/^TOMMY D/i.test(t)) return true;
  return false;
}

export function QuoteNotesDisplay({
  notes,
  variant = "default",
  compact = false,
}: {
  notes: string;
  variant?: NotesVariant;
  /** Tighter spacing when embedded in the quote detail “one page” layout. */
  compact?: boolean;
}) {
  const parsed = parseStructuredQuoteNotes(notes);
  const isPrint = variant === "print";
  const paper = !isPrint; // admin: white paper
  const tightLayout = Boolean(compact) && !isPrint;
  const sectionCompact = tightLayout || isPrint;
  const padTight = tightLayout || isPrint;

  if (!parsed) {
    return (
      <div
        className={cn(
          "rounded-xl border shadow-inner",
          padTight ? "p-3" : "p-5",
          isPrint ? "border-zinc-200 bg-zinc-50 p-2.5" : "border-zinc-200 bg-white",
        )}
      >
        <p className={cn("whitespace-pre-wrap text-zinc-800", isPrint ? "text-xs leading-snug" : "text-sm leading-relaxed")}>
          {notes}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border shadow-sm",
        padTight ? "space-y-2 p-3" : "space-y-4 p-5",
        paper && "border-zinc-200 bg-white",
        isPrint && "space-y-1.5 rounded-none border-0 p-0 shadow-none",
      )}
    >
      {parsed.map((block, idx) => {
        if (block.kind === "plaintext") {
          return (
            <div
              key={`plain-${idx}`}
              className={cn(
                "rounded-xl border text-sm leading-relaxed whitespace-pre-wrap text-zinc-800",
                padTight ? "p-3" : "p-4",
                isPrint ? "border-zinc-200 bg-zinc-50/90" : "border-zinc-200 bg-zinc-50/80",
              )}
            >
              {block.text}
            </div>
          );
        }

        if (block.kind === "hero") {
          const isQuoteCover = /^QUOTE$/i.test(block.title.trim());
          if (isQuoteCover) {
            return (
              <div
                key={`hero-quote-${idx}`}
                className={cn(
                  "rounded-xl border border-zinc-200 bg-zinc-50/80 shadow-sm",
                  padTight ? "p-3" : "p-5",
                  isPrint && "bg-zinc-50/90",
                )}
              >
                <span className="sr-only">Quote summary (cover)</span>
                {block.bodyLines.length > 0 && (
                  <SectionBody
                    lines={block.bodyLines}
                    variant={variant}
                    sectionTitle="QUOTE"
                    compact={sectionCompact}
                  />
                )}
              </div>
            );
          }
          return (
            <div
              key={`hero-${idx}`}
              className={cn(
                "relative overflow-hidden rounded-2xl border shadow-sm",
                padTight ? "p-4" : "p-6",
                isPrint
                  ? "border-zinc-200 bg-gradient-to-br from-[#f4ecef] via-white to-white p-2.5 shadow-none"
                  : "border-zinc-200 bg-gradient-to-br from-[#f4ecef]/90 via-white to-white",
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl",
                  isPrint ? "hidden" : "bg-[#7A1D2B]/12",
                )}
                aria-hidden
              />
              <h3
                className={cn(
                  "relative font-bold tracking-tight text-zinc-900",
                  padTight ? "text-lg" : "text-xl",
                  isPrint && "text-base",
                )}
              >
                {block.title}
              </h3>
              {block.bodyLines.length > 0 && (
                <div
                  className={cn(
                    "relative border-t border-zinc-200",
                    padTight ? "mt-3 pt-3" : "mt-4 pt-4",
                    isPrint && "mt-2.5 pt-2.5",
                  )}
                >
                  <SectionBody
                    lines={block.bodyLines}
                    variant={variant}
                    sectionTitle={block.title}
                    compact={sectionCompact}
                  />
                </div>
              )}
            </div>
          );
        }

        return (
          <div
            key={`sec-${idx}`}
            className={cn(
              "rounded-xl border shadow-sm",
              padTight ? "p-3" : "p-5",
              isPrint ? "border-zinc-200 bg-zinc-50/90 p-2.5 py-2.5 shadow-sm" : "border-zinc-200 bg-zinc-50/70",
            )}
          >
            <h4
              className={cn(
                "border-b border-zinc-200 pb-2 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#7A1D2B]",
                isPrint && "border-zinc-200 pb-1.5 text-[0.65rem] text-[#8b2942]",
              )}
            >
              {block.title}
            </h4>
            <div className={cn(padTight ? "mt-2" : "mt-4", isPrint && "mt-2")}>
              <SectionBody
                lines={block.bodyLines}
                variant={variant}
                sectionTitle={block.title}
                compact={sectionCompact}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function quoteNotesSectionTitle(notes: string): string {
  const parsed = parseStructuredQuoteNotes(notes);
  if (parsed) return "Estimate details";
  return "Notes";
}

/** Hide the generic subtitle under the notes heading when notes parse as structured (less repetition vs. the page title). */
export function quoteNotesShowSubtitle(notes: string): boolean {
  return parseStructuredQuoteNotes(notes) == null;
}
