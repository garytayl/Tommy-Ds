"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ImageOverlay,
  MapContainer,
  Marker,
  Popup,
  Tooltip,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";

import { MapErrorBoundary } from "@/components/MapErrorBoundary";
import {
  cellCenterNormalized,
  cellKey,
  maxRowForColumn,
  type WarehouseColumn,
} from "@/lib/warehouse-grid";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type WarehouseMapRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  image_path: string;
  width_px: number;
  height_px: number;
  sort_order: number;
};

export type WarehousePlacementKind = "window" | "door" | "screen";

type WarehousePlacementRow = {
  id: string;
  map_id: string;
  kind: WarehousePlacementKind;
  label: string;
  pos_x: number;
  pos_y: number;
  note: string | null;
  cell_column: string | null;
  cell_row: number | null;
  stack_index: number;
};

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

function placementIcon(
  kind: WarehousePlacementKind,
  opts?: {
    selected?: boolean;
    compact?: boolean;
  },
) {
  const selected = Boolean(opts?.selected);
  const compact = Boolean(opts?.compact);
  const letter = placementKindLetter(kind);
  const bg = kind === "window" ? "#1d4ed8" : kind === "door" ? "#b45309" : "#0d9488";
  const size = compact ? 30 : 34;
  const ring = selected ? "0 0 0 3px rgba(255,255,255,.95),0 0 0 6px rgba(29,78,216,.7)" : "0 2px 10px rgba(0,0,0,.5)";
  return L.divIcon({
    className: "warehouse-leaflet-icon",
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${bg};color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;box-shadow:${ring};border:2px solid rgba(255,255,255,.35);font-family:system-ui,sans-serif">${letter}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function cellGroupIcon(cellLabel: string, count: number, selected?: boolean) {
  const ring = selected
    ? "0 0 0 3px rgba(255,255,255,.95),0 0 0 6px rgba(29,78,216,.7)"
    : "0 2px 12px rgba(0,0,0,.55)";
  return L.divIcon({
    className: "warehouse-leaflet-icon",
    html: `<div style="min-width:40px;min-height:40px;border-radius:10px;background:#0f172a;color:#fff;font-weight:700;font-size:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:${ring};border:2px solid rgba(255,255,255,.28);font-family:system-ui,sans-serif;padding:3px 6px;line-height:1.1"><span style="font-size:10px;font-weight:600;opacity:.88">${cellLabel}</span><span>${count}</span></div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

/**
 * Fits the map once per warehouse map identity — not on every data refresh (which would reset pan/zoom).
 */
function FitBoundsWhenMapChanges({
  bounds,
  mapFitKey,
}: {
  bounds: L.LatLngBoundsExpression;
  mapFitKey: string;
}) {
  const map = useMap();
  const lastKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastKeyRef.current === mapFitKey) return;
    lastKeyRef.current = mapFitKey;
    map.fitBounds(bounds, { animate: false, padding: [12, 12] });
  }, [map, bounds, mapFitKey]);
  return null;
}

function MapInstanceBridge({ onMapReady }: { onMapReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);
  return null;
}

function MapClickHandler({
  enabled,
  onClick,
}: {
  enabled: boolean;
  onClick: (latlng: L.LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      if (enabled) onClick(e.latlng);
    },
  });
  return null;
}

function latLngToNorm(latlng: L.LatLng, width: number, height: number) {
  const pos_x = latlng.lng / width;
  const pos_y = 1 - latlng.lat / height;
  return {
    pos_x: Math.min(1, Math.max(0, pos_x)),
    pos_y: Math.min(1, Math.max(0, pos_y)),
  };
}

function normToLatLng(pos_x: number, pos_y: number, width: number, height: number): L.LatLngTuple {
  const lat = (1 - pos_y) * height;
  const lng = pos_x * width;
  return [lat, lng];
}

function PlacementHoverDetails({ p }: { p: WarehousePlacementRow }) {
  const title = placementKindTitle(p.kind);
  const label = p.label?.trim() || "—";
  const note = p.note?.trim();
  return (
    <div className="warehouse-tooltip-inner">
      <div className="warehouse-tooltip-kind">{title}</div>
      <div className="warehouse-tooltip-label">{label}</div>
      {note ? <div className="warehouse-tooltip-note">{note}</div> : null}
    </div>
  );
}

function CellHoverDetails({ cellLabel, items }: { cellLabel: string; items: WarehousePlacementRow[] }) {
  return (
    <div className="warehouse-tooltip-inner max-h-48 overflow-y-auto pr-1 text-left">
      <div className="warehouse-tooltip-kind">Cell {cellLabel}</div>
      <ul className="mt-1 list-inside list-disc space-y-1 text-[11px] text-card-foreground">
        {items.map((p) => (
          <li key={p.id}>
            <span className="font-semibold">{placementKindLetter(p.kind)}</span> — {p.label?.trim() || "—"}
            {p.note?.trim() ? <span className="text-muted-foreground"> ({p.note.trim()})</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
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
  /** `map` = exact coordinates from a map click; `cell` = stacked in a grid cell (up to 10). */
  const [addMode, setAddMode] = useState<"map" | "cell">("map");
  const [addNorm, setAddNorm] = useState<{ pos_x: number; pos_y: number } | null>(null);
  const [addCol, setAddCol] = useState<WarehouseColumn>("A");
  const [addRow, setAddRow] = useState(1);
  const [addKind, setAddKind] = useState<WarehousePlacementKind>("window");
  const [addLabel, setAddLabel] = useState("");
  const [addNote, setAddNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileNavEnabled, setMobileNavEnabled] = useState(true);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const markerRefs = useRef<Record<string, L.Marker | null>>({});

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
    (async () => {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled) {
        setSessionEmail(session?.user?.email ?? null);
      }
      await loadAll();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, loadAll]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 900px), (pointer: coarse)");
    const update = () => setIsMobile(media.matches);
    update();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    const max = maxRowForColumn(addCol);
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

  /** All items for “Jump to marker” chips (free + every cell stack entry). */
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

  const bounds: L.LatLngBoundsExpression | null = useMemo(() => {
    if (!activeMap) return null;
    return [
      [0, 0],
      [activeMap.height_px, activeMap.width_px],
    ];
  }, [activeMap?.height_px, activeMap?.width_px]);

  /** Stable while the same map is selected — avoids remount/fit when Supabase returns a new object for the same row. */
  const mapFitKey = activeMap ? `${activeMap.id}-${activeMap.width_px}-${activeMap.height_px}` : "";

  const mapCenter = useMemo<L.LatLngTuple>(
    () => (activeMap ? [activeMap.height_px / 2, activeMap.width_px / 2] : [0, 0]),
    [activeMap?.height_px, activeMap?.width_px],
  );

  const fitToMap = useCallback(() => {
    if (!mapInstance || !bounds) return;
    mapInstance.fitBounds(bounds, { animate: true, padding: isMobile ? [36, 24] : [16, 16] });
  }, [mapInstance, bounds, isMobile]);

  const focusPlacement = useCallback(
    (placement: WarehousePlacementRow) => {
      if (!activeMap || !mapInstance) return;
      const target = normToLatLng(placement.pos_x, placement.pos_y, activeMap.width_px, activeMap.height_px);
      const minFocusZoom = isMobile ? 1.25 : 0.75;
      const nextZoom = Math.max(mapInstance.getZoom(), minFocusZoom);
      mapInstance.flyTo(target, nextZoom, { animate: true, duration: 0.35 });
      setSelectedPlacementId(placement.id);
      markerRefs.current[placement.id]?.openPopup();
    },
    [activeMap, isMobile, mapInstance],
  );

  const imageUrl = activeMap
    ? typeof window !== "undefined"
      ? new URL(activeMap.image_path, window.location.origin).href
      : activeMap.image_path
    : "";
  const touchZoomBehavior: boolean | "center" = isMobile ? (mobileNavEnabled ? "center" : false) : true;

  async function onMapClick(latlng: L.LatLng) {
    if (!activeMap || !canEdit) return;
    const { pos_x, pos_y } = latLngToNorm(latlng, activeMap.width_px, activeMap.height_px);
    setAddMode("map");
    setAddNorm({ pos_x, pos_y });
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
    await loadAll();
  }

  async function onMarkerDragEnd(id: string, latlng: L.LatLng, isCell: boolean) {
    if (!activeMap || isCell) return;
    const { pos_x, pos_y } = latLngToNorm(latlng, activeMap.width_px, activeMap.height_px);
    const { error: uErr } = await supabase
      .from("warehouse_map_placements")
      .update({ pos_x, pos_y })
      .eq("id", id);
    if (uErr) setError(uErr.message);
    else await loadAll();
  }

  const mapFallback = (
    <div className="flex h-full min-h-[200px] items-center justify-center bg-[#08080c] p-6 text-sm text-muted-foreground">
      Map could not be loaded.
    </div>
  );

  if (loading && maps.length === 0) {
    return (
      <div className="flex min-h-[min(40dvh,360px)] flex-1 items-center justify-center bg-[#050508] text-muted-foreground">
        Loading warehouse maps…
      </div>
    );
  }

  if (!activeMap || !bounds) {
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
            {activeMap.description ? (
              <p className="hidden max-w-md text-[11px] leading-snug text-muted-foreground lg:block xl:max-w-lg">
                {activeMap.description}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            {isMobile ? (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] text-muted-foreground">
                  {mobileNavEnabled ? "Pan & pinch on" : "Scroll mode — "}
                </p>
                <button
                  type="button"
                  className="rounded-md border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-foreground"
                  onClick={() => setMobileNavEnabled((v) => !v)}
                >
                  {mobileNavEnabled ? "Scroll page" : "Enable map"}
                </button>
              </div>
            ) : null}
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
            Signed in as <span className="font-medium text-foreground">{sessionEmail}</span> — click the floor for an
            exact spot, or add up to ten items per grid cell (A: 10 rows; B/C: 8). Types: window, door, screen. Cell pins
            show a count; hover for the list.
          </p>
        ) : null}
      </div>

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 z-0 min-h-[240px]">
          <MapErrorBoundary fallback={mapFallback}>
            <MapContainer
              key={`warehouse-floor-${activeMap.id}`}
              className="warehouse-map-canvas z-0 !h-full !w-full"
              crs={L.CRS.Simple}
              center={mapCenter}
              zoom={0}
              minZoom={-4}
              maxZoom={8}
              zoomSnap={0.25}
              wheelPxPerZoomLevel={48}
              inertia
              inertiaDeceleration={3400}
              inertiaMaxSpeed={1800}
              style={{ height: "100%", width: "100%", background: "#07070a" }}
              attributionControl={false}
              scrollWheelZoom={!isMobile}
              doubleClickZoom={!isMobile}
              boxZoom={!isMobile}
              dragging={isMobile ? mobileNavEnabled : true}
              touchZoom={touchZoomBehavior}
              keyboard={!isMobile}
            >
              {!isMobile ? <ZoomControl position="topright" /> : null}
              <MapInstanceBridge onMapReady={setMapInstance} />
              <FitBoundsWhenMapChanges bounds={bounds} mapFitKey={mapFitKey} />
              <ImageOverlay url={imageUrl} bounds={bounds} />
              <MapClickHandler enabled={canEdit && !addOpen} onClick={onMapClick} />
              {freePlacements.map((p) => {
                const position = normToLatLng(
                  p.pos_x,
                  p.pos_y,
                  activeMap.width_px,
                  activeMap.height_px,
                );
                return (
                  <Marker
                    key={p.id}
                    ref={(marker) => {
                      markerRefs.current[p.id] = marker;
                    }}
                    position={position}
                    icon={placementIcon(p.kind, {
                      selected: p.id === selectedPlacementId,
                      compact: isMobile,
                    })}
                    draggable={canEdit && (!isMobile || mobileNavEnabled)}
                    eventHandlers={{
                      click: () => {
                        setSelectedPlacementId(p.id);
                      },
                      dragend: (e) => {
                        const m = e.target;
                        if (!m || typeof (m as L.Marker).getLatLng !== "function") return;
                        void onMarkerDragEnd(p.id, (m as L.Marker).getLatLng(), false);
                      },
                    }}
                  >
                    {!isMobile ? (
                      <Tooltip
                        direction="top"
                        offset={L.point(0, -22)}
                        opacity={1}
                        sticky
                        className="warehouse-tooltip"
                      >
                        <PlacementHoverDetails p={p} />
                      </Tooltip>
                    ) : null}
                    <Popup className="warehouse-popup">
                      <div className="min-w-[200px] space-y-2 p-1 text-foreground">
                        <div className="text-xs font-semibold uppercase text-muted-foreground">
                          {placementKindTitle(p.kind)}
                        </div>
                        {canEdit ? (
                          <MarkerEditForm
                            key={p.id}
                            initialLabel={p.label}
                            initialNote={p.note ?? ""}
                            saving={saving}
                            onSave={(label, note) => updatePlacementLabel(p.id, label, note)}
                            onDelete={() => deletePlacement(p.id)}
                          />
                        ) : (
                          <>
                            <p className="text-sm font-medium">{p.label || "—"}</p>
                            {p.note ? <p className="text-xs text-muted-foreground">{p.note}</p> : null}
                          </>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              {cellGroupList.map(([label, items]) => {
                const head = items[0];
                const position = normToLatLng(
                  head.pos_x,
                  head.pos_y,
                  activeMap.width_px,
                  activeMap.height_px,
                );
                const cellSelected = items.some((it) => it.id === selectedPlacementId);
                return (
                  <Marker
                    key={`cell-${label}`}
                    ref={(marker) => {
                      for (const pl of items) {
                        if (marker) markerRefs.current[pl.id] = marker;
                        else delete markerRefs.current[pl.id];
                      }
                    }}
                    position={position}
                    icon={cellGroupIcon(label, items.length, cellSelected)}
                    draggable={false}
                    eventHandlers={{
                      click: () => {
                        setSelectedPlacementId(items[0]?.id ?? null);
                      },
                    }}
                  >
                    <Tooltip
                      direction="top"
                      offset={L.point(0, -26)}
                      opacity={1}
                      sticky
                      className="warehouse-tooltip"
                    >
                      <CellHoverDetails cellLabel={label} items={items} />
                    </Tooltip>
                    <Popup className="warehouse-popup">
                      <CellGroupPopupBody
                        cellLabel={label}
                        items={items}
                        canEdit={canEdit}
                        saving={saving}
                        onSave={(id, lbl, note) => updatePlacementLabel(id, lbl, note)}
                        onDelete={(id) => deletePlacement(id)}
                      />
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </MapErrorBoundary>
        </div>
        {isMobile ? (
          <div className="pointer-events-none absolute bottom-3 right-3 z-[900] flex flex-col gap-2">
            <button
              type="button"
              className="pointer-events-auto h-11 w-11 rounded-full border border-white/15 bg-black/65 text-lg font-semibold text-foreground shadow-lg backdrop-blur-sm"
              onClick={() => mapInstance?.zoomIn(0.75)}
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              className="pointer-events-auto h-11 w-11 rounded-full border border-white/15 bg-black/65 text-lg font-semibold text-foreground shadow-lg backdrop-blur-sm"
              onClick={() => mapInstance?.zoomOut(0.75)}
              aria-label="Zoom out"
            >
              −
            </button>
            <button
              type="button"
              className="pointer-events-auto rounded-full border border-white/15 bg-black/65 px-3 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur-sm"
              onClick={fitToMap}
            >
              Fit
            </button>
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
