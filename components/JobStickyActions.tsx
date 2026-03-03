"use client";

import { useState } from "react";

type JobStickyActionsProps = {
  phone: string | null;
  mapsUrl: string;
  balanceDueCents: number;
  invoiceId: string | null;
  jobStatus: string;
  onMarkComplete?: () => Promise<void>;
};

export function JobStickyActions({
  phone,
  mapsUrl,
  balanceDueCents,
  invoiceId,
  jobStatus,
  onMarkComplete,
}: JobStickyActionsProps) {
  const [collecting, setCollecting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const canComplete = jobStatus === "in_progress" || jobStatus === "scheduled";

  async function handleCollect() {
    if (!invoiceId || balanceDueCents <= 0) return;
    setCollecting(true);
    try {
      const res = await fetch("/api/checkout/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const body = (await res.json()) as { url?: string };
      if (body?.url) window.location.assign(body.url);
    } finally {
      setCollecting(false);
    }
  }

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
      {invoiceId && balanceDueCents > 0 ? (
        <button
          type="button"
          onClick={handleCollect}
          disabled={collecting}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-primary bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary touch-manipulation disabled:opacity-50"
        >
          {collecting ? "…" : "Collect"}
        </button>
      ) : null}
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
