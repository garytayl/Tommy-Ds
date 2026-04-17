"use client";

import { LayoutGrid, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { YardRow } from "@/components/warehouse/warehouse-yard-types";
import { WAREHOUSE_COLUMNS, cellKey, eachWarehouseGridCell, maxRowForColumn } from "@/lib/warehouse-grid";
import { humanizeDbError, runPostgrestWithRetry } from "@/lib/supabase-retry";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const VALID_SLOTS = new Set(eachWarehouseGridCell().map((c) => c.slot));

function formatShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function RackCell({
  slot,
  latest,
  logCount,
  onPick,
}: {
  slot: string;
  latest: YardRow | null;
  logCount: number;
  onPick: () => void;
}) {
  const filled = Boolean(latest);
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "group relative flex min-h-[76px] w-full flex-col rounded-xl border px-2.5 py-2 text-left transition duration-200",
        filled
          ? "border-amber-400/40 bg-gradient-to-b from-amber-500/[0.18] via-amber-950/20 to-[#0a0a0c] shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] hover:border-amber-300/55 hover:shadow-[0_0_20px_rgba(245,166,35,0.08)]"
          : "border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]",
      )}
    >
      <span
        className={cn(
          "font-mono text-sm font-bold tabular-nums",
          filled ? "text-amber-100/95" : "text-white/35",
        )}
      >
        {slot}
      </span>
      {filled ? (
        <>
          <span className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/80">{latest!.customer_name}</span>
          {latest!.note ? (
            <span className="mt-0.5 line-clamp-1 text-[10px] text-white/40">{latest!.note}</span>
          ) : null}
          <div className="mt-auto flex items-center justify-between gap-1 pt-1.5">
            <span className="text-[9px] text-white/30">{formatShort(latest!.created_at)}</span>
            {logCount > 1 ? (
              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] text-white/45">{logCount} logs</span>
            ) : null}
          </div>
        </>
      ) : (
        <span className="mt-auto font-mono text-[9px] tracking-wider text-white/18">—</span>
      )}
    </button>
  );
}

export function WarehouseYardInventory({ onChooseSlot }: { onChooseSlot: (slot: string) => void }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [latestBySlot, setLatestBySlot] = useState<Record<string, YardRow>>({});
  const [countsBySlot, setCountsBySlot] = useState<Record<string, number>>({});
  const [tape, setTape] = useState<YardRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await runPostgrestWithRetry(() =>
      supabase
        .from("warehouse_yard_placements")
        .select("id,customer_name,slot_code,note,created_at")
        .order("created_at", { ascending: false })
        .limit(4000),
    );
    setLoading(false);
    if (error || !data) {
      setLoadError(humanizeDbError(error?.message ?? "Could not load the yard log."));
      setLatestBySlot({});
      setCountsBySlot({});
      setTape([]);
      setTotalRows(0);
      return;
    }
    const rows = data as YardRow[];
    setTotalRows(rows.length);
    setTape(rows.slice(0, 36));
    const latest: Record<string, YardRow> = {};
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const s = row.slot_code.trim().toUpperCase();
      counts[s] = (counts[s] ?? 0) + 1;
      if (!latest[s]) latest[s] = row;
    }
    setLatestBySlot(latest);
    setCountsBySlot(counts);
    setLoadError(null);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const filledValid = useMemo(() => {
    let n = 0;
    for (const slot of VALID_SLOTS) {
      if (latestBySlot[slot]) n += 1;
    }
    return n;
  }, [latestBySlot]);

  const fillSegments = useMemo(() => eachWarehouseGridCell().map(({ slot }) => Boolean(latestBySlot[slot])), [latestBySlot]);

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-8 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-amber-200/70">
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            Yard atlas
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Live inventory map</h2>
          <p className="mt-2 max-w-xl text-sm font-light leading-relaxed text-white/55">
            Each cell mirrors the upper rack grid. Latest log per slot; tap a cell to jump to Find by that slot.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-transparent p-4 sm:col-span-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">Occupied</p>
          <p className="mt-1 font-sans text-3xl font-semibold tabular-nums text-white">
            {filledValid}
            <span className="text-lg font-normal text-white/35">/26</span>
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-950/40 to-transparent p-4 sm:col-span-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">Log lines (sample)</p>
          <p className="mt-1 font-sans text-3xl font-semibold tabular-nums text-emerald-200/90">{totalRows}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:col-span-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">Fill strip</p>
          <div className="mt-3 flex gap-px overflow-hidden rounded-md bg-black/40 p-0.5">
            {fillSegments.map((on, i) => (
              <div
                key={i}
                title={eachWarehouseGridCell()[i]?.slot}
                className={cn("h-2 min-w-[3px] flex-1 rounded-sm transition", on ? "bg-amber-400/85" : "bg-white/12")}
              />
            ))}
          </div>
        </div>
      </div>

      {loading && Object.keys(latestBySlot).length === 0 ? (
        <p className="text-center text-sm text-white/45">Loading yard data…</p>
      ) : null}

      {loadError ? (
        <div
          className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-center text-sm text-red-200/95"
          role="alert"
        >
          {loadError}{" "}
          <button
            type="button"
            className="font-medium text-amber-200 underline-offset-2 hover:underline"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {WAREHOUSE_COLUMNS.map((col) => (
          <div key={col} className="flex flex-col gap-2">
            <div className="sticky top-0 z-10 flex items-baseline justify-between border-b border-white/10 bg-[#050508]/95 py-2 backdrop-blur-sm">
              <span className="font-mono text-xs font-semibold tracking-[0.12em] text-white/80">Column {col}</span>
              <span className="text-[10px] text-white/35">{maxRowForColumn(col)} rows</span>
            </div>
            <div className="flex flex-col gap-2">
              {Array.from({ length: maxRowForColumn(col) }, (_, i) => {
                const row = i + 1;
                const slot = cellKey(col, row);
                const latest = latestBySlot[slot] ?? null;
                const logCount = countsBySlot[slot] ?? 0;
                return (
                  <RackCell
                    key={slot}
                    slot={slot}
                    latest={latest}
                    logCount={logCount}
                    onPick={() => onChooseSlot(slot)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#08080c]">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-16 bg-gradient-to-r from-[#08080c] to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-16 bg-gradient-to-l from-[#08080c] to-transparent"
          aria-hidden
        />
        <div className="border-b border-white/5 px-4 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">Activity tape</p>
        </div>
        <div className="flex gap-4 overflow-x-auto px-4 py-4 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tape.length === 0 ? (
            <p className="text-sm text-white/40">No log entries yet.</p>
          ) : (
            tape.map((row) => (
              <div
                key={row.id}
                className="flex w-[200px] shrink-0 flex-col rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-amber-200/90">{row.slot_code}</span>
                  <span className="text-[9px] text-white/30">{formatShort(row.created_at)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-white/85">{row.customer_name}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
