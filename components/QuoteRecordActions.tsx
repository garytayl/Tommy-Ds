import Link from "next/link";

import { SubmitButton } from "@/components/SubmitButton";

type PromoteAction = (formData: FormData) => Promise<void>;

export function QuoteRecordActions({
  quoteId,
  jobId,
  workflowStage,
  canConvertToJob,
  hasPrintOverrides,
  promoteToFormalQuote,
}: {
  quoteId: string;
  jobId: string | null;
  workflowStage: "estimate" | "quote";
  canConvertToJob: boolean;
  hasPrintOverrides: boolean;
  promoteToFormalQuote: PromoteAction;
}) {
  const printEditHref = `/admin/quotes/${quoteId}/print/edit`;
  const printHref = `/admin/quotes/${quoteId}/print`;
  const printLiveHref = `/admin/quotes/${quoteId}/print?live=1`;

  return (
    <div
      id="quote-actions"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card/40 p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {!jobId && workflowStage === "estimate" && (
          <form action={promoteToFormalQuote}>
            <SubmitButton variant="primary" pendingLabel="Promoting…">
              Promote to formal quote
            </SubmitButton>
          </form>
        )}
        {canConvertToJob && (
          <Link href={`/admin/quotes/${quoteId}?tab=sales#convert-to-job`} scroll={false} className="btn-primary">
            Convert to job
          </Link>
        )}
        {jobId && (
          <Link href={`/jobs/${jobId}`} className="btn-primary">
            Open job
          </Link>
        )}
      </div>

      <div
        className="flex min-w-0 flex-col gap-2 sm:items-end"
        role="group"
        aria-label="PDF"
      >
        <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">PDF</span>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={printEditHref} className="btn-primary">
            Prepare
          </Link>
          <a href={printHref} target="_blank" rel="noopener noreferrer" className="btn-secondary">
            Preview
          </a>
          {hasPrintOverrides && (
            <>
              <a
                href={printLiveHref}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                title="Ignore saved print overrides; use live quote data only"
              >
                Preview live
              </a>
              <span className="text-xs text-muted-foreground" title="Saved print-only edits are applied on the PDF">
                Overrides on
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center sm:ml-auto">
        <Link href="/admin/quotes" className="btn-secondary">
          Back to list
        </Link>
      </div>
    </div>
  );
}
