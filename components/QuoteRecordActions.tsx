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

  const hasWorkflowCta =
    (!jobId && workflowStage === "estimate") || canConvertToJob || Boolean(jobId);

  return (
    <div
      id="quote-actions"
      className="rounded-2xl border border-border bg-card/40 p-4 shadow-sm"
    >
      <div className="flex flex-col gap-3">
        {hasWorkflowCta && (
          <div className="flex flex-wrap items-center gap-2">
            {!jobId && workflowStage === "estimate" && (
              <form action={promoteToFormalQuote} className="inline-flex items-center">
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
        )}

        <div
          className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:gap-y-2 ${hasWorkflowCta ? "border-t border-border pt-3" : ""}`}
        >
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Export">
            <span className="text-xs font-medium text-muted-foreground">Export</span>
            <a
              href={`/admin/quotes/${quoteId}/export`}
              className="btn-secondary whitespace-nowrap"
              download
              title="Design Flex Project XML (Project.xsd) for Ponderosa / Eclipse import. Append ?format=tommyds for the simple export."
            >
              Design Flex XML
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="PDF">
            <span className="text-xs font-medium text-muted-foreground">PDF</span>
            <Link href={printEditHref} className="btn-primary whitespace-nowrap">
              Prepare
            </Link>
            <a href={printHref} target="_blank" rel="noopener noreferrer" className="btn-secondary whitespace-nowrap">
              Preview
            </a>
            {hasPrintOverrides && (
              <>
                <a
                  href={printLiveHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary whitespace-nowrap"
                  title="Ignore saved print overrides; use live quote data only"
                >
                  Live
                </a>
                <span
                  className="text-xs text-muted-foreground"
                  title="Saved print-only edits are applied on the PDF"
                >
                  Overrides on
                </span>
              </>
            )}
          </div>
          <div className="flex items-center sm:shrink-0 sm:justify-end">
            <Link href="/admin/quotes" className="btn-secondary w-full justify-center sm:w-auto">
              Back to list
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
