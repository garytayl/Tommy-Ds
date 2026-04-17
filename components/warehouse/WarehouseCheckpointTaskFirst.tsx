"use client";

import { useEffect, useMemo, useState } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  fetchCustomerPullSupplies,
  isLikelyCustomerId,
  type CustomerPullGroup,
} from "@/lib/warehouse-customer-pulls";
import { formatCellQuery, parseCellQuery } from "@/lib/warehouse-checkpoint";

type Props = {
  supabase: SupabaseClient;
  /** Human zone label from URL (?title=) */
  titleParam: string | null;
  /** Customer UUID from URL (?customer=) */
  customerParam: string | null;
  cellParam: string | null;
  placementParam: string | null;
  mapTitle: string | null;
  placementLabel: string | null;
  checkpointSummary: string;
  unknownMapSlug: boolean;
  /** Mobile: start with floor workspace hidden */
  floorWorkspaceOpen: boolean;
  onToggleFloorWorkspace: () => void;
};

function decodeTitle(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  try {
    return decodeURIComponent(raw.trim());
  } catch {
    return raw.trim();
  }
}

export function WarehouseCheckpointTaskFirst({
  supabase,
  titleParam,
  customerParam,
  cellParam,
  placementParam,
  mapTitle,
  placementLabel,
  checkpointSummary,
  unknownMapSlug,
  floorWorkspaceOpen,
  onToggleFloorWorkspace,
}: Props) {
  const zoneHeading = decodeTitle(titleParam) ?? "Warehouse checkpoint";
  const cellParsed = useMemo(() => parseCellQuery(cellParam), [cellParam]);
  const cellLine = cellParsed ? `Grid cell ${formatCellQuery(cellParsed.col, cellParsed.row)}` : null;

  const [pullLoading, setPullLoading] = useState(false);
  const [pullError, setPullError] = useState<string | null>(null);
  const [pullName, setPullName] = useState<string | null>(null);
  const [pullGrouped, setPullGrouped] = useState<CustomerPullGroup[]>([]);
  const [pullMeta, setPullMeta] = useState<{ jobs: number; lines: number } | null>(null);

  const customerId = customerParam?.trim() ?? "";
  const fetchCustomer = isLikelyCustomerId(customerId);

  useEffect(() => {
    if (!fetchCustomer) {
      setPullName(null);
      setPullGrouped([]);
      setPullMeta(null);
      setPullError(null);
      return;
    }
    let cancelled = false;
    setPullLoading(true);
    setPullError(null);
    void fetchCustomerPullSupplies(supabase, customerId).then((res) => {
      if (cancelled) return;
      setPullLoading(false);
      if (res.error) {
        setPullError(res.error);
        setPullGrouped([]);
        setPullMeta(null);
        setPullName(null);
        return;
      }
      setPullName(res.customerName);
      setPullGrouped(res.grouped);
      setPullMeta({ jobs: res.jobCount, lines: res.lineCount });
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, fetchCustomer, customerId]);

  return (
    <section className="border-b border-accent-gold/30 bg-gradient-to-b from-[#14141c] to-[#0a0a0f] px-4 py-5 md:px-5">
      <p className="text-[11px] font-medium uppercase tracking-wider text-accent-gold/90">At this checkpoint</p>
      <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-foreground md:text-3xl">
        {zoneHeading}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mapTitle ? <span className="text-foreground/90">{mapTitle}</span> : "Map"}
        {cellLine ? (
          <>
            {" "}
            · <span className="font-medium text-foreground">{cellLine}</span>
          </>
        ) : null}
        {placementParam && placementLabel ? (
          <>
            {" "}
            · Marker: <span className="font-medium text-foreground">{placementLabel}</span>
          </>
        ) : null}
        {placementParam && !placementLabel ? (
          <>
            {" "}
            · <span className="font-medium text-foreground">Marker selected</span>
          </>
        ) : null}
      </p>
      <p className="mt-1 text-[12px] text-muted-foreground/90">{checkpointSummary}</p>
      {unknownMapSlug ? (
        <p className="mt-2 text-sm text-destructive-foreground">Unknown map in URL — fix the link or pick a map below.</p>
      ) : null}

      {fetchCustomer ? (
        <div className="mt-5 rounded-xl border border-white/12 bg-black/40 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-accent-gold">Pull list for customer</h2>
          {pullLoading ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading supplies…</p>
          ) : pullError ? (
            <p className="mt-2 text-sm text-destructive-foreground" role="alert">
              {pullError}
            </p>
          ) : pullMeta && pullMeta.lines === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {pullMeta.jobs === 0
                ? "No jobs for this customer yet."
                : "No supplies on jobs yet — add lines on each job’s Supplies tab with a pull location."}
            </p>
          ) : (
            <>
              {pullName ? (
                <p className="mt-1 text-lg font-semibold text-foreground">{pullName}</p>
              ) : null}
              {pullMeta ? (
                <p className="text-[11px] text-muted-foreground">
                  {pullMeta.jobs} job{pullMeta.jobs === 1 ? "" : "s"} · {pullMeta.lines} line{pullMeta.lines === 1 ? "" : "s"}
                </p>
              ) : null}
              {pullGrouped.length > 0 ? (
                <ol className="mt-3 space-y-3">
                  {pullGrouped.map((g) => (
                    <li key={g.code}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                        {g.name}
                        <span className="ml-2 font-normal text-muted-foreground">({g.code})</span>
                      </p>
                      <ul className="mt-1.5 space-y-2 border-l border-white/15 pl-3">
                        {g.items.map((item, idx) => (
                          <li key={`${g.code}-${idx}-${item.material}`} className="text-sm text-foreground/95">
                            <span className="font-medium">{item.material}</span>
                            <span className="text-muted-foreground"> — {item.qty}</span>
                            <div className="text-[11px] text-muted-foreground">
                              Job: {item.jobTitle}
                              {item.notes?.trim() ? ` · ${item.notes.trim()}` : ""}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              ) : null}
            </>
          )}
        </div>
      ) : customerParam?.trim() ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Add a valid customer ID to the URL (<code className="text-foreground">?customer=…</code>) to show a pull list
          here after scanning.
        </p>
      ) : null}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] leading-relaxed text-muted-foreground md:max-w-xl">
          {floorWorkspaceOpen
            ? "Floor diagram and editing tools are open below. Pinch to zoom the plan; the gold ring marks your cell when applicable."
            : "Open the floor plan when you need to match this spot to the diagram—your pull list is above."}
        </p>
        <button
          type="button"
          onClick={onToggleFloorWorkspace}
          className="shrink-0 rounded-lg border border-accent-gold/50 bg-accent-gold/15 px-4 py-2.5 text-sm font-semibold text-accent-gold hover:bg-accent-gold/25"
        >
          {floorWorkspaceOpen ? "Hide floor plan & tools" : "Show floor plan & tools"}
        </button>
      </div>
    </section>
  );
}
