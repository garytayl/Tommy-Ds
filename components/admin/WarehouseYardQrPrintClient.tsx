"use client";

import { Printer } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";

import {
  WAREHOUSE_COLUMNS,
  eachWarehouseGridCell,
  maxRowForColumn,
  type WarehouseColumn,
} from "@/lib/warehouse-grid";
import { buildWarehouseYardSlotPath } from "@/lib/warehouse-checkpoint";

/** Bitmap size for sharp prints when scaled down in CSS. */
const QR_BITMAP = 128;

function cellsForColumn(col: WarehouseColumn) {
  const max = maxRowForColumn(col);
  const cells: { row: number; slot: string }[] = [];
  for (let row = 1; row <= max; row++) {
    cells.push({ row, slot: `${col}${row}` });
  }
  return cells;
}

function SlotLabelCard({
  slot,
  dataUrl,
  fullUrl,
}: {
  slot: string;
  dataUrl: string | null;
  fullUrl: string;
}) {
  return (
    <li
      className="flex flex-col overflow-hidden rounded-md border border-border bg-muted/15 break-inside-avoid text-center print:border-neutral-400 print:bg-white print:shadow-none"
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
    >
      <div className="border-b border-white/10 bg-neutral-900 px-1 py-1 print:border-neutral-700 print:py-0.5">
        <p className="font-mono text-base font-bold tabular-nums leading-none text-white print:text-[13px]">
          {slot}
        </p>
      </div>
      <div className="flex justify-center bg-white px-1 pb-1 pt-1 print:py-0.5">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL from qrcode
          <img
            src={dataUrl}
            alt={`QR ${slot}`}
            width={QR_BITMAP}
            height={QR_BITMAP}
            className="h-[96px] w-[96px] print:h-[76px] print:w-[76px]"
          />
        ) : (
          <div
            className="flex h-[96px] w-[96px] items-center justify-center bg-muted/30 text-[10px] text-muted-foreground print:h-[76px] print:w-[76px]"
            aria-hidden
          >
            …
          </div>
        )}
      </div>
      <p className="truncate px-1 pb-1 font-mono text-[7px] leading-tight text-muted-foreground print:hidden">
        {fullUrl}
      </p>
    </li>
  );
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
            width: QR_BITMAP,
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
    <>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <div className="space-y-6">
        <div className="print:hidden">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Warehouse yard QR codes</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            One sticker per grid cell from the upper floor layout (column <strong className="text-foreground">A</strong>:{" "}
            <strong className="text-foreground">10</strong> rows; <strong className="text-foreground">B</strong> &amp;{" "}
            <strong className="text-foreground">C</strong>: <strong className="text-foreground">8</strong> each).{" "}
            <span className="font-medium text-foreground">QR codes give a fast, reliable open in the browser</span>—great
            on dim racks or when the phone camera is finicky. Staff can also{" "}
            <span className="font-medium text-foreground">read the big slot text with the camera</span> on{" "}
            <span className="font-mono text-foreground">/warehouse</span> if a label is easier than QR.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            <strong className="text-foreground">Print tip:</strong> use <span className="font-medium">Print sheet</span>{" "}
            — labels are dense (slot + QR only). URLs stay on screen for debugging, not on paper.
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
          className="warehouse-qr-print-root rounded-xl border border-border bg-card p-4 shadow-sm print:m-0 print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none"
        >
          {/* Screen + print: compact flowing grid with column bands */}
          <header className="mb-4 border-b border-border pb-3 text-center print:mb-2 print:pb-2 print:border-neutral-300">
            <p className="font-sans text-sm font-semibold text-foreground print:text-base">Tommy D&apos;s · warehouse yard</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground print:text-[10px]">
              {origin ? `${origin}/warehouse?slot=` : ""}
              <span className="text-foreground">SLOT</span>
            </p>
          </header>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 print:grid-cols-6 print:gap-x-2 print:gap-y-2">
            {WAREHOUSE_COLUMNS.map((col) => (
              <Fragment key={col}>
                <h2 className="col-span-full mt-3 flex items-baseline justify-center gap-2 border-b border-border pb-1.5 text-center font-mono text-xs font-semibold text-foreground first:mt-0 print:col-span-6 print:mt-3 print:border-neutral-400 print:pb-1 print:text-[11px] print:first:mt-0">
                  <span>Column {col}</span>
                  <span className="font-sans font-normal text-muted-foreground">({maxRowForColumn(col)} rows)</span>
                </h2>
                {cellsForColumn(col).map(({ slot }) => {
                  const dataUrl = qrBySlot[slot] ?? null;
                  const path = buildWarehouseYardSlotPath(slot);
                  const fullUrl = origin ? `${origin}${path}` : path;
                  return (
                    <SlotLabelCard key={slot} slot={slot} dataUrl={dataUrl} fullUrl={fullUrl} />
                  );
                })}
              </Fragment>
            ))}
          </div>

          <p className="mt-4 hidden text-center text-[10px] text-neutral-500 print:block">
            Scan opens Place flow with that slot. Reprint anytime from Admin → Warehouse QR.
          </p>
        </div>
      </div>
    </>
  );
}

/** Tighter letter/A4 margins + hide site chrome is handled in AppShell; this trims label sheet only. */
const PRINT_CSS = `
@media print {
  @page {
    size: letter portrait;
    margin: 0.35in;
  }
  .warehouse-qr-print-root {
    max-width: none !important;
  }
}
`;
