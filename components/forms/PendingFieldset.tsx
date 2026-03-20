"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

type PendingFieldsetProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Disables and dims non-submit fields while the parent form is submitting.
 * Keep the submit `<FormSubmitButton>` outside this fieldset so it stays enabled for pending UI.
 */
export function PendingFieldset({ children, className }: PendingFieldsetProps) {
  const { pending } = useFormStatus();
  return (
    <fieldset
      disabled={pending}
      className={cn(
        "min-w-0 border-0 p-0 m-0 transition-opacity disabled:pointer-events-none disabled:opacity-60",
        className,
      )}
      aria-busy={pending}
    >
      {children}
    </fieldset>
  );
}
