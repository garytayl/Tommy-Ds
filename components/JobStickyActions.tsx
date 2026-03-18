"use client";

import { useState } from "react";

type JobStickyActionsProps = {
  phone: string | null;
  mapsUrl: string;
  jobStatus: string;
  onMarkComplete?: () => Promise<void>;
};

export function JobStickyActions({
  phone,
  mapsUrl,
  jobStatus,
  onMarkComplete,
}: JobStickyActionsProps) {
  const [completing, setCompleting] = useState(false);
  const canComplete = jobStatus === "in_progress" || jobStatus === "scheduled" || jobStatus === "approved";

  async function handleComplete() {
    if (!onMarkComplete) return;
    setCompleting(true);
    try {
      await onMarkComplete();
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="fixed bottom-16 left-0 right-0 z-10 flex items-center justify-center gap-2 border-t border-border bg-card/95 px-3 py-3 backdrop-blur sm:hidden safe-area-pb">
      {phone ? (
        <a
          href={`tel:${phone.replace(/\D/g, "")}`}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground touch-manipulation"
        >
          Call
        </a>
      ) : null}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground touch-manipulation"
      >
        Navigate
      </a>
      {canComplete && onMarkComplete ? (
        <button
          type="button"
          onClick={handleComplete}
          disabled={completing}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground touch-manipulation disabled:opacity-50"
        >
          {completing ? "…" : "Complete"}
        </button>
      ) : null}
    </div>
  );
}
