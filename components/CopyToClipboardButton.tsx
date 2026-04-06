"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type CopyToClipboardButtonProps = {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
};

export function CopyToClipboardButton({
  value,
  label = "Copy link",
  copiedLabel = "Copied",
  className,
}: CopyToClipboardButtonProps) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      className={cn("btn-secondary py-2 text-xs sm:py-1.5", className)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
