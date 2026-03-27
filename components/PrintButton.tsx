"use client";

import { cn } from "@/lib/utils";

type PrintButtonProps = {
  className?: string;
  label?: string;
};

export function PrintButton({ className, label = "Print / Save as PDF" }: PrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={cn("btn-primary", className)}
    >
      {label}
    </button>
  );
}
