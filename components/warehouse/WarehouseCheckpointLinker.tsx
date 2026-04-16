"use client";

import { useEffect, useMemo, useState } from "react";

import type { WarehouseMapRow } from "@/components/warehouse/warehouse-map-types";
import { buildWarehouseCheckpointPath, formatCellQuery } from "@/lib/warehouse-checkpoint";
import { maxRowForColumn, type WarehouseColumn } from "@/lib/warehouse-grid";

type Props = {
  maps: WarehouseMapRow[];
  activeMapSlug: string | null;
};

export function WarehouseCheckpointLinker({ maps, activeMapSlug }: Props) {
  const [mapSlug, setMapSlug] = useState<string>("");
  const [col, setCol] = useState<WarehouseColumn>("A");
  const [row, setRow] = useState(1);

  useEffect(() => {
    if (activeMapSlug) setMapSlug(activeMapSlug);
  }, [activeMapSlug]);

  const maxR = maxRowForColumn(col);

  useEffect(() => {
    setRow((r) => Math.min(maxR, Math.max(1, r)));
  }, [col, maxR]);

  const path = useMemo(() => {
    const slug = mapSlug || maps[0]?.slug;
    if (!slug) return "/warehouse";
    return buildWarehouseCheckpointPath({ mapSlug: slug, cell: formatCellQuery(col, row) });
  }, [mapSlug, col, row, maps]);

  const fullUrl =
    typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  if (maps.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">QR checkpoint link</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        Print a QR that opens this exact floor view and highlights the grid cell (iPhone Camera works). Use the same
        diagram as the selected map so the grid lines up.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <label className="flex min-w-[8rem] flex-col gap-1 text-[11px] text-muted-foreground">
          Map
          <select
            value={mapSlug || maps[0]?.slug || ""}
            onChange={(e) => setMapSlug(e.target.value)}
            className="rounded-md border border-white/15 bg-black/50 px-2 py-1.5 text-sm text-foreground"
          >
            {maps.map((m) => (
              <option key={m.id} value={m.slug}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-20 flex-col gap-1 text-[11px] text-muted-foreground">
          Column
          <select
            value={col}
            onChange={(e) => setCol(e.target.value as WarehouseColumn)}
            className="rounded-md border border-white/15 bg-black/50 px-2 py-1.5 text-sm text-foreground"
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </label>
        <label className="flex w-20 flex-col gap-1 text-[11px] text-muted-foreground">
          Row
          <select
            value={row}
            onChange={(e) => setRow(Number(e.target.value))}
            className="rounded-md border border-white/15 bg-black/50 px-2 py-1.5 text-sm text-foreground"
          >
            {Array.from({ length: maxR }, (_, i) => i + 1).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-2 break-all rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-[11px] text-foreground/90">
        {fullUrl}
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        className="mt-2 rounded-md border border-accent-gold/40 bg-accent-gold/10 px-3 py-1.5 text-xs font-medium text-accent-gold hover:bg-accent-gold/20"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
