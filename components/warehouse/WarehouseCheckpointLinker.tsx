"use client";

import { useEffect, useMemo, useState } from "react";

import type { WarehouseMapRow } from "@/components/warehouse/warehouse-map-types";
import { buildWarehouseCheckpointPath, formatCellQuery } from "@/lib/warehouse-checkpoint";
import { maxRowForColumn, type WarehouseColumn } from "@/lib/warehouse-grid";

type Props = {
  maps: WarehouseMapRow[];
  activeMapSlug: string | null;
};

export function WarehouseCheckpointLinker({ maps, activeMapSlug }: Props) {
  const [mapSlug, setMapSlug] = useState<string>("");
  const [col, setCol] = useState<WarehouseColumn>("A");
  const [row, setRow] = useState(1);
  const [zoneTitle, setZoneTitle] = useState("");
  const [customerId, setCustomerId] = useState("");

  useEffect(() => {
    if (activeMapSlug) setMapSlug(activeMapSlug);
  }, [activeMapSlug]);

  const maxR = maxRowForColumn(col);

  useEffect(() => {
    setRow((r) => Math.min(maxR, Math.max(1, r)));
  }, [col, maxR]);

  const path = useMemo(() => {
    const slug = mapSlug || maps[0]?.slug;
    if (!slug) return "/warehouse";
    return buildWarehouseCheckpointPath({
      mapSlug: slug,
      cell: formatCellQuery(col, row),
      title: zoneTitle.trim() || undefined,
      customer: customerId.trim() || undefined,
    });
  }, [mapSlug, col, row, maps, zoneTitle, customerId]);

  const fullUrl =
    typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (typeof window === "undefined") return undefined;
    const url = `${window.location.origin}${path}`;
    setQrLoading(true);
    setQrDataUrl(null);
    void import("qrcode")
      .then((mod) =>
        mod.default.toDataURL(url, {
          width: 240,
          margin: 2,
          errorCorrectionLevel: "M",
          color: { dark: "#0f172a", light: "#ffffff" },
        }),
      )
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      })
      .finally(() => {
        if (!cancelled) setQrLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  if (maps.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">QR checkpoint</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        Scan opens a <strong className="text-foreground/90">task-first</strong> screen: zone title and optional
        customer pull list first; floor plan stays behind &quot;Show floor plan&quot; on phones.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
          Zone label (large text after scan)
          <input
            type="text"
            value={zoneTitle}
            onChange={(e) => setZoneTitle(e.target.value)}
            placeholder='e.g. "Bay 2 · North rack"'
            className="rounded-md border border-white/15 bg-black/50 px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/70"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
          Customer ID (optional — pull list)
          <input
            type="text"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="UUID from Admin → Customers"
            className="rounded-md border border-white/15 bg-black/50 px-2 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/70"
          />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <label className="flex min-w-[8rem] flex-col gap-1 text-[11px] text-muted-foreground">
          Map
          <select
            value={mapSlug || maps[0]?.slug || ""}
            onChange={(e) => setMapSlug(e.target.value)}
            className="rounded-md border border-white/15 bg-black/50 px-2 py-1.5 text-sm text-foreground"
          >
            {maps.map((m) => (
              <option key={m.id} value={m.slug}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-20 flex-col gap-1 text-[11px] text-muted-foreground">
          Column
          <select
            value={col}
            onChange={(e) => setCol(e.target.value as WarehouseColumn)}
            className="rounded-md border border-white/15 bg-black/50 px-2 py-1.5 text-sm text-foreground"
          >
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </label>
        <label className="flex w-20 flex-col gap-1 text-[11px] text-muted-foreground">
          Row
          <select
            value={row}
            onChange={(e) => setRow(Number(e.target.value))}
            className="rounded-md border border-white/15 bg-black/50 px-2 py-1.5 text-sm text-foreground"
          >
            {Array.from({ length: maxR }, (_, i) => i + 1).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="shrink-0 rounded-xl border border-white/15 bg-white p-3 shadow-inner">
          {qrLoading ? (
            <div className="flex h-[240px] w-[240px] items-center justify-center text-xs text-muted-foreground">
              Generating…
            </div>
          ) : qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL from qrcode
            <img
              src={qrDataUrl}
              alt="QR code that opens this warehouse checkpoint in the browser"
              width={240}
              height={240}
              className="block h-[240px] w-[240px]"
            />
          ) : (
            <div className="flex h-[240px] w-[240px] items-center justify-center text-center text-xs text-muted-foreground">
              QR unavailable
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="break-all rounded-md border border-white/10 bg-black/40 px-2 py-1.5 font-mono text-[11px] text-foreground/90">
            {fullUrl}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copy()}
              className="rounded-md border border-accent-gold/40 bg-accent-gold/10 px-3 py-1.5 text-xs font-medium text-accent-gold hover:bg-accent-gold/20"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            {qrDataUrl ? (
              <a
                href={qrDataUrl}
                download={`warehouse-checkpoint-${formatCellQuery(col, row)}.png`}
                className="inline-flex items-center rounded-md border border-white/15 bg-white/[0.08] px-3 py-1.5 text-xs font-medium text-foreground hover:bg-white/12"
              >
                Download QR (PNG)
              </a>
            ) : null}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Tip: print the PNG or screenshot the square; tape it at the aisle that matches this cell on the diagram.
          </p>
        </div>
      </div>
    </div>
  );
}
