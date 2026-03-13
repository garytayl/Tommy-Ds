"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

type SubmitButtonProps = {
  children: React.ReactNode;
  className?: string;
  /** Shown while the form is submitting. Default: "Saving…" */
  pendingLabel?: string;
  /** If true, use danger style when className doesn’t imply primary. */
  variant?: "primary" | "secondary" | "danger";
};

const variantClass = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  danger: "btn-danger",
};

export function SubmitButton({
  children,
  className = "",
  pendingLabel = "Saving…",
  variant = "primary",
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const combined = [variantClass[variant], "gap-2", className].filter(Boolean).join(" ");

  return (
    <button type="submit" className={combined} disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          <span>{pendingLabel}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
