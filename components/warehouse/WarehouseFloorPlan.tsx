"use client";

import {
  getCenterPosition,
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch";
import type { ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import type { WarehouseMapRow, WarehousePlacementRow } from "./warehouse-map-types";

function kindLetter(kind: WarehousePlacementRow["kind"]): string {
  if (kind === "window") return "W";
  if (kind === "door") return "D";
  return "S";
}

function kindTitle(kind: WarehousePlacementRow["kind"]): string {
  if (kind === "window") return "Window";
  if (kind === "door") return "Door";
  return "Screen";
}

function PlacementHoverDetails({ p }: { p: WarehousePlacementRow }) {
  const label = p.label?.trim() || "—";
  const note = p.note?.trim();
  return (
    <div className="warehouse-floor-tooltip-inner">
      <div className="warehouse-floor-tooltip-kind">{kindTitle(p.kind)}</div>
      <div className="warehouse-floor-tooltip-label">{label}</div>
      {note ? <div className="warehouse-floor-tooltip-note">{note}</div> : null}
    </div>
  );
}

function CellHoverDetails({ cellLabel, items }: { cellLabel: string; items: WarehousePlacementRow[] }) {
  return (
    <div className="warehouse-floor-tooltip-inner max-h-48 overflow-y-auto pr-1 text-left">
      <div className="warehouse-floor-tooltip-kind">Cell {cellLabel}</div>
      <ul className="mt-1 list-inside list-disc space-y-1 text-[11px] text-card-foreground">
        {items.map((p) => (
          <li key={p.id}>
            <span className="font-semibold">{kindLetter(p.kind)}</span> — {p.label?.trim() || "—"}
            {p.note?.trim() ? <span className="text-muted-foreground"> ({p.note.trim()})</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export type WarehouseFloorPlanHandle = {
  fit: () => void;
  focusMarker: (placementId: string) => void;
};

type Props = {
  activeMap: WarehouseMapRow;
  imageUrl: string;
  freePlacements: WarehousePlacementRow[];
  cellGroupList: [string, WarehousePlacementRow[]][];
  canEdit: boolean;
  selectedPlacementId: string | null;
  onSelectPlacement: (id: string | null) => void;
  onFloorTap: (norm: { pos_x: number; pos_y: number }) => void;
  onFreeMarkerDragEnd: (id: string, pos_x: number, pos_y: number) => void;
  /** Remount / refit when this changes (e.g. map switch). */
  mapFitKey: string;
};

function normFromClientOnContent(
  clientX: number,
  clientY: number,
  contentEl: HTMLElement,
): { pos_x: number; pos_y: number } {
  const rect = contentEl.getBoundingClientRect();
  const pos_x = (clientX - rect.left) / rect.width;
  const pos_y = (clientY - rect.top) / rect.height;
  return {
    pos_x: Math.min(1, Math.max(0, pos_x)),
    pos_y: Math.min(1, Math.max(0, pos_y)),
  };
}

function Pin({
  kind,
  selected,
  compact,
  className,
}: {
  kind: WarehousePlacementRow["kind"];
  selected?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const letter = kindLetter(kind);
  const bg = kind === "window" ? "#1d4ed8" : kind === "door" ? "#b45309" : "#0d9488";
  const size = compact ? 30 : 34;
  const ring = selected
    ? "0 0 0 3px rgba(255,255,255,.95),0 0 0 6px rgba(29,78,216,.7)"
    : "0 2px 10px rgba(0,0,0,.5)";
  return (
    <div
      className={`warehouse-pin flex items-center justify-center rounded-full border-2 border-white/35 font-sans text-[13px] font-bold text-white ${className ?? ""}`}
      style={{
        width: size,
        height: size,
        background: bg,
        boxShadow: ring,
      }}
    >
      {letter}
    </div>
  );
}

function CellPin({ cellLabel, count, selected }: { cellLabel: string; count: number; selected?: boolean }) {
  const ring = selected
    ? "0 0 0 3px rgba(255,255,255,.95),0 0 0 6px rgba(29,78,216,.7)"
    : "0 2px 12px rgba(0,0,0,.55)";
  return (
    <div
      className="warehouse-pin flex min-h-[40px] min-w-[40px] flex-col items-center justify-center rounded-[10px] border-2 border-white/28 px-1.5 py-0.5 font-sans leading-tight text-white"
      style={{
        background: "#0f172a",
        boxShadow: ring,
      }}
    >
      <span className="text-[10px] font-semibold opacity-90">{cellLabel}</span>
      <span className="text-sm font-bold">{count}</span>
    </div>
  );
}

export const WarehouseFloorPlan = forwardRef<WarehouseFloorPlanHandle, Props>(function WarehouseFloorPlan(
  {
    activeMap,
    imageUrl,
    freePlacements,
    cellGroupList,
    canEdit,
    selectedPlacementId,
    onSelectPlacement,
    onFloorTap,
    onFreeMarkerDragEnd,
    mapFitKey,
  },
  ref,
) {
  const transformRef = useRef<ReactZoomPanPinchContentRef | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const markerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const pointerDownRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{ id: string; pos_x: number; pos_y: number } | null>(null);

  const fit = useCallback(() => {
    const api = transformRef.current;
    const wrap = api?.instance?.wrapperComponent;
    const content = api?.instance?.contentComponent;
    if (!api || !wrap || !content) return;
    const scale = Math.min(wrap.clientWidth / activeMap.width_px, wrap.clientHeight / activeMap.height_px) * 0.94;
    const pos = getCenterPosition(scale, wrap, content);
    api.setTransform(pos.positionX, pos.positionY, scale, 220, "easeOut");
  }, [activeMap.height_px, activeMap.width_px]);

  useImperativeHandle(
    ref,
    () => ({
      fit,
      focusMarker: (placementId: string) => {
        const api = transformRef.current;
        const el = markerRefs.current[placementId];
        if (!api || !el) return;
        const minZoom = 1.15;
        const nextScale = Math.max(api.state.scale, minZoom);
        api.zoomToElement(el, nextScale, 380, "easeOut");
        onSelectPlacement(placementId);
      },
    }),
    [fit, onSelectPlacement],
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => fit());
    return () => cancelAnimationFrame(id);
  }, [mapFitKey, fit]);

  useEffect(() => {
    const api = transformRef.current;
    const wrap = api?.instance?.wrapperComponent;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => fit());
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [mapFitKey, fit]);

  const onInit = useCallback(
    (api: ReactZoomPanPinchContentRef) => {
      transformRef.current = api;
      requestAnimationFrame(() => fit());
    },
    [fit],
  );

  useEffect(() => {
    if (!draggingId || !contentRef.current) return;
    const content = contentRef.current;
    const onMove = (e: PointerEvent) => {
      const { pos_x, pos_y } = normFromClientOnContent(e.clientX, e.clientY, content);
      setDragPreview({ id: draggingId, pos_x, pos_y });
    };
    const onUp = (e: PointerEvent) => {
      const { pos_x, pos_y } = normFromClientOnContent(e.clientX, e.clientY, content);
      const id = draggingId;
      setDraggingId(null);
      setDragPreview(null);
      onFreeMarkerDragEnd(id, pos_x, pos_y);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, [draggingId, onFreeMarkerDragEnd]);

  const effectiveFree = useMemo(
    () =>
      freePlacements.map((p) =>
        dragPreview && dragPreview.id === p.id ? { ...p, pos_x: dragPreview.pos_x, pos_y: dragPreview.pos_y } : p,
      ),
    [freePlacements, dragPreview],
  );

  function handleFloorPointerDown(e: React.PointerEvent) {
    if (!canEdit) return;
    if ((e.target as HTMLElement).closest(".warehouse-pin")) return;
    pointerDownRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  }

  function handleFloorPointerUp(e: React.PointerEvent) {
    if (!canEdit || !contentRef.current) return;
    if ((e.target as HTMLElement).closest(".warehouse-pin")) return;
    const start = pointerDownRef.current;
    pointerDownRef.current = null;
    if (!start) return;
    const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    if (dist > 10 || Date.now() - start.t > 600) return;
    const { pos_x, pos_y } = normFromClientOnContent(e.clientX, e.clientY, contentRef.current);
    onFloorTap({ pos_x, pos_y });
  }

  function startDragFreeMarker(id: string, e: React.PointerEvent) {
    if (!canEdit) return;
    e.stopPropagation();
    e.preventDefault();
    setDraggingId(id);
    const p = freePlacements.find((x) => x.id === id);
    if (p) setDragPreview({ id, pos_x: p.pos_x, pos_y: p.pos_y });
  }

  const w = activeMap.width_px;
  const h = activeMap.height_px;

  return (
    <div className="relative h-full w-full select-none">
      <TransformWrapper
        key={mapFitKey}
        ref={transformRef}
        initialScale={1}
        minScale={0.12}
        maxScale={8}
        limitToBounds
        centerZoomedOut
        smooth
        wheel={{ step: 0.14, wheelDisabled: false }}
        panning={{
          velocityDisabled: false,
          excluded: ["warehouse-pin"],
        }}
        pinch={{ step: 4, disabled: false }}
        doubleClick={{ mode: "zoomIn", step: 0.55, animationTime: 180 }}
        velocityAnimation={{
          disabled: false,
          sensitivityTouch: 1.35,
          sensitivityMouse: 1.1,
          inertia: 0.88,
        }}
        onInit={onInit}
      >
        {(utils) => (
          <>
            <TransformComponent
              wrapperClass="!h-full !w-full"
              wrapperStyle={{ width: "100%", height: "100%", overflow: "hidden", touchAction: "none" }}
              contentClass="flex items-center justify-center"
            >
              <div
                ref={contentRef}
                className="relative bg-[#07070a]"
                style={{ width: w, height: h }}
                onPointerDown={handleFloorPointerDown}
                onPointerUp={handleFloorPointerUp}
                onPointerCancel={() => {
                  pointerDownRef.current = null;
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt=""
                  width={w}
                  height={h}
                  className="pointer-events-none block h-full w-full object-fill"
                  draggable={false}
                />

                {effectiveFree.map((p) => {
                  const selected = p.id === selectedPlacementId;
                  return (
                    <div
                      key={p.id}
                      ref={(el) => {
                        markerRefs.current[p.id] = el;
                      }}
                      className={`warehouse-pin absolute z-20 -translate-x-1/2 -translate-y-1/2 ${canEdit ? "touch-none cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
                      style={{ left: `${p.pos_x * 100}%`, top: `${p.pos_y * 100}%` }}
                      onPointerDown={canEdit ? (e) => startDragFreeMarker(p.id, e) : undefined}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPlacement(p.id);
                      }}
                    >
                      <div className="group relative">
                        <Pin kind={p.kind} selected={selected} compact={false} />
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 hidden w-max max-w-[min(280px,85vw)] -translate-x-1/2 rounded-xl border border-border bg-card p-0 text-card-foreground shadow-md md:group-hover:block">
                          <div className="p-2">
                            <PlacementHoverDetails p={p} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {cellGroupList.map(([label, items]) => {
                  const head = items[0];
                  const selected = items.some((it) => it.id === selectedPlacementId);
                  return (
                    <div
                      key={`cell-${label}`}
                      ref={(el) => {
                        for (const pl of items) {
                          if (el) markerRefs.current[pl.id] = el;
                          else delete markerRefs.current[pl.id];
                        }
                      }}
                      className="warehouse-pin absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                      style={{ left: `${head.pos_x * 100}%`, top: `${head.pos_y * 100}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPlacement(items[0]?.id ?? null);
                      }}
                    >
                      <div className="group relative">
                        <CellPin cellLabel={label} count={items.length} selected={selected} />
                        <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 hidden w-max max-w-[min(280px,85vw)] -translate-x-1/2 rounded-xl border border-border bg-card p-0 text-card-foreground shadow-md md:group-hover:block">
                          <div className="p-2">
                            <CellHoverDetails cellLabel={label} items={items} />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TransformComponent>

            <div className="pointer-events-none absolute bottom-3 right-3 z-40 flex flex-col gap-2">
              <button
                type="button"
                className="pointer-events-auto h-11 w-11 rounded-full border border-white/15 bg-black/65 text-lg font-semibold text-foreground shadow-lg backdrop-blur-sm"
                onClick={() => utils.zoomIn(0.18, 160)}
                aria-label="Zoom in"
              >
                +
              </button>
              <button
                type="button"
                className="pointer-events-auto h-11 w-11 rounded-full border border-white/15 bg-black/65 text-lg font-semibold text-foreground shadow-lg backdrop-blur-sm"
                onClick={() => utils.zoomOut(0.18, 160)}
                aria-label="Zoom out"
              >
                −
              </button>
              <button
                type="button"
                className="pointer-events-auto rounded-full border border-white/15 bg-black/65 px-3 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur-sm"
                onClick={() => fit()}
              >
                Fit
              </button>
            </div>
          </>
        )}
      </TransformWrapper>
    </div>
  );
});
