"use client";

import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { WarehousePlacementKind, WarehousePlacementRow } from "@/components/warehouse/warehouse-map-types";

function placementKindTitle(kind: WarehousePlacementKind): string {
  if (kind === "window") return "Window";
  if (kind === "door") return "Door";
  return "Screen";
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

  useEffect(() => {
    setLabel(initialLabel);
    setNote(initialNote);
  }, [initialLabel, initialNote]);

  return (
    <>
      <label className="block text-sm font-medium text-foreground">
        Label
        <input
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </label>
      <label className="mt-3 block text-sm font-medium text-foreground">
        Note (optional)
        <textarea
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          rows={3}
          placeholder="Note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="btn-primary flex-1 rounded-lg py-2 text-sm disabled:opacity-50"
          disabled={saving}
          onClick={() => onSave(label, note || null)}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          className="rounded-lg border border-destructive/50 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
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

type SummaryProps = {
  cellGroup: { label: string; items: WarehousePlacementRow[] } | null;
  freePlacement: WarehousePlacementRow | null;
  selectedPlacementId: string | null;
  onSelectPlacementId: (id: string) => void;
  onClose: () => void;
  canEdit: boolean;
  onRequestEdit: (placementId: string) => void;
};

/**
 * Read-only summary for a selected marker or cell stack. Uses a small “deck” for multi-item cells.
 */
export function WarehouseMapInspectorSummary({
  cellGroup,
  freePlacement,
  selectedPlacementId,
  onSelectPlacementId,
  onClose,
  canEdit,
  onRequestEdit,
}: SummaryProps) {
  const items = cellGroup?.items ?? null;

  const deckIndex = useMemo(() => {
    if (!items?.length || !selectedPlacementId) return 0;
    const i = items.findIndex((x) => x.id === selectedPlacementId);
    return i >= 0 ? i : 0;
  }, [items, selectedPlacementId]);

  const current = useMemo(() => {
    if (freePlacement) return freePlacement;
    if (items?.length) return items[deckIndex] ?? items[0];
    return null;
  }, [freePlacement, items, deckIndex]);

  if (!current) return null;

  const notePreview = current.note?.trim();
  const cellLine =
    current.cell_column && current.cell_row != null
      ? `Cell ${current.cell_column}${current.cell_row} · stack slot ${current.stack_index + 1}`
      : "Floor position (not in a grid cell)";

  function goDeck(delta: number) {
    if (!items?.length) return;
    const next = Math.min(items.length - 1, Math.max(0, deckIndex + delta));
    const p = items[next];
    if (p) onSelectPlacementId(p.id);
  }

  return (
    <div className="space-y-3 text-foreground">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Details</span>
        <button
          type="button"
          className="shrink-0 rounded-md border border-white/15 px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-white/10 hover:text-foreground"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      {cellGroup && items && items.length > 1 ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Cell {cellGroup.label}</span>
            <span className="text-[10px] text-muted-foreground">
              {deckIndex + 1} / {items.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous item in cell"
              className="shrink-0 rounded-md border border-white/12 p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-30"
              disabled={deckIndex <= 0}
              onClick={() => goDeck(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-h-[4.5rem] min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto [-webkit-overflow-scrolling:touch]">
              <div className="flex gap-2">
                {items.map((p, i) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectPlacementId(p.id)}
                    className={`min-w-[85%] shrink-0 snap-center rounded-lg border px-2 py-2 text-left sm:min-w-[200px] ${
                      i === deckIndex ? "border-primary bg-primary/10" : "border-white/10 bg-black/30"
                    }`}
                  >
                    <div className="text-[10px] font-medium uppercase text-muted-foreground">
                      {placementKindTitle(p.kind)} · {i + 1}/{items.length}
                    </div>
                    <div className="truncate text-sm font-medium">{p.label?.trim() || "Untitled"}</div>
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              aria-label="Next item in cell"
              className="shrink-0 rounded-md border border-white/12 p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground disabled:opacity-30"
              disabled={deckIndex >= items.length - 1}
              onClick={() => goDeck(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div>
        <div className="text-[10px] font-semibold uppercase text-muted-foreground">{placementKindTitle(current.kind)}</div>
        <p className="mt-1 text-sm font-semibold leading-snug">{current.label?.trim() || "—"}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{cellLine}</p>
        {notePreview ? (
          <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-muted-foreground">{notePreview}</p>
        ) : (
          <p className="mt-2 text-[11px] italic text-muted-foreground/80">No note</p>
        )}
      </div>

      {canEdit ? (
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/40 bg-primary/15 py-2.5 text-sm font-medium text-foreground hover:bg-primary/25"
          onClick={() => onRequestEdit(current.id)}
        >
          <Pencil className="h-4 w-4" />
          Edit details
        </button>
      ) : null}
    </div>
  );
}

type EditDialogProps = {
  open: boolean;
  placement: WarehousePlacementRow | null;
  saving: boolean;
  onClose: () => void;
  onSave: (id: string, label: string, note: string | null) => void;
  onDelete: (id: string) => void;
};

/**
 * Full-screen sheet on small viewports; centered dialog on md+.
 */
export function WarehousePlacementEditDialog({
  open,
  placement,
  saving,
  onClose,
  onSave,
  onDelete,
}: EditDialogProps) {
  if (!open || !placement) return null;

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="warehouse-edit-title"
    >
      <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-xl sm:rounded-2xl">
        <h2 id="warehouse-edit-title" className="text-lg font-semibold text-foreground">
          Edit marker
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {placementKindTitle(placement.kind)}
          {placement.cell_column && placement.cell_row != null
            ? ` · ${placement.cell_column}${placement.cell_row}`
            : " · Floor"}
        </p>
        <div className="mt-4">
          <MarkerEditForm
            key={placement.id}
            initialLabel={placement.label}
            initialNote={placement.note ?? ""}
            saving={saving}
            onSave={(label, note) => onSave(placement.id, label, note)}
            onDelete={() => onDelete(placement.id)}
          />
        </div>
        <button
          type="button"
          className="mt-4 w-full rounded-lg border border-border py-2 text-sm text-muted-foreground hover:bg-muted/50"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
