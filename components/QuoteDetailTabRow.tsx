import Link from "next/link";

import { QuoteDetailTabs, type QuoteDetailTabId } from "@/components/QuoteDetailTabs";
import { cn } from "@/lib/utils";

type Counts = { lines: number; documents: number; revisions: number };

export function QuoteDetailTabRow({
  quoteId,
  activeTab,
  counts,
}: {
  quoteId: string;
  activeTab: QuoteDetailTabId;
  counts: Counts;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <QuoteDetailTabs quoteId={quoteId} activeTab={activeTab} counts={counts} />
      </div>
      <Link
        href={`/admin/quotes/${quoteId}?tab=danger`}
        scroll={false}
        className={cn(
          "shrink-0 rounded-lg px-2 py-2 text-sm font-medium transition-colors touch-manipulation sm:py-1.5",
          activeTab === "danger"
            ? "text-destructive underline underline-offset-2"
            : "text-muted-foreground hover:text-destructive",
        )}
      >
        Delete record
      </Link>
    </div>
  );
}
