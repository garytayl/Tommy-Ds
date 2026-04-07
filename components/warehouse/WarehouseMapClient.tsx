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

type WarehousePlacementRow = {
  id: string;
  map_id: string;
  kind: "window" | "door";
  label: string;
  pos_x: number;
  pos_y: number;
  note: string | null;
};

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function placementIcon(
  kind: "window" | "door",
  opts?: {
    selected?: boolean;
    compact?: boolean;
  },
) {
  const selected = Boolean(opts?.selected);
  const compact = Boolean(opts?.compact);
  const letter = kind === "window" ? "W" : "D";
  const bg = kind === "window" ? "#1d4ed8" : "#b45309";
  const size = compact ? 30 : 34;
  const ring = selected ? "0 0 0 3px rgba(255,255,255,.95),0 0 0 6px rgba(29,78,216,.7)" : "0 2px 10px rgba(0,0,0,.5)";
  return L.divIcon({
    className: "warehouse-leaflet-icon",
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${bg};color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;box-shadow:${ring};border:2px solid rgba(255,255,255,.35);font-family:system-ui,sans-serif">${letter}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
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
  const title = p.kind === "window" ? "Window" : "Door";
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

export function WarehouseMapClient() {
  const [maps, setMaps] = useState<WarehouseMapRow[]>([]);
  const [placements, setPlacements] = useState<WarehousePlacementRow[]>([]);
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addNorm, setAddNorm] = useState<{ pos_x: number; pos_y: number } | null>(null);
  const [addKind, setAddKind] = useState<"window" | "door">("window");
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
      .select("id, map_id, kind, label, pos_x, pos_y, note")
      .in("map_id", ids);
    if (pErr) {
      setError(pErr.message);
      return;
    }
    setPlacements(
      (placeRows ?? []).map((r) => ({
        ...r,
        pos_x: num(r.pos_x),
        pos_y: num(r.pos_y),
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

  const bounds: L.LatLngBoundsExpression | null = useMemo(() => {
    if (!activeMap) return null;
    return [
      [0, 0],
      [activeMap.height_px, activeMap.width_px],
    ];
  }, [activeMap]);

  /** Stable while the same map is selected — avoids remount/fit when Supabase returns a new object for the same row. */
  const mapFitKey = activeMap ? `${activeMap.id}-${activeMap.width_px}-${activeMap.height_px}` : "";

  const mapCenter = useMemo<L.LatLngTuple>(
    () => (activeMap ? [activeMap.height_px / 2, activeMap.width_px / 2] : [0, 0]),
    [activeMap],
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
    setAddNorm({ pos_x, pos_y });
    setAddKind("window");
    setAddLabel("");
    setAddNote("");
    setAddOpen(true);
  }

  async function saveNewPlacement() {
    if (!activeMap || !addNorm) return;
    setSaving(true);
    setError(null);
    const { error: insErr } = await supabase.from("warehouse_map_placements").insert({
      map_id: activeMap.id,
      kind: addKind,
      label: addLabel.trim() || (addKind === "window" ? "Window" : "Door"),
      pos_x: addNorm.pos_x,
      pos_y: addNorm.pos_y,
      note: addNote.trim() || null,
    });
    setSaving(false);
    if (insErr) {
      setError(insErr.message);
      return;
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

  async function onMarkerDragEnd(id: string, latlng: L.LatLng) {
    if (!activeMap) return;
    const { pos_x, pos_y } = latLngToNorm(latlng, activeMap.width_px, activeMap.height_px);
    const { error: uErr } = await supabase
      .from("warehouse_map_placements")
      .update({ pos_x, pos_y })
      .eq("id", id);
    if (uErr) setError(uErr.message);
    else await loadAll();
  }

  const mapFallback = (
    <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-border bg-muted/30 p-6 text-sm text-muted-foreground">
      Map could not be loaded.
    </div>
  );

  if (loading && maps.length === 0) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-border bg-card/40 p-8 text-muted-foreground">
        Loading warehouse maps…
      </div>
    );
  }

  if (!activeMap || !bounds) {
    return (
      <div className="rounded-xl border border-border bg-card/40 p-6 text-sm text-muted-foreground">
        No floor maps are configured yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex flex-wrap gap-2 rounded-xl border border-border bg-card/50 p-1">
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
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                m.id === activeMapId
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {m.title}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground sm:max-w-sm sm:text-right">
          {activeMap.description}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {canEdit ? (
          <span>
            Signed in as <span className="font-medium text-foreground">{sessionEmail}</span> — click
            the floor to add a window or door. Drag markers to move them.
          </span>
        ) : (
          <span>
            <Link href="/auth/login?next=/warehouse" className="font-medium text-accent-gold underline-offset-4 hover:underline">
              Sign in
            </Link>{" "}
            to add or edit markers. Everyone can view this page.
          </span>
        )}
      </div>

      {isMobile ? (
        <div className="rounded-xl border border-border bg-card/40 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {mobileNavEnabled
                ? "Map navigation is on. Drag to pan and pinch to zoom."
                : "Scroll mode is on. Turn map navigation on to pan/zoom."}
            </p>
            <button
              type="button"
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground"
              onClick={() => setMobileNavEnabled((v) => !v)}
            >
              {mobileNavEnabled ? "Scroll page" : "Enable map"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-xl border border-border bg-card/30 shadow-sm">
        <div className={isMobile ? "h-[72dvh] min-h-[430px] w-full" : "h-[min(72vh,560px)] min-h-[320px] w-full"}>
          <MapErrorBoundary fallback={mapFallback}>
            <MapContainer
              key={`warehouse-floor-${activeMap.id}`}
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
              style={{ height: "100%", width: "100%", background: "#0a0a0a" }}
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
              {placementsForActive.map((p) => {
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
                        void onMarkerDragEnd(p.id, (m as L.Marker).getLatLng());
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
                          {p.kind === "window" ? "Window" : "Door"}
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
            </MapContainer>
          </MapErrorBoundary>
        </div>
        {isMobile ? (
          <div className="pointer-events-none absolute bottom-3 right-3 z-[900] flex flex-col gap-2">
            <button
              type="button"
              className="pointer-events-auto h-11 w-11 rounded-full border border-border bg-card text-lg font-semibold text-foreground shadow-lg"
              onClick={() => mapInstance?.zoomIn(0.75)}
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              className="pointer-events-auto h-11 w-11 rounded-full border border-border bg-card text-lg font-semibold text-foreground shadow-lg"
              onClick={() => mapInstance?.zoomOut(0.75)}
              aria-label="Zoom out"
            >
              −
            </button>
            <button
              type="button"
              className="pointer-events-auto rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-lg"
              onClick={fitToMap}
            >
              Fit
            </button>
          </div>
        ) : null}
      </div>

      {placementsForActive.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-border bg-card/40 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Jump to marker</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {placementsForActive.map((p) => (
              <button
                key={`${p.id}-jump`}
                type="button"
                onClick={() => focusPlacement(p)}
                className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  p.id === selectedPlacementId
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {p.kind === "window" ? "W" : "D"} · {p.label?.trim() || "Untitled"}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {addOpen && addNorm ? (
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
            <p className="mt-1 text-sm text-muted-foreground">Choose type and label for this spot.</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setAddKind("window")}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
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
                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                  addKind === "door"
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border bg-muted/30"
                }`}
              >
                Door
              </button>
            </div>
            <label className="mt-4 block text-sm font-medium text-foreground">
              Label
              <input
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={addLabel}
                onChange={(e) => setAddLabel(e.target.value)}
                placeholder={addKind === "window" ? "e.g. North wall row" : "e.g. Loading bay"}
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
                disabled={saving}
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
