"use client";

import { useEffect } from "react";

type JobKind = "installation" | "service";
type PaymentTemplate =
  | "deposit"
  | "progress_payment"
  | "final_balance"
  | "service_call"
  | "parts_materials"
  | "custom";

type Props = {
  className?: string;
  descriptionInputId: string;
  amountInputId: string;
  noteInputId: string;
  paymentTypeSelectId: string;
  workTypeSelectId: string;
  defaultJobKind?: JobKind | null;
  defaultJobTitle?: string | null;
  defaultBalanceDueCents?: number | null;
  jobSelectId?: string;
  invoiceSelectId?: string;
};

type TemplateContext = {
  paymentType: PaymentTemplate;
  jobKind: JobKind;
  jobTitle: string;
  balanceDueCents: number | null;
};

function clampJobKind(value: string | null | undefined): JobKind {
  return value === "service" ? "service" : "installation";
}

function toMoneyString(cents: number): string {
  return (cents / 100).toFixed(2);
}

function suggestedAmountCents(
  paymentType: PaymentTemplate,
  jobKind: JobKind,
  balanceDueCents: number | null,
): number | null {
  const balance = balanceDueCents ?? 0;
  if (paymentType === "final_balance") return balance > 0 ? balance : null;
  if (paymentType === "deposit") {
    if (balance <= 0) return null;
    return Math.round(balance * (jobKind === "service" ? 0.5 : 0.3));
  }
  if (paymentType === "progress_payment") {
    if (balance <= 0) return null;
    return Math.round(balance * 0.5);
  }
  if (paymentType === "service_call") {
    return jobKind === "service" ? 14900 : null;
  }
  return null;
}

function buildTemplate(context: TemplateContext): {
  description: string;
  note: string;
  amountCents: number | null;
} {
  const kindLabel = context.jobKind === "service" ? "Service" : "Installation";
  const jobTitle = context.jobTitle.trim() || "Job";
  const amountCents = suggestedAmountCents(
    context.paymentType,
    context.jobKind,
    context.balanceDueCents,
  );

  if (context.paymentType === "deposit") {
    return {
      description: `${jobTitle} — ${kindLabel} deposit`,
      note:
        context.jobKind === "service"
          ? "Deposit to begin service work."
          : "Deposit to secure installation schedule.",
      amountCents,
    };
  }

  if (context.paymentType === "progress_payment") {
    return {
      description: `${jobTitle} — ${kindLabel} progress payment`,
      note: "Progress payment for ongoing work.",
      amountCents,
    };
  }

  if (context.paymentType === "final_balance") {
    return {
      description: `${jobTitle} — ${kindLabel} final balance`,
      note: "Final balance payment.",
      amountCents,
    };
  }

  if (context.paymentType === "service_call") {
    return {
      description:
        context.jobKind === "service"
          ? `${jobTitle} — Service call`
          : `${jobTitle} — Site visit / service call`,
      note: "Service-call payment.",
      amountCents,
    };
  }

  if (context.paymentType === "parts_materials") {
    return {
      description: `${jobTitle} — Parts and materials`,
      note: "Parts/materials payment.",
      amountCents,
    };
  }

  return {
    description: `${jobTitle} — Payment request`,
    note: "General payment request.",
    amountCents,
  };
}

export function PaymentTemplateAutofill({
  className,
  descriptionInputId,
  amountInputId,
  noteInputId,
  paymentTypeSelectId,
  workTypeSelectId,
  defaultJobKind = "installation",
  defaultJobTitle = "Job",
  defaultBalanceDueCents = null,
  jobSelectId,
  invoiceSelectId,
}: Props) {
  function inferContextFromDom(): TemplateContext {
    const paymentTypeSelect = document.getElementById(
      paymentTypeSelectId,
    ) as HTMLSelectElement | null;
    const workTypeSelect = document.getElementById(
      workTypeSelectId,
    ) as HTMLSelectElement | null;

    const paymentType = (paymentTypeSelect?.value ??
      "custom") as PaymentTemplate;
    let jobKind = clampJobKind(workTypeSelect?.value ?? defaultJobKind);
    let jobTitle = defaultJobTitle ?? "Job";
    let balanceDueCents = defaultBalanceDueCents;

    if (jobSelectId) {
      const jobSelect = document.getElementById(jobSelectId) as HTMLSelectElement | null;
      const selectedJob = jobSelect?.selectedOptions?.[0];
      const selectedJobKind = selectedJob?.dataset.jobKind;
      const selectedJobTitle = selectedJob?.dataset.jobTitle;
      if (selectedJobKind) {
        jobKind = clampJobKind(selectedJobKind);
        if (workTypeSelect) workTypeSelect.value = jobKind;
      }
      if (selectedJobTitle) {
        jobTitle = selectedJobTitle;
      }
    }

    if (invoiceSelectId) {
      const invoiceSelect = document.getElementById(
        invoiceSelectId,
      ) as HTMLSelectElement | null;
      const selectedInvoice = invoiceSelect?.selectedOptions?.[0];
      const invoiceBalanceText = selectedInvoice?.dataset.balanceDueCents;
      const invoiceJobKind = selectedInvoice?.dataset.jobKind;
      const invoiceJobTitle = selectedInvoice?.dataset.jobTitle;
      const invoiceBalance = Number.parseInt(invoiceBalanceText ?? "", 10);
      if (Number.isFinite(invoiceBalance) && invoiceBalance > 0) {
        balanceDueCents = invoiceBalance;
      }
      if (invoiceJobKind) {
        jobKind = clampJobKind(invoiceJobKind);
        if (workTypeSelect) workTypeSelect.value = jobKind;
      }
      if (invoiceJobTitle) {
        jobTitle = invoiceJobTitle;
      }
    }

    return {
      paymentType,
      jobKind,
      jobTitle,
      balanceDueCents,
    };
  }

  function applyTemplate(onlyIfEmpty: boolean) {
    const context = inferContextFromDom();
    const template = buildTemplate(context);

    const descriptionInput = document.getElementById(
      descriptionInputId,
    ) as HTMLInputElement | null;
    const amountInput = document.getElementById(amountInputId) as HTMLInputElement | null;
    const noteInput = document.getElementById(noteInputId) as HTMLInputElement | null;

    if (descriptionInput && (!onlyIfEmpty || !descriptionInput.value.trim())) {
      descriptionInput.value = template.description;
    }
    if (noteInput && (!onlyIfEmpty || !noteInput.value.trim())) {
      noteInput.value = template.note;
    }
    if (amountInput && template.amountCents != null) {
      if (!onlyIfEmpty || !amountInput.value.trim()) {
        amountInput.value = toMoneyString(template.amountCents);
      }
    }
  }

  useEffect(() => {
    applyTemplate(true);
    // This runs once to provide a sensible default for fresh forms.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={className}>
      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Auto-fill payment template
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <label className="block text-xs font-medium text-muted-foreground">
            Payment type
            <select
              id={paymentTypeSelectId}
              name="payment_template"
              defaultValue="final_balance"
              className="field mt-1 min-h-11"
              onChange={() => applyTemplate(false)}
            >
              <option value="deposit">Deposit</option>
              <option value="progress_payment">Progress payment</option>
              <option value="final_balance">Final balance</option>
              <option value="service_call">Service call</option>
              <option value="parts_materials">Parts / materials</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-muted-foreground">
            Work type
            <select
              id={workTypeSelectId}
              name="work_type_template"
              defaultValue={defaultJobKind ?? "installation"}
              className="field mt-1 min-h-11"
              onChange={() => applyTemplate(false)}
            >
              <option value="installation">Installation</option>
              <option value="service">Service</option>
            </select>
          </label>
          <button
            type="button"
            className="btn-secondary min-h-11 w-full sm:mt-5"
            onClick={() => applyTemplate(false)}
          >
            Use template
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Picks a preset based on work type and payment type. Edit fields before creating the link.
        </p>
      </div>
    </div>
  );
}
