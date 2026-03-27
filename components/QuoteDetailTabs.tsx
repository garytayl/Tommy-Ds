import Link from "next/link";

import { cn } from "@/lib/utils";

const TABS = [
  { id: "details", label: "Details" },
  { id: "sales", label: "Sales" },
  { id: "lines", label: "Line items" },
  { id: "documents", label: "Documents" },
  { id: "revisions", label: "Revisions" },
  { id: "danger", label: "Delete" },
] as const;

export type QuoteDetailTabId = (typeof TABS)[number]["id"];

/** Legacy URLs used ?tab=overview — treat as Details. */
export function normalizeQuoteDetailTab(raw: string | undefined | null): QuoteDetailTabId {
  if (raw === "overview") return "details";
  if (raw && TABS.some((t) => t.id === raw)) return raw as QuoteDetailTabId;
  return "details";
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
      <ul className="flex flex-wrap gap-1 overflow-x-auto pb-0.5 sm:gap-2 sm:pb-0">
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
            <li key={t.id} className="shrink-0">
              <Link
                href={`${base}?tab=${t.id}`}
                scroll={false}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors touch-manipulation",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                  t.id === "danger" &&
                    !active &&
                    "border border-destructive/25 text-destructive hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive",
                  t.id === "danger" && active && "bg-destructive text-destructive-foreground hover:bg-destructive",
                )}
                aria-current={active ? "page" : undefined}
              >
                {t.label}
                {count != null && count > 0 && (
                  <span
                    className={cn(
                      "tabular-nums text-xs",
                      active
                        ? t.id === "danger"
                          ? "text-destructive-foreground/90"
                          : "text-primary-foreground/90"
                        : "text-muted-foreground",
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
