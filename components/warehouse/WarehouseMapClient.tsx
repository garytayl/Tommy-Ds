"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MapErrorBoundary } from "@/components/MapErrorBoundary";
import { WarehouseFloorPlan, type WarehouseFloorPlanHandle } from "@/components/warehouse/WarehouseFloorPlan";
import { WarehouseGridTable, type WarehouseGridMoveTarget } from "@/components/warehouse/WarehouseGridTable";
import type {
  WarehouseMapRow,
  WarehousePlacementKind,
  WarehousePlacementRow,
} from "@/components/warehouse/warehouse-map-types";
import {
  cellCenterNormalized,
  cellKey,
  maxRowForColumn,
  type WarehouseColumn,
} from "@/lib/warehouse-grid";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type { WarehousePlacementKind };

/** Initial load should finish quickly; this only guards hung networks. */
const WAREHOUSE_LOAD_TIMEOUT_MS = 20_000;

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function placementKindLetter(kind: WarehousePlacementKind): string {
  if (kind === "window") return "W";
  if (kind === "door") return "D";
  return "S";
}

function placementKindTitle(kind: WarehousePlacementKind): string {
  if (kind === "window") return "Window";
  if (kind === "door") return "Door";
  return "Screen";
}

function defaultLabelForKind(kind: WarehousePlacementKind): string {
  return placementKindTitle(kind);
}

function normalizePlacementKind(k: string): WarehousePlacementKind {
  if (k === "window" || k === "door" || k === "screen") return k;
  return "window";
}

function labelPlaceholderForKind(kind: WarehousePlacementKind): string {
  if (kind === "window") return "e.g. North wall row";
  if (kind === "door") return "e.g. Loading bay";
  return "e.g. Patio screen";
}

function friendlyWarehouseErrorMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("warehouse_placements_stack_index_range") || lower.includes("stack_index")) {
    return "Database migration is missing: the old 10-item stack constraint is still active. Apply migration 20260409110000_warehouse_unbounded_cell_stacks.sql in Supabase, then retry.";
  }
  return message;
}

export function WarehouseMapClient() {
  const [maps, setMaps] = useState<WarehouseMapRow[]>([]);
  const [placements, setPlacements] = useState<WarehousePlacementRow[]>([]);
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<"map" | "cell">("map");
  const [addNorm, setAddNorm] = useState<{ pos_x: number; pos_y: number } | null>(null);
  const [addCol, setAddCol] = useState<WarehouseColumn>("A");
  const [addRow, setAddRow] = useState(1);
  const [addKind, setAddKind] = useState<WarehousePlacementKind>("window");
  const [addLabel, setAddLabel] = useState("");
  const [addNote, setAddNote] = useState("");
  const [saving, setSaving] = useState(false);
  const floorPlanRef = useRef<WarehouseFloorPlanHandle | null>(null);
  const [workspaceView, setWorkspaceView] = useState<"table" | "floor">("floor");
  const [mobileFullscreen, setMobileFullscreen] = useState(false);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const activeMap = useMemo(
    () => maps.find((m) => m.id === activeMapId) ?? null,
    [maps, activeMapId],
  );

  const canEdit = Boolean(sessionEmail);

  const loadAll = useCallback(async () => {
    setError(null);
    const mapsQ = supabase
      .from("warehouse_maps")
      .select("id, slug, title, description, image_path, width_px, height_px, sort_order")
      .order("sort_order", { ascending: true });
    const placementsQ = supabase
      .from("warehouse_map_placements")
      .select("id, map_id, kind, label, pos_x, pos_y, note, cell_column, cell_row, stack_index");

    const [{ data: mapRows, error: mapErr }, { data: placeRows, error: pErr }] = await Promise.all([mapsQ, placementsQ]);

    if (mapErr) {
      setError(friendlyWarehouseErrorMessage(mapErr.message));
      return;
    }
    if (pErr) {
      setError(friendlyWarehouseErrorMessage(pErr.message));
      return;
    }

    const list = (mapRows ?? []) as WarehouseMapRow[];
    const mapIds = new Set(list.map((m) => m.id));
    setMaps(list);
    setActiveMapId((prev) => {
      if (list.length === 0) return null;
      if (prev && list.some((m) => m.id === prev)) return prev;
      return list[0].id;
    });

    const filtered = (placeRows ?? []).filter((r) => mapIds.has(String(r.map_id)));
    setPlacements(
      filtered.map((r) => ({
        ...r,
        kind: normalizePlacementKind(String(r.kind)),
        pos_x: num(r.pos_x),
        pos_y: num(r.pos_y),
        cell_row: r.cell_row == null ? null : Number(r.cell_row),
        stack_index: Number.isFinite(Number(r.stack_index)) ? Number(r.stack_index) : 0,
      })) as WarehousePlacementRow[],
    );
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      setLoading(true);
      try {
        const loadWork = (async () => {
          await Promise.all([
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (!cancelled) setSessionEmail(session?.user?.email ?? null);
            }),
            loadAll(),
          ]);
        })();
        const timeoutP = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () =>
              reject(
                new Error(
                  "Loading timed out. Check your network, Supabase status, and that warehouse tables exist for this project.",
                ),
              ),
            WAREHOUSE_LOAD_TIMEOUT_MS,
          );
        });
        await Promise.race([loadWork, timeoutP]);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load warehouse data.");
        }
      } finally {
        if (timeoutId !== undefined) clearTimeout(timeoutId);
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, [supabase, loadAll]);

  useEffect(() => {
    const max = maxRowForColumn(addCol);
    // Sync row clamp when column changes (max rows differ per column).
    setAddRow((r) => Math.min(max, Math.max(1, r)));
  }, [addCol]);

  /** Subscribe after first load so realtime handshake does not compete with initial queries. */
  useEffect(() => {
    if (loading) return undefined;
    const ch = supabase
      .channel("warehouse_map_placements_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "warehouse_map_placements" },
        () => {
          void loadAll();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [loading, supabase, loadAll]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const placementsForActive = useMemo(
    () => placements.filter((p) => p.map_id === activeMapId),
    [placements, activeMapId],
  );

  const { freePlacements, cellGroupList } = useMemo(() => {
    const free: WarehousePlacementRow[] = [];
    const cellMap = new Map<string, WarehousePlacementRow[]>();
    for (const p of placementsForActive) {
      if (p.cell_column && p.cell_row != null) {
        const k = cellKey(p.cell_column as WarehouseColumn, p.cell_row);
        const arr = cellMap.get(k) ?? [];
        arr.push(p);
        cellMap.set(k, arr);
      } else {
        free.push(p);
      }
    }
    for (const arr of cellMap.values()) {
      arr.sort((a, b) => a.stack_index - b.stack_index);
    }
    const cellGroupList = Array.from(cellMap.entries()).sort(([a], [b]) => a.localeCompare(b));
    return { freePlacements: free, cellGroupList };
  }, [placementsForActive]);

  const jumpPlacementTargets = useMemo(() => {
    const out = [...freePlacements];
    for (const [, items] of cellGroupList) out.push(...items);
    return out.sort((a, b) => {
      const ca = `${a.cell_column ?? ""}${a.cell_row ?? ""}`;
      const cb = `${b.cell_column ?? ""}${b.cell_row ?? ""}`;
      if (ca !== cb) return ca.localeCompare(cb);
      return a.stack_index - b.stack_index;
    });
  }, [freePlacements, cellGroupList]);

  const placedInCellsCount = useMemo(
    () => placementsForActive.filter((p) => p.cell_column && p.cell_row != null).length,
    [placementsForActive],
  );
  const floorOnlyCount = placementsForActive.length - placedInCellsCount;

  const mapFitKey = activeMap ? `${activeMap.id}-${activeMap.width_px}-${activeMap.height_px}` : "";

  const selectedCellGroup = useMemo(() => {
    if (!selectedPlacementId) return null;
    for (const [label, items] of cellGroupList) {
      if (items.some((i) => i.id === selectedPlacementId)) return [label, items] as const;
    }
    return null;
  }, [cellGroupList, selectedPlacementId]);

  const selectedFreePlacement = useMemo(() => {
    if (!selectedPlacementId || selectedCellGroup) return null;
    return freePlacements.find((p) => p.id === selectedPlacementId) ?? null;
  }, [freePlacements, selectedPlacementId, selectedCellGroup]);

  const focusPlacement = useCallback(
    (placement: WarehousePlacementRow) => {
      setSelectedPlacementId(placement.id);
      if (workspaceView === "floor") {
        floorPlanRef.current?.focusMarker(placement.id);
      }
    },
    [workspaceView],
  );

  const handleGridMove = useCallback(
    async (placementId: string, target: WarehouseGridMoveTarget) => {
      if (!activeMap) return;
      setSaving(true);
      setError(null);
      const p = placementsForActive.find((x) => x.id === placementId);
      if (!p) {
        setSaving(false);
        return;
      }

      if (target.kind === "floor") {
        if (!p.cell_column && p.cell_row == null) {
          setSaving(false);
          return;
        }
        const { error } = await supabase
          .from("warehouse_map_placements")
          .update({
            cell_column: null,
            cell_row: null,
            stack_index: 0,
          })
          .eq("id", placementId);
        setSaving(false);
        if (error) setError(friendlyWarehouseErrorMessage(error.message));
        else await loadAll();
        return;
      }

      const { col, row } = target;
      if (p.cell_column === col && p.cell_row === row) {
        setSaving(false);
        return;
      }

      const othersInTarget = placementsForActive.filter(
        (x) => x.cell_column === col && x.cell_row === row && x.id !== placementId,
      );
      const stacks = othersInTarget.map((x) => x.stack_index).filter(Number.isFinite);
      const nextStack = stacks.length ? Math.max(...stacks) + 1 : 0;

      const { pos_x, pos_y } = cellCenterNormalized(col, row);
      const { error } = await supabase
        .from("warehouse_map_placements")
        .update({
          cell_column: col,
          cell_row: row,
          stack_index: nextStack,
          pos_x,
          pos_y,
        })
        .eq("id", placementId);
      setSaving(false);
      if (error) setError(friendlyWarehouseErrorMessage(error.message));
      else await loadAll();
    },
    [activeMap, placementsForActive, supabase, loadAll],
  );

  const imageUrl = activeMap
    ? typeof window !== "undefined"
      ? new URL(activeMap.image_path, window.location.origin).href
      : activeMap.image_path
    : "";

  useEffect(() => {
    const root = document.documentElement;
    if (mobileFullscreen) root.classList.add("warehouse-mobile-fullscreen");
    else root.classList.remove("warehouse-mobile-fullscreen");
    return () => {
      root.classList.remove("warehouse-mobile-fullscreen");
    };
  }, [mobileFullscreen]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => {
      if (mq.matches) setMobileFullscreen(false);
    };
    sync();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }
    mq.addListener(sync);
    return () => mq.removeListener(sync);
  }, []);

  function onFloorTap(norm: { pos_x: number; pos_y: number }) {
    if (!activeMap || !canEdit || addOpen) return;
    setAddMode("map");
    setAddNorm(norm);
    setAddKind("window");
    setAddLabel("");
    setAddNote("");
    setAddOpen(true);
  }

  async function saveNewPlacement() {
    if (!activeMap) return;
    setSaving(true);
    setError(null);

    if (addMode === "map") {
      if (!addNorm) {
        setSaving(false);
        setError("Click the map to choose a position, or switch to grid cell.");
        return;
      }
      const { error: insErr } = await supabase.from("warehouse_map_placements").insert({
        map_id: activeMap.id,
        kind: addKind,
        label: addLabel.trim() || defaultLabelForKind(addKind),
        pos_x: addNorm.pos_x,
        pos_y: addNorm.pos_y,
        note: addNote.trim() || null,
        cell_column: null,
        cell_row: null,
        stack_index: 0,
      });
      setSaving(false);
      if (insErr) {
        setError(friendlyWarehouseErrorMessage(insErr.message));
        return;
      }
    } else {
      const maxR = maxRowForColumn(addCol);
      const row = Math.min(maxR, Math.max(1, addRow));
      const { data: existing, error: exErr } = await supabase
        .from("warehouse_map_placements")
        .select("stack_index")
        .eq("map_id", activeMap.id)
        .eq("cell_column", addCol)
        .eq("cell_row", row);
      if (exErr) {
        setSaving(false);
        setError(friendlyWarehouseErrorMessage(exErr.message));
        return;
      }
      const stacks = (existing ?? []).map((r) => Number(r.stack_index)).filter(Number.isFinite);
      const next = stacks.length ? Math.max(...stacks) + 1 : 0;
      const { pos_x, pos_y } = cellCenterNormalized(addCol, row);
      const { error: insErr } = await supabase.from("warehouse_map_placements").insert({
        map_id: activeMap.id,
        kind: addKind,
        label: addLabel.trim() || defaultLabelForKind(addKind),
        pos_x,
        pos_y,
        note: addNote.trim() || null,
        cell_column: addCol,
        cell_row: row,
        stack_index: next,
      });
      setSaving(false);
      if (insErr) {
        setError(friendlyWarehouseErrorMessage(insErr.message));
        return;
      }
    }

    setAddOpen(false);
    setAddNorm(null);
    await loadAll();
  }

  async function updatePlacementLabel(id: string, label: string, note: string | null) {
    setSaving(true);
    setError(null);
    const { error: uErr } = await supabase
      .from("warehouse_map_placements")
      .update({ label: label.trim(), note: (note ?? "").trim() || null })
      .eq("id", id);
    setSaving(false);
    if (uErr) {
      setError(friendlyWarehouseErrorMessage(uErr.message));
      return;
    }
    await loadAll();
  }

  async function deletePlacement(id: string) {
    setSaving(true);
    setError(null);
    const { error: dErr } = await supabase.from("warehouse_map_placements").delete().eq("id", id);
    setSaving(false);
    if (dErr) {
      setError(friendlyWarehouseErrorMessage(dErr.message));
      return;
    }
    setSelectedPlacementId(null);
    await loadAll();
  }

  const handleFreeMarkerDragEnd = useCallback(
    async (id: string, pos_x: number, pos_y: number) => {
      if (!activeMap) return;
      const { error: uErr } = await supabase
        .from("warehouse_map_placements")
        .update({ pos_x, pos_y })
        .eq("id", id);
      if (uErr) setError(friendlyWarehouseErrorMessage(uErr.message));
      else await loadAll();
    },
    [activeMap, supabase, loadAll],
  );

  const mapFallback = (
    <div className="flex h-full min-h-[200px] items-center justify-center bg-[#08080c] p-6 text-sm text-muted-foreground">
      Floor could not be loaded.
    </div>
  );

  if (loading && maps.length === 0) {
    return (
      <div className="flex min-h-[min(40dvh,360px)] flex-1 items-center justify-center bg-[#050508] text-muted-foreground">
        Loading warehouse maps…
      </div>
    );
  }

  if (!activeMap) {
    return (
      <div className="flex min-h-[min(40dvh,240px)] flex-1 items-center justify-center bg-[#050508] px-4 text-center text-sm text-muted-foreground">
        No floor maps are configured yet.
      </div>
    );
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${mobileFullscreen ? "fixed inset-0 z-[9000] h-dvh bg-[#050508]" : ""}`}>
      {error ? (
        <div
          className="shrink-0 border-b border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="shrink-0 border-b border-white/10 bg-gradient-to-b from-black/75 to-black/55 px-3 py-3 backdrop-blur-xl md:px-5">
        <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Warehouse workspace</p>
              <h2 className="mt-1 truncate text-lg font-semibold text-foreground md:text-xl">{activeMap.title}</h2>
              {activeMap.description ? (
                <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">{activeMap.description}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-foreground">
                {placementsForActive.length} total
              </span>
              <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-foreground">
                {placedInCellsCount} in cells
              </span>
              <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-foreground">
                {floorOnlyCount} floor only
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex flex-wrap gap-1 rounded-xl border border-white/12 bg-white/[0.05] p-1">
                {maps.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setActiveMapId(m.id);
                      setAddOpen(false);
                      setAddNorm(null);
                      setSelectedPlacementId(null);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition md:text-sm ${
                      m.id === activeMapId
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                    }`}
                  >
                    {m.title}
                  </button>
                ))}
              </div>

              <div className="inline-flex rounded-xl border border-white/12 bg-white/[0.04] p-1">
                <button
                  type="button"
                  onClick={() => setWorkspaceView("floor")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    workspaceView === "floor"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  }`}
                >
                  Floor canvas
                </button>
                <button
                  type="button"
                  onClick={() => setWorkspaceView("table")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    workspaceView === "table"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  }`}
                >
                  Grid studio
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-white/14 md:hidden"
                onClick={() => setMobileFullscreen((v) => !v)}
              >
                {mobileFullscreen ? "Exit canvas mode" : "Canvas mode"}
              </button>
              {canEdit ? (
                <button
                  type="button"
                  className="rounded-lg border border-primary/45 bg-primary/20 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-primary/30"
                  onClick={() => {
                    setAddMode("cell");
                    setAddCol("A");
                    setAddRow(1);
                    setAddKind("window");
                    setAddLabel("");
                    setAddNote("");
                    setAddNorm(null);
                    setAddOpen(true);
                  }}
                >
                  + Add marker
                </button>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  <Link href="/auth/login?next=/warehouse" className="font-medium text-accent-gold underline-offset-4 hover:underline">
                    Sign in
                  </Link>{" "}
                  to add or edit.
                </span>
              )}
            </div>
          </div>

          {canEdit && !mobileFullscreen ? (
            <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{sessionEmail}</span> —{" "}
              {workspaceView === "table"
                ? "Grid studio is touch-first: use Tap move to select a marker, then tap destination cell/floor."
                : "Floor canvas supports pinch-to-zoom, pan, tap-to-select, and quick detail editing from the bottom sheet."}
            </p>
          ) : null}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {workspaceView === "floor" ? (
          <div className="absolute inset-0 z-0 min-h-[240px]">
            <MapErrorBoundary fallback={mapFallback}>
              <WarehouseFloorPlan
                ref={floorPlanRef}
                mapFitKey={mapFitKey}
                activeMap={activeMap}
                imageUrl={imageUrl}
                freePlacements={freePlacements}
                cellGroupList={cellGroupList}
                canEdit={canEdit && !addOpen}
                selectedPlacementId={selectedPlacementId}
                onSelectPlacement={setSelectedPlacementId}
                onFloorTap={onFloorTap}
                onFreeMarkerDragEnd={handleFreeMarkerDragEnd}
              />
            </MapErrorBoundary>
          </div>
        ) : (
          <div className="absolute inset-0 z-0 min-h-[240px] overflow-hidden bg-[#050508]">
            <WarehouseGridTable
              freePlacements={freePlacements}
              cellGroupList={cellGroupList}
              canEdit={canEdit && !addOpen}
              selectedPlacementId={selectedPlacementId}
              onSelectPlacement={setSelectedPlacementId}
              onMove={(id, target) => handleGridMove(id, target)}
              onQuickAddCell={
                canEdit
                  ? (col, row) => {
                      setAddMode("cell");
                      setAddCol(col);
                      setAddRow(row);
                      setAddKind("window");
                      setAddLabel("");
                      setAddNote("");
                      setAddNorm(null);
                      setAddOpen(true);
                    }
                  : undefined
              }
            />
          </div>
        )}

        {selectedPlacementId && (selectedCellGroup || selectedFreePlacement) ? (
          <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-50 p-2 sm:bottom-3 sm:right-3 sm:left-auto sm:w-[380px]">
            <div className="rounded-2xl border border-white/15 bg-black/85 p-3 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:max-h-[75vh] sm:overflow-y-auto">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Inspector</p>
                  <p className="text-xs text-foreground">{selectedCellGroup ? `Cell ${selectedCellGroup[0]}` : "Free marker"}</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-white/15 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                  onClick={() => setSelectedPlacementId(null)}
                >
                  Close
                </button>
              </div>

              {selectedCellGroup ? (
                <CellGroupPopupBody
                  cellLabel={selectedCellGroup[0]}
                  items={selectedCellGroup[1]}
                  canEdit={canEdit}
                  saving={saving}
                  onSave={(id, lbl, note) => updatePlacementLabel(id, lbl, note)}
                  onDelete={(id) => deletePlacement(id)}
                />
              ) : selectedFreePlacement ? (
                <div className="space-y-2 text-foreground">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {placementKindTitle(selectedFreePlacement.kind)}
                  </div>
                  {canEdit ? (
                    <MarkerEditForm
                      key={selectedFreePlacement.id}
                      initialLabel={selectedFreePlacement.label}
                      initialNote={selectedFreePlacement.note ?? ""}
                      saving={saving}
                      onSave={(label, note) => updatePlacementLabel(selectedFreePlacement.id, label, note)}
                      onDelete={() => deletePlacement(selectedFreePlacement.id)}
                    />
                  ) : (
                    <>
                      <p className="text-sm font-medium">{selectedFreePlacement.label || "—"}</p>
                      {selectedFreePlacement.note ? (
                        <p className="text-xs text-muted-foreground">{selectedFreePlacement.note}</p>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {!mobileFullscreen && jumpPlacementTargets.length > 0 ? (
        <div className="shrink-0 border-t border-white/10 bg-black/45 px-3 py-2 md:px-4">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Quick jump</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
            {jumpPlacementTargets.map((p) => {
              const cellPrefix = p.cell_column && p.cell_row != null ? `${p.cell_column}${p.cell_row} · ` : "";
              return (
                <button
                  key={`${p.id}-jump`}
                  type="button"
                  onClick={() => focusPlacement(p)}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                    p.id === selectedPlacementId
                      ? "border-primary bg-primary/25 text-foreground"
                      : "border-white/15 bg-white/[0.05] text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  }`}
                >
                  {cellPrefix}
                  {placementKindLetter(p.kind)} · {p.label?.trim() || "Untitled"}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {addOpen ? (
        <div
          className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="warehouse-add-title"
        >
          <div className="flex h-[min(92dvh,760px)] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-white/15 bg-[#0b0b10] shadow-2xl sm:rounded-3xl">
            <div className="shrink-0 border-b border-white/10 px-4 py-3">
              <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="warehouse-add-title" className="text-lg font-semibold text-foreground">
                    New marker
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add directly on the floor or place into a grid cell with stacked indexing.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg border border-white/15 px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                  onClick={() => {
                    setAddOpen(false);
                    setAddNorm(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                <button
                  type="button"
                  onClick={() => setAddMode("map")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    addMode === "map" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  Floor position
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddMode("cell");
                    setAddNorm(null);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                    addMode === "cell" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  Grid cell
                </button>
              </div>

              {addMode === "map" && addNorm ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground">
                  Marker anchor: x={addNorm.pos_x.toFixed(3)}, y={addNorm.pos_y.toFixed(3)}.
                </div>
              ) : null}

              {addMode === "cell" ? (
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <label className="text-sm font-medium text-foreground">
                    Column
                    <select
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                      value={addCol}
                      onChange={(e) => setAddCol(e.target.value as WarehouseColumn)}
                    >
                      <option value="A">A (10 rows)</option>
                      <option value="B">B (8 rows)</option>
                      <option value="C">C (8 rows)</option>
                    </select>
                  </label>
                  <label className="text-sm font-medium text-foreground">
                    Row
                    <select
                      className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                      value={addRow}
                      onChange={(e) => setAddRow(Number(e.target.value))}
                    >
                      {Array.from({ length: maxRowForColumn(addCol) }, (_, i) => i + 1).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAddKind("window")}
                  className={`rounded-xl border px-2 py-2 text-sm font-medium transition ${
                    addKind === "window"
                      ? "border-primary bg-primary/20 text-foreground"
                      : "border-white/15 bg-white/[0.03] text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  Window
                </button>
                <button
                  type="button"
                  onClick={() => setAddKind("door")}
                  className={`rounded-xl border px-2 py-2 text-sm font-medium transition ${
                    addKind === "door"
                      ? "border-primary bg-primary/20 text-foreground"
                      : "border-white/15 bg-white/[0.03] text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  Door
                </button>
                <button
                  type="button"
                  onClick={() => setAddKind("screen")}
                  className={`rounded-xl border px-2 py-2 text-sm font-medium transition ${
                    addKind === "screen"
                      ? "border-primary bg-primary/20 text-foreground"
                      : "border-white/15 bg-white/[0.03] text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  Screen
                </button>
              </div>

              <label className="block text-sm font-medium text-foreground">
                Label
                <input
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                  value={addLabel}
                  onChange={(e) => setAddLabel(e.target.value)}
                  placeholder={labelPlaceholderForKind(addKind)}
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Note (optional)
                <textarea
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
                  rows={3}
                  value={addNote}
                  onChange={(e) => setAddNote(e.target.value)}
                />
              </label>
            </div>

            <div className="shrink-0 border-t border-white/10 bg-black/50 px-4 py-3">
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
                  onClick={() => {
                    setAddOpen(false);
                    setAddNorm(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                  disabled={saving || (addMode === "map" && !addNorm)}
                  onClick={() => void saveNewPlacement()}
                >
                  {saving ? "Saving…" : "Create marker"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CellGroupPopupBody({
  cellLabel,
  items,
  canEdit,
  saving,
  onSave,
  onDelete,
}: {
  cellLabel: string;
  items: WarehousePlacementRow[];
  canEdit: boolean;
  saving: boolean;
  onSave: (id: string, label: string, note: string | null) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="max-h-72 min-w-[220px] overflow-y-auto space-y-3 p-1 text-foreground">
      <div className="text-xs font-semibold uppercase text-muted-foreground">Cell {cellLabel}</div>
      {items.map((p) => (
        <div key={p.id} className="rounded-lg border border-border bg-muted/15 p-2">
          <div className="mb-1 text-[10px] text-muted-foreground">
            {placementKindTitle(p.kind)} · slot {p.stack_index + 1}
          </div>
          {canEdit ? (
            <MarkerEditForm
              initialLabel={p.label}
              initialNote={p.note ?? ""}
              saving={saving}
              onSave={(label, note) => onSave(p.id, label, note)}
              onDelete={() => onDelete(p.id)}
            />
          ) : (
            <>
              <p className="text-sm font-medium">{p.label || "—"}</p>
              {p.note ? <p className="text-xs text-muted-foreground">{p.note}</p> : null}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function MarkerEditForm({
  initialLabel,
  initialNote,
  saving,
  onSave,
  onDelete,
}: {
  initialLabel: string;
  initialNote: string;
  saving: boolean;
  onSave: (label: string, note: string | null) => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(initialLabel);
  const [note, setNote] = useState(initialNote);

  return (
    <>
      <input
        className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <textarea
        className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs"
        rows={2}
        placeholder="Note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          className="btn-primary flex-1 py-1.5 text-xs disabled:opacity-50"
          disabled={saving}
          onClick={() => onSave(label, note || null)}
        >
          Save
        </button>
        <button
          type="button"
          className="rounded border border-destructive/50 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
          disabled={saving}
          onClick={() => {
            if (typeof window !== "undefined" && window.confirm("Remove this marker?")) onDelete();
          }}
        >
          Delete
        </button>
      </div>
    </>
  );
}
