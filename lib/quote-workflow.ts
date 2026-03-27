/** DB column `quotes.workflow_stage`: estimate → quote → (then job via job_id) */

export type QuoteWorkflowStage = "estimate" | "quote";

export function workflowStageLabel(stage: string | null | undefined): string {
  return stage === "quote" ? "Quote" : "Estimate";
}

export function workflowStageDescription(stage: string | null | undefined): string {
  return stage === "quote"
    ? "Formal priced proposal — ready to convert to a job when the customer says go."
    : "Initial estimate — promote to a quote when pricing is firm.";
}
