"use client";

import { useMemo, useState } from "react";

import type { WarehousePlacementKind, WarehousePlacementRow } from "@/components/warehouse/warehouse-map-types";

function kindLetter(kind: WarehousePlacementKind): string {
  if (kind === "window") return "W";
  if (kind === "door") return "D";
  return "S";
}

function cellSortKey(p: WarehousePlacementRow): string {
  if (p.cell_column && p.cell_row != null) {
    return `${p.cell_column}${String(p.cell_row).padStart(2, "0")}`;
  }
  return "\uffff"; // floor last when sorting by cell
}

export type ListSort = "cell" | "label" | "kind";

type Props = {
  placements: WarehousePlacementRow[];
  selectedPlacementId: string | null;
  onSelect: (p: WarehousePlacementRow) => void;
  /** Optional title for accessibility / mobile drawer header */
  title?: string;
  className?: string;
};

export function WarehousePlacementListPanel({
  placements,
  selectedPlacementId,
  onSelect,
  title = "Markers",
  className = "",
}: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ListSort>("cell");
  const [kindWindow, setKindWindow] = useState(true);
  const [kindDoor, setKindDoor] = useState(true);
  const [kindScreen, setKindScreen] = useState(true);
  const [floorOnly, setFloorOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = placements.filter((p) => {
      if (!kindWindow && p.kind === "window") return false;
      if (!kindDoor && p.kind === "door") return false;
      if (!kindScreen && p.kind === "screen") return false;
      if (floorOnly && (p.cell_column || p.cell_row != null)) return false;
      if (!q) return true;
      const label = (p.label ?? "").toLowerCase();
      const cell = `${p.cell_column ?? ""}${p.cell_row ?? ""}`.toLowerCase();
      const kind = p.kind.toLowerCase();
      const letter = kindLetter(p.kind).toLowerCase();
      return (
        label.includes(q) ||
        cell.includes(q.replace(/\s/g, "")) ||
        kind.startsWith(q) ||
        letter === q
      );
    });

    const sorted = [...list];
    if (sort === "cell") {
      sorted.sort((a, b) => {
        const ca = cellSortKey(a);
        const cb = cellSortKey(b);
        if (ca !== cb) return ca.localeCompare(cb);
        return a.stack_index - b.stack_index;
      });
    } else if (sort === "label") {
      sorted.sort((a, b) => (a.label ?? "").localeCompare(b.label ?? "", undefined, { sensitivity: "base" }));
    } else {
      sorted.sort((a, b) => a.kind.localeCompare(b.kind));
    }
    return sorted;
  }, [placements, query, sort, kindWindow, kindDoor, kindScreen, floorOnly]);

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div className="shrink-0 space-y-2 border-b border-white/10 pb-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="sr-only">Sort by</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as ListSort)}
              className="max-w-[7rem] rounded-md border border-white/12 bg-black/40 px-1.5 py-0.5 text-[10px] text-foreground"
            >
              <option value="cell">By cell</option>
              <option value="label">By label</option>
              <option value="kind">By kind</option>
            </select>
          </label>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search label, cell (e.g. A3), kind…"
          className="w-full rounded-lg border border-white/12 bg-black/40 px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          autoComplete="off"
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setKindWindow((v) => !v)}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
              kindWindow ? "border-primary/60 bg-primary/20 text-foreground" : "border-white/10 text-muted-foreground"
            }`}
          >
            W
          </button>
          <button
            type="button"
            onClick={() => setKindDoor((v) => !v)}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
              kindDoor ? "border-primary/60 bg-primary/20 text-foreground" : "border-white/10 text-muted-foreground"
            }`}
          >
            D
          </button>
          <button
            type="button"
            onClick={() => setKindScreen((v) => !v)}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
              kindScreen ? "border-primary/60 bg-primary/20 text-foreground" : "border-white/10 text-muted-foreground"
            }`}
          >
            S
          </button>
          <button
            type="button"
            onClick={() => setFloorOnly((v) => !v)}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
              floorOnly ? "border-accent-gold/60 bg-accent-gold/15 text-foreground" : "border-white/10 text-muted-foreground"
            }`}
          >
            Floor only
          </button>
        </div>
      </div>

      <ul className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5 [-webkit-overflow-scrolling:touch]">
        {filtered.length === 0 ? (
          <li className="py-6 text-center text-xs text-muted-foreground">No matches.</li>
        ) : (
          filtered.map((p) => {
            const cell =
              p.cell_column && p.cell_row != null ? `${p.cell_column}${p.cell_row}` : "Floor";
            const selected = p.id === selectedPlacementId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p)}
                  className={`flex w-full items-start gap-2 rounded-lg border px-2 py-2 text-left text-xs transition ${
                    selected
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-white/10 bg-white/[0.04] text-foreground hover:bg-white/10"
                  }`}
                >
                  <span className="shrink-0 font-bold text-accent-gold">{kindLetter(p.kind)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{p.label?.trim() || "Untitled"}</span>
                    <span className="text-[10px] text-muted-foreground">{cell}</span>
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
