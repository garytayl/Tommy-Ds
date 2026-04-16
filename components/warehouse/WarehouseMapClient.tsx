"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MapErrorBoundary } from "@/components/MapErrorBoundary";
import { WarehouseFloorPlan, type WarehouseFloorPlanHandle } from "@/components/warehouse/WarehouseFloorPlan";
import {
  WarehouseMapInspectorSummary,
  WarehousePlacementEditDialog,
} from "@/components/warehouse/WarehouseMapInspector";
import { WarehouseCheckpointLinker } from "@/components/warehouse/WarehouseCheckpointLinker";
import { WarehouseCustomerGuide } from "@/components/warehouse/WarehouseCustomerGuide";
import { WarehousePlacementListPanel } from "@/components/warehouse/WarehousePlacementListPanel";
import { WarehouseGridTable, type WarehouseGridMoveTarget } from "@/components/warehouse/WarehouseGridTable";
import type {
  WarehouseMapRow,
  WarehousePlacementKind,
  WarehousePlacementRow,
} from "@/components/warehouse/warehouse-map-types";
import { formatCellQuery, parseCellQuery } from "@/lib/warehouse-checkpoint";
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
  const [editPlacementId, setEditPlacementId] = useState<string | null>(null);
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const searchParams = useSearchParams();
  const mapSlugParam = searchParams.get("map");
  const cellParam = searchParams.get("cell");
  const placementParam = searchParams.get("placement");
  const checkpointUrlKey = `${mapSlugParam ?? ""}|${cellParam ?? ""}|${placementParam ?? ""}`;
  const appliedCheckpointKey = useRef<string | null>(null);

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

  useEffect(() => {
    appliedCheckpointKey.current = null;
  }, [checkpointUrlKey]);

  useEffect(() => {
    if (loading || maps.length === 0 || !mapSlugParam) return;
    const m = maps.find((x) => x.slug === mapSlugParam);
    if (m && activeMapId !== m.id) setActiveMapId(m.id);
  }, [loading, maps, mapSlugParam, activeMapId]);

  useEffect(() => {
    if (loading || !placementParam || mapSlugParam) return;
    const hit = placements.find((p) => p.id === placementParam);
    if (hit && activeMapId !== hit.map_id) setActiveMapId(hit.map_id);
  }, [loading, placementParam, mapSlugParam, placements, activeMapId]);

  useEffect(() => {
    if (loading || !activeMap) return;
    const key = checkpointUrlKey;
    const hasCheckpoint = Boolean(mapSlugParam || cellParam || placementParam);
    if (!hasCheckpoint) return;
    if (mapSlugParam && activeMap.slug !== mapSlugParam) return;
    if (appliedCheckpointKey.current === key) return;

    const t = window.setTimeout(() => {
      if (placementParam) {
        const hit = placements.find((p) => p.id === placementParam && p.map_id === activeMap.id);
        if (hit) {
          setWorkspaceView("floor");
          floorPlanRef.current?.focusMarker(placementParam);
          appliedCheckpointKey.current = key;
        }
        return;
      }
      if (cellParam) {
        const parsed = parseCellQuery(cellParam);
        if (!parsed) {
          appliedCheckpointKey.current = key;
          return;
        }
        setWorkspaceView("floor");
        const { pos_x, pos_y } = cellCenterNormalized(parsed.col, parsed.row);
        floorPlanRef.current?.focusAtNormalized({ pos_x, pos_y });
        appliedCheckpointKey.current = key;
        return;
      }
      if (mapSlugParam && activeMap.slug === mapSlugParam) {
        appliedCheckpointKey.current = key;
      }
    }, 260);
    return () => window.clearTimeout(t);
  }, [loading, activeMap, checkpointUrlKey, mapSlugParam, cellParam, placementParam, placements]);

  const unknownMapSlug = useMemo(
    () => Boolean(mapSlugParam && maps.length > 0 && !maps.some((m) => m.slug === mapSlugParam)),
    [mapSlugParam, maps],
  );

  const checkpointSummary = useMemo(() => {
    const parts: string[] = [];
    if (mapSlugParam) {
      const m = maps.find((x) => x.slug === mapSlugParam);
      parts.push(m ? m.title : mapSlugParam);
    }
    if (cellParam) {
      const p = parseCellQuery(cellParam);
      parts.push(p ? `Cell ${formatCellQuery(p.col, p.row)}` : `cell=${cellParam}`);
    }
    if (placementParam) parts.push("Marker");
    return parts.join(" · ");
  }, [mapSlugParam, cellParam, placementParam, maps]);

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

  const handleInspectorSelectPlacementId = useCallback(
    (id: string) => {
      setSelectedPlacementId(id);
      if (workspaceView === "floor") {
        floorPlanRef.current?.focusMarker(id);
      }
    },
    [workspaceView],
  );

  const editPlacement = useMemo(
    () => (editPlacementId ? placementsForActive.find((p) => p.id === editPlacementId) ?? null : null),
    [editPlacementId, placementsForActive],
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
    setEditPlacementId(null);
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
    setEditPlacementId((prev) => (prev === id ? null : prev));
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
    <div
      className={`flex min-h-0 flex-1 flex-col ${mobileFullscreen ? "fixed inset-0 z-[9000] h-dvh bg-[#050508]" : ""}`}
      role={mobileFullscreen ? "dialog" : undefined}
      aria-modal={mobileFullscreen ? "true" : undefined}
      aria-label={mobileFullscreen ? "Warehouse workspace fullscreen mode" : undefined}
    >
      {error ? (
        <div
          className="shrink-0 border-b border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="hidden h-full min-h-0 w-[min(100%,320px)] shrink-0 flex-col border-white/10 bg-black/45 md:flex md:border-r">
          {jumpPlacementTargets.length > 0 ? (
            <WarehousePlacementListPanel
              className="h-full px-3 py-3"
              placements={jumpPlacementTargets}
              selectedPlacementId={selectedPlacementId}
              onSelect={(p) => {
                focusPlacement(p);
              }}
            />
          ) : (
            <div className="p-4 text-xs text-muted-foreground">No markers on this map yet.</div>
          )}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="shrink-0 border-b border-white/10 bg-black/55 backdrop-blur-md">
            <WarehouseCustomerGuide
              supabase={supabase}
              onFocusInventoryMap={() => {
                const inv = maps.find((m) => m.slug === "upper-inventory");
                if (inv) {
                  setActiveMapId(inv.id);
                  setSelectedPlacementId(null);
                }
                setWorkspaceView("floor");
              }}
            />
            {mapSlugParam || cellParam || placementParam ? (
              <div
                className="mx-3 mt-2 rounded-lg border border-accent-gold/35 bg-accent-gold/10 px-3 py-2 text-[12px] text-foreground md:mx-4"
                role="status"
              >
                <span className="font-semibold text-accent-gold">Checkpoint link</span>
                <span className="text-foreground/90"> — {checkpointSummary}</span>
                {unknownMapSlug ? (
                  <span className="mt-1 block text-destructive-foreground">
                    Unknown map slug. Check the URL or pick a map below.
                  </span>
                ) : null}
              </div>
            ) : null}
            {canEdit && maps.length > 0 ? (
              <div className="px-3 pb-1 pt-2 md:px-4">
                <WarehouseCheckpointLinker maps={maps} activeMapSlug={activeMap?.slug ?? null} />
              </div>
            ) : null}
            <div className="flex flex-col gap-2.5 px-3 py-2.5 md:flex-row md:items-center md:justify-between md:gap-4 md:px-4">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-foreground hover:bg-white/12 md:hidden"
                  onClick={() => setMobileListOpen(true)}
                >
                  Browse list
                </button>
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
                <button
                  type="button"
                  className="rounded-md border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-foreground hover:bg-white/12 md:hidden"
                  onClick={() => setMobileFullscreen((v) => !v)}
                >
                  {mobileFullscreen ? "Exit full screen" : "Canvas mode"}
                </button>
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
                    <Link
                      href="/auth/login?next=/warehouse"
                      className="font-medium text-accent-gold underline-offset-4 hover:underline"
                    >
                      Sign in
                    </Link>{" "}
                    to add or edit. Viewing is public.
                  </span>
                )}
              </div>
            </div>
            {canEdit && !mobileFullscreen ? (
              <details className="mt-2 border-t border-white/5 px-3 pb-2 pt-2 text-[11px] leading-relaxed text-muted-foreground md:px-4">
                <summary className="cursor-pointer font-medium text-foreground/90">How to use this map</summary>
                <p className="mt-1.5">
                  Signed in as <span className="font-medium text-foreground">{sessionEmail}</span>.{" "}
                  {workspaceView === "table"
                    ? "On mobile, Tap move works best: tap a chip, then tap a cell or Floor only. You can also drag chips between cells. Column A has 10 rows; B and C have 8."
                    : "Tap or click a marker for details, then Edit to change text. Add by tapping the floor or from the grid. Double-tap or double-click to zoom the floor plan."}
                </p>
              </details>
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
              <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-50 max-h-[55vh] overflow-y-auto border-t border-white/15 bg-black/90 p-3 shadow-2xl backdrop-blur-md sm:bottom-3 sm:left-auto sm:right-3 sm:max-h-[min(70vh,560px)] sm:max-w-md sm:rounded-xl sm:border sm:p-4">
                <WarehouseMapInspectorSummary
                  cellGroup={
                    selectedCellGroup
                      ? { label: selectedCellGroup[0], items: selectedCellGroup[1] }
                      : null
                  }
                  freePlacement={selectedFreePlacement}
                  selectedPlacementId={selectedPlacementId}
                  onSelectPlacementId={handleInspectorSelectPlacementId}
                  onClose={() => setSelectedPlacementId(null)}
                  canEdit={canEdit}
                  onRequestEdit={(id) => setEditPlacementId(id)}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {mobileListOpen ? (
        <div className="fixed inset-0 z-[9998] flex flex-col justify-end bg-black/50 md:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close list"
            onClick={() => setMobileListOpen(false)}
          />
          <div
            className="relative max-h-[78vh] rounded-t-2xl border border-white/10 bg-[#0a0a0f] p-3 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="warehouse-mobile-list-title"
          >
            <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-white/20" />
            <h2 id="warehouse-mobile-list-title" className="sr-only">
              Browse markers
            </h2>
            {jumpPlacementTargets.length > 0 ? (
              <WarehousePlacementListPanel
                className="max-h-[min(65vh,520px)]"
                placements={jumpPlacementTargets}
                selectedPlacementId={selectedPlacementId}
                onSelect={(p) => {
                  focusPlacement(p);
                  setMobileListOpen(false);
                }}
              />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No markers on this map yet.</p>
            )}
          </div>
        </div>
      ) : null}

      <WarehousePlacementEditDialog
        open={editPlacementId !== null}
        placement={editPlacement}
        saving={saving}
        onClose={() => setEditPlacementId(null)}
        onSave={(id, label, note) => void updatePlacementLabel(id, label, note)}
        onDelete={(id) => void deletePlacement(id)}
      />

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
              Choose window, door, or screen. Use map position for exact spots, or a grid cell for stacked items.
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
