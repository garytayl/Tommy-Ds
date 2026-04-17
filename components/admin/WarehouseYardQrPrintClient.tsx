"use client";

import { Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  WAREHOUSE_COLUMNS,
  eachWarehouseGridCell,
  maxRowForColumn,
  type WarehouseColumn,
} from "@/lib/warehouse-grid";
import { buildWarehouseYardSlotPath } from "@/lib/warehouse-checkpoint";

const QR_WIDTH = 132;

function cellsForColumn(col: WarehouseColumn) {
  const max = maxRowForColumn(col);
  const cells: { row: number; slot: string }[] = [];
  for (let row = 1; row <= max; row++) {
    cells.push({ row, slot: `${col}${row}` });
  }
  return cells;
}

export function WarehouseYardQrPrintClient() {
  const [origin, setOrigin] = useState<string>("");
  const [qrBySlot, setQrBySlot] = useState<Record<string, string>>({});
  const [qrError, setQrError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const slots = useMemo(() => eachWarehouseGridCell().map((c) => c.slot), []);

  useEffect(() => {
    setOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    setLoading(true);
    setQrError(null);
    setQrBySlot({});

    void import("qrcode")
      .then(async (mod) => {
        const next: Record<string, string> = {};
        for (const slot of slots) {
          const path = buildWarehouseYardSlotPath(slot);
          const url = `${origin}${path}`;
          const dataUrl = await mod.default.toDataURL(url, {
            width: QR_WIDTH,
            margin: 1,
            errorCorrectionLevel: "M",
            color: { dark: "#0f172a", light: "#ffffff" },
          });
          next[slot] = dataUrl;
        }
        if (!cancelled) setQrBySlot(next);
      })
      .catch((e: unknown) => {
        if (!cancelled) setQrError(e instanceof Error ? e.message : "Could not build QR codes.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [origin, slots]);

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Warehouse yard QR codes</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          One code per grid cell from the upper floor layout: column <strong className="text-foreground">A</strong> has{" "}
          <strong className="text-foreground">10</strong> rows; columns <strong className="text-foreground">B</strong>{" "}
          and <strong className="text-foreground">C</strong> have <strong className="text-foreground">8</strong> rows
          each (26 codes). Scanning opens the public warehouse page with that slot filled in for{" "}
          <span className="font-medium text-foreground">Place an item</span>.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => window.print()} className="btn-primary inline-flex items-center gap-2">
            <Printer className="h-4 w-4" aria-hidden />
            Print sheet
          </button>
          {loading ? <span className="text-sm text-muted-foreground">Generating codes…</span> : null}
          {qrError ? (
            <span className="text-sm text-destructive" role="alert">
              {qrError}
            </span>
          ) : null}
        </div>
      </div>

      <div
        id="warehouse-qr-print"
        className="rounded-xl border border-border bg-card p-4 shadow-sm print:border-0 print:bg-white print:p-4 print:shadow-none"
      >
        <p className="mb-4 text-center font-mono text-xs text-muted-foreground print:mb-3">
          Tommy D&apos;s · yard slots · {origin ? `${origin}/warehouse?slot=` : "…"}
          <span className="text-foreground">A1</span> …
        </p>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 print:grid-cols-3 print:gap-4">
          {WAREHOUSE_COLUMNS.map((col) => (
            <section key={col} className="min-w-0">
              <h2 className="border-b border-border pb-2 text-center font-mono text-sm font-semibold text-foreground print:pb-1">
                Column {col}
                <span className="ml-2 font-sans text-xs font-normal text-muted-foreground">
                  ({maxRowForColumn(col)} rows)
                </span>
              </h2>
              <ul className="mt-3 grid gap-3 print:mt-2 print:gap-2">
                {cellsForColumn(col).map(({ slot }) => {
                  const dataUrl = qrBySlot[slot];
                  const path = buildWarehouseYardSlotPath(slot);
                  const fullUrl = origin ? `${origin}${path}` : path;
                  return (
                    <li
                      key={slot}
                      className="break-inside-avoid overflow-hidden rounded-lg border border-border bg-muted/20 text-center print:border print:border-neutral-400 print:bg-white"
                    >
                      {/* Slot on the label itself (tape-friendly: readable without rotating the square). */}
                      <div className="border-b border-white/10 bg-neutral-900 px-2 py-2 print:border-neutral-700">
                        <p className="font-mono text-xl font-bold tabular-nums tracking-wide text-white sm:text-2xl print:text-[22px] print:leading-none">
                          {slot}
                        </p>
                      </div>
                      <div className="bg-white px-2 pb-2 pt-2">
                        {dataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- data URL from qrcode
                          <img
                            src={dataUrl}
                            alt={`Yard slot ${slot}`}
                            width={QR_WIDTH}
                            height={QR_WIDTH}
                            className="mx-auto h-auto w-[132px]"
                          />
                        ) : (
                          <div
                            className="mx-auto flex h-[132px] w-[132px] items-center justify-center bg-muted/40 text-[10px] text-muted-foreground"
                            aria-hidden
                          >
                            …
                          </div>
                        )}
                      </div>
                      <p className="truncate border-t border-border px-1.5 py-1.5 font-mono text-[8px] leading-tight text-muted-foreground print:border-neutral-300 print:py-1 print:text-[7px]">
                        {fullUrl}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
