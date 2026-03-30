import Link from "next/link";

import { formatCents } from "@/lib/money";
import { workflowStageDescription, workflowStageLabel } from "@/lib/quote-workflow";

type RevisionRef = { revision_number: number } | null;

export function QuoteDetailHeader({
  quoteId,
  quoteTitle,
  customerName,
  addressSummary,
  workflowStage,
  jobId,
  latestRevision,
  liveRevisionMatch,
  revisionCount,
  status,
  totalCents,
}: {
  quoteId: string;
  quoteTitle: string;
  customerName: string | null;
  addressSummary: string;
  workflowStage: "estimate" | "quote";
  jobId: string | null;
  latestRevision: RevisionRef;
  /** Highest revision # whose snapshot matches live quote data, or null if none / no history. */
  liveRevisionMatch: number | null;
  revisionCount: number;
  status: string;
  totalCents: number;
}) {
  const stageLabel = jobId ? "Job" : workflowStageLabel(workflowStage);
  const stepLabel = jobId ? "Step 3 of 3" : workflowStage === "estimate" ? "Step 1 of 3" : "Step 2 of 3";

  return (
    <header className="space-y-4">
      <h1 className="sr-only">
        {quoteTitle}
        {customerName ? ` — ${customerName}` : ""}
      </h1>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3 sm:gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2.5 py-0.5 font-medium text-foreground">{stageLabel}</span>
          <span className="rounded-full bg-muted px-2.5 py-0.5 font-medium tabular-nums">{stepLabel}</span>
          <span className="capitalize">{status}</span>
          <span className="text-muted-foreground/80" aria-hidden>
            ·
          </span>
          <span className="font-medium tabular-nums text-foreground">{formatCents(totalCents)}</span>
          {revisionCount > 0 && liveRevisionMatch != null && (
            <span
              className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 font-semibold tabular-nums text-emerald-100 ring-1 ring-emerald-500/35"
              title="Live quote data matches this saved revision snapshot"
            >
              Live = Rev {liveRevisionMatch}
            </span>
          )}
          {revisionCount > 0 && liveRevisionMatch == null && (
            <span
              className="rounded-full bg-amber-500/12 px-2.5 py-0.5 font-medium text-amber-100 ring-1 ring-amber-500/30"
              title="Live data does not match any saved revision (unusual—try saving again or check history)"
            >
              Live ≠ any saved rev
            </span>
          )}
          {revisionCount === 0 && (
            <span className="rounded-full bg-muted/80 px-2.5 py-0.5 text-muted-foreground">No revisions yet</span>
          )}
        </div>
        <Link
          href={`/admin/quotes/${quoteId}?tab=revisions#quote-revisions`}
          scroll={false}
          className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground underline-offset-2 transition-colors hover:border-primary/40 hover:bg-muted/80 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {latestRevision ? (
            <>
              History · latest Rev {latestRevision.revision_number}
              <span className="text-muted-foreground" aria-hidden>
                →
              </span>
            </>
          ) : (
            <>
              Revisions
              <span className="text-muted-foreground" aria-hidden>
                →
              </span>
            </>
          )}
          <span className="sr-only">Open revision history</span>
        </Link>
      </div>

      <p className="text-sm text-muted-foreground">
        {customerName ?? "—"} · {addressSummary}
      </p>

      {!jobId && (
        <details className="rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground hover:underline">
            How estimates → quotes → jobs work
          </summary>
          <p className="mt-2 leading-relaxed">
            {workflowStage === "quote"
              ? workflowStageDescription("quote")
              : workflowStageDescription("estimate")}
          </p>
        </details>
      )}
    </header>
  );
}
