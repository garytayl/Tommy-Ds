"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import type { WarehousePlacementRow } from "./warehouse-map-types";
import { maxRowForColumn, type WarehouseColumn } from "@/lib/warehouse-grid";

export type WarehouseGridMoveTarget =
  | { kind: "floor" }
  | { kind: "cell"; col: WarehouseColumn; row: number };

const FLOOR_ID = "drop-floor";

function cellDropId(col: WarehouseColumn, row: number): string {
  return `drop-cell:${col}:${row}`;
}

function parseDropId(id: string | undefined | null): WarehouseGridMoveTarget | null {
  if (!id) return null;
  if (id === FLOOR_ID) return { kind: "floor" };
  const m = /^drop-cell:([ABC]):(\d+)$/.exec(id);
  if (!m) return null;
  const col = m[1] as WarehouseColumn;
  const row = Number(m[2]);
  return { kind: "cell", col, row };
}

function kindLetter(kind: WarehousePlacementRow["kind"]): string {
  if (kind === "window") return "W";
  if (kind === "door") return "D";
  return "S";
}

function DroppableZone({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[40px] rounded-lg border border-dashed border-white/15 bg-white/[0.03] p-1 transition-colors ${isOver ? "border-primary/70 bg-primary/10" : ""} ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function DraggableChip({
  placement,
  dragDisabled,
  selected,
  tapMoveEnabled,
  tapMoveSelected,
  movePending,
  onSelect,
  onTapMoveSelect,
}: {
  placement: WarehousePlacementRow;
  dragDisabled: boolean;
  selected: boolean;
  tapMoveEnabled: boolean;
  tapMoveSelected: boolean;
  movePending: boolean;
  onSelect: (id: string) => void;
  onTapMoveSelect: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: placement.id,
    disabled: dragDisabled || movePending,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;
  const label = placement.label?.trim() || "Untitled";

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(placement.id);
        if (tapMoveEnabled) onTapMoveSelect(placement.id);
      }}
      className={`mb-1 flex w-full touch-manipulation select-none items-center gap-1 rounded-md border px-1.5 py-0.5 text-left text-[10px] font-medium transition md:gap-1.5 md:px-2 md:py-1 md:text-[11px] ${
        selected
          ? "border-primary bg-primary/20 text-foreground"
          : "border-white/12 bg-black/40 text-foreground hover:bg-white/10"
      } ${tapMoveSelected ? "ring-1 ring-primary/70" : ""} ${
        dragDisabled ? (tapMoveEnabled ? "cursor-pointer" : "cursor-default opacity-90") : "cursor-grab active:cursor-grabbing"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      <span className="shrink-0 font-bold text-accent-gold">{kindLetter(placement.kind)}</span>
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}

type Props = {
  freePlacements: WarehousePlacementRow[];
  cellGroupList: [string, WarehousePlacementRow[]][];
  canEdit: boolean;
  selectedPlacementId: string | null;
  onSelectPlacement: (id: string | null) => void;
  onMove: (placementId: string, target: WarehouseGridMoveTarget) => Promise<void>;
  /** Opens the add-marker flow with this cell pre-selected (grid mode). */
  onQuickAddCell?: (col: WarehouseColumn, row: number) => void;
};

export function WarehouseGridTable({
  freePlacements,
  cellGroupList,
  canEdit,
  selectedPlacementId,
  onSelectPlacement,
  onMove,
  onQuickAddCell,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [useTapMove, setUseTapMove] = useState(false);
  const [tapMoveId, setTapMoveId] = useState<string | null>(null);
  const [tapMovePending, setTapMovePending] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const cellMap = useMemo(() => {
    const m = new Map<string, WarehousePlacementRow[]>();
    for (const [label, items] of cellGroupList) {
      m.set(label, items);
    }
    return m;
  }, [cellGroupList]);

  const columns: WarehouseColumn[] = ["A", "B", "C"];
  const allPlacements = useMemo(
    () => [...freePlacements, ...cellGroupList.flatMap(([, items]) => items)],
    [freePlacements, cellGroupList],
  );
  const isDragEnabled = canEdit && !useTapMove;
  const tapMovePlacement = useMemo(
    () => (tapMoveId ? allPlacements.find((p) => p.id === tapMoveId) ?? null : null),
    [allPlacements, tapMoveId],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setUseTapMove(mq.matches);
    apply();
    const onChange = () => apply();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  async function handleTapMove(target: WarehouseGridMoveTarget) {
    if (!tapMoveId || tapMovePending) return;
    setTapMovePending(true);
    try {
      await onMove(tapMoveId, target);
      setTapMoveId(null);
    } finally {
      setTapMovePending(false);
    }
  }

  function handleDragStart(e: DragStartEvent) {
    if (!isDragEnabled) return;
    setActiveId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!isDragEnabled) return;
    const { active, over } = e;
    if (!over) return;
    const pid = String(active.id);
    const target = parseDropId(String(over.id));
    if (!target) return;

    const placement = allPlacements.find((p) => p.id === pid);
    if (!placement) return;

    if (target.kind === "floor") {
      if (!placement.cell_column && placement.cell_row == null) return;
      await onMove(pid, { kind: "floor" });
      return;
    }

    const { col, row } = target;
    if (placement.cell_column === col && placement.cell_row === row) return;

    await onMove(pid, { kind: "cell", col, row });
  }

  const activePlacement = activeId
    ? allPlacements.find((p) => p.id === activeId)
    : null;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={(e) => void handleDragEnd(e)}>
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto p-3 select-none md:p-4">
        <div className="md:hidden rounded-lg border border-white/10 bg-black/25 px-2 py-1.5">
          <p className="text-center text-[10px] font-medium text-muted-foreground">
            A · B · C stay visible together on mobile.
          </p>
        </div>
        {canEdit ? (
          <div className="rounded-lg border border-white/10 bg-black/25 px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Move mode</p>
              <div className="inline-flex gap-0.5 rounded-md border border-white/15 bg-white/[0.04] p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setUseTapMove(true);
                    setActiveId(null);
                  }}
                  className={`rounded px-2 py-1 text-[10px] font-semibold transition ${
                    useTapMove ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  Tap move
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseTapMove(false);
                    setTapMoveId(null);
                  }}
                  className={`rounded px-2 py-1 text-[10px] font-semibold transition ${
                    !useTapMove ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-white/10"
                  }`}
                >
                  Drag
                </button>
              </div>
            </div>
            {useTapMove ? (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {tapMovePlacement
                  ? `Selected: ${kindLetter(tapMovePlacement.kind)} · ${tapMovePlacement.label?.trim() || "Untitled"} — now tap a destination cell or Floor only.`
                  : "Tap a chip to select it, then tap destination cell/Floor only."}
              </p>
            ) : null}
          </div>
        ) : null}

        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Floor only (not in a cell)
          </p>
          <DroppableZone id={FLOOR_ID}>
            {freePlacements.length === 0 ? (
              <p className="py-2 text-center text-[11px] text-muted-foreground">Drop here to remove from grid cells</p>
            ) : (
              freePlacements.map((p) => (
                <DraggableChip
                  key={p.id}
                  placement={p}
                  dragDisabled={!isDragEnabled}
                  selected={p.id === selectedPlacementId}
                  tapMoveEnabled={canEdit && useTapMove}
                  tapMoveSelected={p.id === tapMoveId}
                  movePending={tapMovePending}
                  onSelect={(id) => onSelectPlacement(id)}
                  onTapMoveSelect={setTapMoveId}
                />
              ))
            )}
            {canEdit && useTapMove && tapMoveId ? (
              <button
                type="button"
                onClick={() => void handleTapMove({ kind: "floor" })}
                disabled={tapMovePending}
                className="mt-1.5 w-full rounded-md border border-primary/50 bg-primary/10 px-2 py-1 text-[10px] font-medium text-foreground disabled:opacity-50"
              >
                {tapMovePending ? "Moving…" : "Move selected marker to Floor only"}
              </button>
            ) : null}
          </DroppableZone>
        </div>

        <div className="flex min-h-0 gap-1.5 md:gap-3">
          {columns.map((col) => {
            const maxR = maxRowForColumn(col);
            return (
              <div
                key={col}
                className="flex min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-white/10 bg-black/20 p-1 md:p-2"
              >
                <div className="mb-1 text-center text-[10px] font-semibold text-foreground md:mb-2 md:text-xs">
                  Column {col}
                </div>
                <div className="flex flex-col gap-1 overflow-y-auto">
                  {Array.from({ length: maxR }, (_, i) => i + 1).map((row) => {
                    const key = `${col}${row}`;
                    const items = cellMap.get(key) ?? [];
                    return (
                      <div key={key} className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between gap-1 pr-0.5">
                          <span className="text-[9px] font-medium text-muted-foreground md:text-[10px]">
                            {col}
                            {row}
                          </span>
                          {canEdit && onQuickAddCell ? (
                            <button
                              type="button"
                              title={`Add to cell ${col}${row}`}
                              aria-label={`Add item to cell ${col}${row}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onQuickAddCell(col, row);
                              }}
                              onPointerDown={(e) => e.stopPropagation()}
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/[0.06] text-muted-foreground transition hover:border-primary/50 hover:bg-primary/15 hover:text-foreground md:h-7 md:w-7"
                            >
                              <Plus className="h-3 w-3 md:h-3.5 md:w-3.5" strokeWidth={2.5} />
                            </button>
                          ) : null}
                        </div>
                        <DroppableZone id={cellDropId(col, row)} className="min-h-[40px] p-1 md:min-h-[56px] md:p-1.5">
                          {items.length === 0 ? (
                            <p className="py-0.5 text-center text-[9px] text-muted-foreground/80 md:py-1.5 md:text-[10px]">
                              Empty
                            </p>
                          ) : (
                            items.map((p) => (
                              <DraggableChip
                                key={p.id}
                                placement={p}
                                dragDisabled={!isDragEnabled}
                                selected={p.id === selectedPlacementId}
                                tapMoveEnabled={canEdit && useTapMove}
                                tapMoveSelected={p.id === tapMoveId}
                                movePending={tapMovePending}
                                onSelect={(id) => onSelectPlacement(id)}
                                onTapMoveSelect={setTapMoveId}
                              />
                            ))
                          )}
                          {canEdit && useTapMove && tapMoveId ? (
                            <button
                              type="button"
                              onClick={() => void handleTapMove({ kind: "cell", col, row })}
                              disabled={tapMovePending}
                              className="mt-1 w-full rounded-md border border-primary/50 bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-foreground disabled:opacity-50 md:text-[10px]"
                            >
                              {tapMovePending ? "Moving…" : `Move selected here (${col}${row})`}
                            </button>
                          ) : null}
                        </DroppableZone>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activePlacement ? (
          <div className="flex max-w-[200px] items-center gap-1.5 rounded-md border border-primary bg-card px-2 py-1 text-[11px] font-medium text-foreground shadow-lg">
            <span className="font-bold text-accent-gold">{kindLetter(activePlacement.kind)}</span>
            <span className="truncate">{activePlacement.label?.trim() || "Untitled"}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
