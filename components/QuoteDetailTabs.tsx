import Link from "next/link";

import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "lines", label: "Line items" },
  { id: "documents", label: "Documents" },
  { id: "revisions", label: "Revisions" },
] as const;

export type QuoteDetailTabId = (typeof TABS)[number]["id"];

export function normalizeQuoteDetailTab(raw: string | undefined | null): QuoteDetailTabId {
  if (raw && TABS.some((t) => t.id === raw)) return raw as QuoteDetailTabId;
  return "overview";
}

type Counts = { lines: number; documents: number; revisions: number };

export function QuoteDetailTabs({
  quoteId,
  activeTab,
  counts,
}: {
  quoteId: string;
  activeTab: QuoteDetailTabId;
  counts: Counts;
}) {
  const base = `/admin/quotes/${quoteId}`;

  return (
    <nav
      className="rounded-2xl border border-border bg-card/90 px-2 py-2 shadow-sm backdrop-blur-sm sm:px-3"
      aria-label="Quote sections"
    >
      <ul className="flex flex-wrap gap-1 sm:gap-2">
        {TABS.map((t) => {
          const active = activeTab === t.id;
          const count =
            t.id === "lines"
              ? counts.lines
              : t.id === "documents"
                ? counts.documents
                : t.id === "revisions"
                  ? counts.revisions
                  : null;
          return (
            <li key={t.id}>
              <Link
                href={`${base}?tab=${t.id}`}
                scroll={false}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors touch-manipulation",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                {t.label}
                {count != null && count > 0 && (
                  <span
                    className={cn(
                      "tabular-nums text-xs",
                      active ? "text-primary-foreground/90" : "text-muted-foreground",
                    )}
                  >
                    ({count})
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
