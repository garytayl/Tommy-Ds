import type { ReactNode } from "react";

import { parseStructuredQuoteNotes } from "@/lib/quote-notes-parse";
import { cn } from "@/lib/utils";

type NotesVariant = "default" | "print";

function SectionBody({ lines, variant }: { lines: string[]; variant: NotesVariant }) {
  const isPrint = variant === "print";
  const segments: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
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
            isPrint ? "border-[#8b2942]/55" : "border-[oklch(0.78_0.14_70)]",
          )}
        >
          {items.map((t, j) => (
            <li
              key={j}
              className={cn("text-sm leading-relaxed", isPrint ? "text-zinc-800" : "text-foreground")}
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
          className="flex flex-col gap-1 sm:flex-row sm:gap-5 sm:items-baseline"
        >
          <span
            className={cn(
              "shrink-0 text-[0.7rem] font-semibold uppercase tracking-[0.14em] sm:w-40",
              isPrint ? "text-zinc-500" : "text-muted-foreground",
            )}
          >
            {key}
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 text-sm leading-relaxed whitespace-pre-wrap",
              isPrint ? "text-zinc-800" : "text-foreground",
            )}
          >
            {val || "—"}
          </span>
        </div>,
      );
      continue;
    }

    segments.push(
      <p key={`p-${i}`} className={cn("text-sm leading-relaxed", isPrint ? "text-zinc-800" : "text-foreground")}>
        {line}
      </p>,
    );
    i++;
  }

  return <div className="space-y-3">{segments}</div>;
}

export function QuoteNotesDisplay({ notes, variant = "default" }: { notes: string; variant?: NotesVariant }) {
  const parsed = parseStructuredQuoteNotes(notes);
  const isPrint = variant === "print";

  if (!parsed) {
    return (
      <div
        className={cn(
          "rounded-xl border p-5 shadow-inner",
          isPrint ? "border-zinc-200 bg-zinc-50" : "border-border bg-muted/25",
        )}
      >
        <p
          className={cn(
            "whitespace-pre-wrap text-sm leading-relaxed",
            isPrint ? "text-zinc-800" : "text-foreground/95",
          )}
        >
          {notes}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {parsed.map((block, idx) => {
        if (block.kind === "plaintext") {
          return (
            <div
              key={`plain-${idx}`}
              className={cn(
                "rounded-xl border p-4 text-sm leading-relaxed whitespace-pre-wrap",
                isPrint
                  ? "border-zinc-200 bg-zinc-50/90 text-zinc-800"
                  : "border-border bg-muted/20 text-foreground/95",
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
                  : "border-primary/35 bg-gradient-to-br from-primary/20 via-card to-card",
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl",
                  isPrint ? "bg-[#8b2942]/10" : "bg-[oklch(0.78_0.14_70)]/15",
                )}
                aria-hidden
              />
              <h3
                className={cn(
                  "relative text-xl font-bold tracking-tight",
                  isPrint ? "text-zinc-900" : "text-foreground",
                )}
              >
                {block.title}
              </h3>
              {block.bodyLines.length > 0 && (
                <div
                  className={cn(
                    "relative mt-4 border-t pt-4",
                    isPrint ? "border-zinc-200" : "border-border/60",
                  )}
                >
                  <SectionBody lines={block.bodyLines} variant={variant} />
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
              isPrint ? "border-zinc-200 bg-zinc-50/90" : "border-border bg-muted/15",
            )}
          >
            <h4
              className={cn(
                "border-b pb-2 text-[0.7rem] font-bold uppercase tracking-[0.2em]",
                isPrint ? "border-zinc-200 text-[#8b2942]" : "border-border/60 text-[oklch(0.78_0.14_70)]",
              )}
            >
              {block.title}
            </h4>
            <div className="mt-4">
              <SectionBody lines={block.bodyLines} variant={variant} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function quoteNotesSectionTitle(notes: string): string {
  const parsed = parseStructuredQuoteNotes(notes);
  return parsed ? "Estimate details" : "Notes";
}
