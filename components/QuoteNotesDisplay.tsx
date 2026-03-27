import type { ReactNode } from "react";

import { notesLookLikeQuoteDocument, parseStructuredQuoteNotes } from "@/lib/quote-notes-parse";
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
}: {
  lines: string[];
  variant: NotesVariant;
  sectionTitle: string;
}) {
  const isPrint = variant === "print";
  const segments: ReactNode[] = [];
  let i = 0;
  const sectionIsKeyTermsOnly = /key terms/i.test(sectionTitle);
  let afterKeyTermsHeader = sectionIsKeyTermsOnly;

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
              "mt-5 border-b border-zinc-200 pb-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-[#7A1D2B]",
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
          className="mt-5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500"
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
          className="mt-5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500"
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
          className="mt-5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500"
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
            "text-lg font-bold tracking-tight",
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
            "list-none space-y-2.5 border-l-2 pl-4",
            isPrint ? "border-[#8b2942]/55" : "border-[#7A1D2B]/50",
          )}
        >
          {items.map((t, j) => (
            <li key={j} className={cn("text-sm leading-relaxed", paperText(isPrint, false))}>
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
          className="flex flex-col gap-1 sm:flex-row sm:gap-5 sm:items-baseline"
        >
          <span
            className={cn(
              "shrink-0 text-[0.7rem] font-semibold uppercase tracking-[0.14em] sm:w-40",
              isPrint ? "text-zinc-500" : "text-zinc-500",
            )}
          >
            {key}
          </span>
          <span className={cn("min-w-0 flex-1 text-sm leading-relaxed whitespace-pre-wrap", paperText(isPrint, false))}>
            {val || "—"}
          </span>
        </div>,
      );
      continue;
    }

    if (/^TOMMY D/i.test(line.trim())) {
      afterKeyTermsHeader = false;
      segments.push(
        <p
          key={`footer-brand-${i}`}
          className="mt-6 text-center text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-zinc-700"
        >
          {line.trim()}
        </p>,
      );
      i++;
      continue;
    }

    if (/^Thank you for your business/i.test(line.trim())) {
      segments.push(
        <p
          key={`footer-thanks-${i}`}
          className="mx-auto mt-2 max-w-md text-center text-xs leading-relaxed text-zinc-500"
        >
          {line.trim()}
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
            "border-l-2 border-[#7A1D2B]/35 pl-3 text-sm leading-relaxed",
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
      <p key={`p-${i}`} className={cn("text-sm leading-relaxed", paperText(isPrint, false))}>
        {line}
      </p>,
    );
    i++;
  }

  return <div className="space-y-3">{segments}</div>;
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

function displayHeroTitle(title: string): string {
  if (/^QUOTE$/i.test(title.trim())) return "Quote";
  return title;
}

export function QuoteNotesDisplay({ notes, variant = "default" }: { notes: string; variant?: NotesVariant }) {
  const parsed = parseStructuredQuoteNotes(notes);
  const isPrint = variant === "print";
  const paper = !isPrint; // admin: white paper

  if (!parsed) {
    return (
      <div
        className={cn(
          "rounded-xl border p-5 shadow-inner",
          isPrint ? "border-zinc-200 bg-zinc-50" : "border-zinc-200 bg-white",
        )}
      >
        <p className={cn("whitespace-pre-wrap text-sm leading-relaxed text-zinc-800")}>{notes}</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border p-5 shadow-sm",
        paper && "border-zinc-200 bg-white",
        isPrint && "rounded-none border-0 p-0 shadow-none",
      )}
    >
      {parsed.map((block, idx) => {
        if (block.kind === "plaintext") {
          return (
            <div
              key={`plain-${idx}`}
              className={cn(
                "rounded-xl border p-4 text-sm leading-relaxed whitespace-pre-wrap text-zinc-800",
                isPrint ? "border-zinc-200 bg-zinc-50/90" : "border-zinc-200 bg-zinc-50/80",
              )}
            >
              {block.text}
            </div>
          );
        }

        if (block.kind === "hero") {
          return (
            <div
              key={`hero-${idx}`}
              className={cn(
                "relative overflow-hidden rounded-2xl border p-6 shadow-sm",
                isPrint
                  ? "border-zinc-200 bg-gradient-to-br from-[#f4ecef] via-white to-white"
                  : "border-zinc-200 bg-gradient-to-br from-[#f4ecef]/90 via-white to-white",
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl",
                  isPrint ? "bg-[#8b2942]/10" : "bg-[#7A1D2B]/12",
                )}
                aria-hidden
              />
              <h3 className={cn("relative text-xl font-bold tracking-tight text-zinc-900")}>
                {displayHeroTitle(block.title)}
              </h3>
              {block.bodyLines.length > 0 && (
                <div className={cn("relative mt-4 border-t border-zinc-200 pt-4")}>
                  <SectionBody lines={block.bodyLines} variant={variant} sectionTitle={block.title} />
                </div>
              )}
            </div>
          );
        }

        return (
          <div
            key={`sec-${idx}`}
            className={cn(
              "rounded-xl border p-5 shadow-sm",
              isPrint ? "border-zinc-200 bg-zinc-50/90" : "border-zinc-200 bg-zinc-50/70",
            )}
          >
            <h4
              className={cn(
                "border-b border-zinc-200 pb-2 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#7A1D2B]",
                isPrint && "text-[#8b2942]",
              )}
            >
              {block.title}
            </h4>
            <div className="mt-4">
              <SectionBody lines={block.bodyLines} variant={variant} sectionTitle={block.title} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function quoteNotesSectionTitle(notes: string): string {
  if (notesLookLikeQuoteDocument(notes)) return "Quote document";
  const parsed = parseStructuredQuoteNotes(notes);
  if (parsed) return "Estimate details";
  return "Notes";
}
