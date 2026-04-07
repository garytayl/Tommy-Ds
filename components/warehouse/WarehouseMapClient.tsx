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

const WAREHOUSE_LOAD_TIMEOUT_MS = 30_000;

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
  const [workspaceView, setWorkspaceView] = useState<"table" | "floor">("table");

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const activeMap = useMemo(
    () => maps.find((m) => m.id === activeMapId) ?? null,
    [maps, activeMapId],
  );

  const canEdit = Boolean(sessionEmail);

  const loadAll = useCallback(async () => {
    setError(null);
    const { data: mapRows, error: mapErr } = await supabase
      .from("warehouse_maps")
      .select("id, slug, title, description, image_path, width_px, height_px, sort_order")
      .order("sort_order", { ascending: true });
    if (mapErr) {
      setError(mapErr.message);
      return;
    }
    const list = (mapRows ?? []) as WarehouseMapRow[];
    setMaps(list);
    setActiveMapId((prev) => {
      if (list.length === 0) return null;
      if (prev && list.some((m) => m.id === prev)) return prev;
      return list[0].id;
    });
    const ids = list.map((m) => m.id);
    if (ids.length === 0) {
      setPlacements([]);
      return;
    }
    const { data: placeRows, error: pErr } = await supabase
      .from("warehouse_map_placements")
      .select("id, map_id, kind, label, pos_x, pos_y, note, cell_column, cell_row, stack_index")
      .in("map_id", ids);
    if (pErr) {
      setError(pErr.message);
      return;
    }
    setPlacements(
      (placeRows ?? []).map((r) => ({
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
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!cancelled) {
            setSessionEmail(session?.user?.email ?? null);
          }
          await loadAll();
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional clamp when addCol changes
    setAddRow((r) => Math.min(max, Math.max(1, r)));
  }, [addCol]);

  useEffect(() => {
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
  }, [supabase, loadAll]);

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
        if (error) setError(error.message);
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
      if (nextStack > 9) {
        setError("That cell already has 10 items. Move or remove one first.");
        setSaving(false);
        return;
      }

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
      if (error) setError(error.message);
      else await loadAll();
    },
    [activeMap, placementsForActive, supabase, loadAll],
  );

  const imageUrl = activeMap
    ? typeof window !== "undefined"
      ? new URL(activeMap.image_path, window.location.origin).href
      : activeMap.image_path
    : "";

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
        setError(insErr.message);
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
        setError(exErr.message);
        return;
      }
      const stacks = (existing ?? []).map((r) => Number(r.stack_index)).filter(Number.isFinite);
      const next = stacks.length ? Math.max(...stacks) + 1 : 0;
      if (next > 9) {
        setSaving(false);
        setError("That cell already has 10 items. Remove one before adding another.");
        return;
      }
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
        setError(insErr.message);
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
      setError(uErr.message);
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
      setError(dErr.message);
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
      if (uErr) setError(uErr.message);
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
    <div className="flex min-h-0 flex-1 flex-col">
      {error ? (
        <div
          className="shrink-0 border-b border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="shrink-0 border-b border-white/10 bg-black/55 px-3 py-2.5 backdrop-blur-md md:px-4">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between md:gap-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <div className="inline-flex flex-wrap gap-0.5 rounded-lg border border-white/12 bg-white/[0.06] p-0.5">
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
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition md:px-4 md:py-2 ${
                    m.id === activeMapId
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                  }`}
                >
                  {m.title}
                </button>
              ))}
            </div>
            <div className="inline-flex flex-wrap gap-0.5 rounded-lg border border-white/12 bg-white/[0.04] p-0.5">
              <button
                type="button"
                onClick={() => setWorkspaceView("table")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  workspaceView === "table"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                }`}
              >
                Table
              </button>
              <button
                type="button"
                onClick={() => setWorkspaceView("floor")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  workspaceView === "floor"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                }`}
              >
                Floor
              </button>
            </div>
            {activeMap.description ? (
              <p className="hidden max-w-md text-[11px] leading-snug text-muted-foreground lg:block xl:max-w-lg">
                {activeMap.description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {canEdit ? (
              <button
                type="button"
                className="rounded-md border border-white/15 bg-white/[0.08] px-3 py-1.5 text-sm font-medium text-foreground hover:bg-white/12"
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
                Add to grid cell…
              </button>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                <Link href="/auth/login?next=/warehouse" className="font-medium text-accent-gold underline-offset-4 hover:underline">
                  Sign in
                </Link>{" "}
                to add or edit. Viewing is public.
              </span>
            )}
          </div>
        </div>
        {canEdit ? (
          <p className="mt-2 border-t border-white/5 pt-2 text-[11px] leading-relaxed text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{sessionEmail}</span> —{" "}
            {workspaceView === "table"
              ? "Drag chips between grid cells or onto “Floor only” to unassign. Column A has 10 rows; B and C have 8."
              : "Click the floor for an exact spot, or use Table to assign by cell. Types: window, door, screen. Double-click zooms in."}
          </p>
        ) : null}
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
            />
          </div>
        )}

        {selectedPlacementId && (selectedCellGroup || selectedFreePlacement) ? (
          <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-50 max-h-[55vh] overflow-y-auto border-t border-white/15 bg-black/85 p-3 shadow-2xl backdrop-blur-md sm:bottom-3 sm:left-auto sm:right-3 sm:max-h-[min(70vh,520px)] sm:max-w-md sm:rounded-xl sm:border sm:p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Details</span>
              <button
                type="button"
                className="shrink-0 rounded-md border border-white/15 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-white/10 hover:text-foreground"
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
                <div className="text-xs font-semibold uppercase text-muted-foreground">
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
        ) : null}
      </div>

      {jumpPlacementTargets.length > 0 ? (
        <div className="shrink-0 border-t border-white/10 bg-black/35 px-3 py-2.5 md:px-4">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Jump to marker</p>
          <div className="flex gap-2 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch]">
            {jumpPlacementTargets.map((p) => {
              const cellPrefix =
                p.cell_column && p.cell_row != null ? `${p.cell_column}${p.cell_row} · ` : "";
              return (
                <button
                  key={`${p.id}-jump`}
                  type="button"
                  onClick={() => focusPlacement(p)}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    p.id === selectedPlacementId
                      ? "border-primary bg-primary/20 text-foreground"
                      : "border-white/12 bg-white/[0.06] text-muted-foreground hover:bg-white/10"
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
          className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="warehouse-add-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
            <h2 id="warehouse-add-title" className="text-lg font-semibold text-foreground">
              Add marker
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose window, door, or screen. Use map position for exact spots, or a grid cell for up to ten stacked
              items per cell.
            </p>
            <div className="mt-4 flex gap-2 rounded-lg border border-border bg-muted/20 p-1">
              <button
                type="button"
                onClick={() => setAddMode("map")}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                  addMode === "map" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                Map position
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddMode("cell");
                  setAddNorm(null);
                }}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                  addMode === "cell" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                Grid cell
              </button>
            </div>
            {addMode === "map" && addNorm ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Using click at ({addNorm.pos_x.toFixed(3)}, {addNorm.pos_y.toFixed(3)}) normalized.
              </p>
            ) : null}
            {addMode === "cell" ? (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="text-sm font-medium text-foreground">
                  Column
                  <select
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
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
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
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
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAddKind("window")}
                className={`rounded-lg border px-2 py-2 text-sm font-medium ${
                  addKind === "window"
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border bg-muted/30"
                }`}
              >
                Window
              </button>
              <button
                type="button"
                onClick={() => setAddKind("door")}
                className={`rounded-lg border px-2 py-2 text-sm font-medium ${
                  addKind === "door"
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border bg-muted/30"
                }`}
              >
                Door
              </button>
              <button
                type="button"
                onClick={() => setAddKind("screen")}
                className={`rounded-lg border px-2 py-2 text-sm font-medium ${
                  addKind === "screen"
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border bg-muted/30"
                }`}
              >
                Screen
              </button>
            </div>
            <label className="mt-4 block text-sm font-medium text-foreground">
              Label
              <input
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={addLabel}
                onChange={(e) => setAddLabel(e.target.value)}
                placeholder={labelPlaceholderForKind(addKind)}
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-foreground">
              Note (optional)
              <textarea
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                rows={2}
                value={addNote}
                onChange={(e) => setAddNote(e.target.value)}
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50"
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
                {saving ? "Saving…" : "Save"}
              </button>
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
            {placementKindTitle(p.kind)} · slot {p.stack_index + 1} / 10
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
