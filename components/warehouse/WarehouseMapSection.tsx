"use client";

import dynamic from "next/dynamic";

const WarehouseMapClient = dynamic(
  () => import("./WarehouseMapClient").then((m) => m.WarehouseMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[360px] items-center justify-center rounded-xl border border-border bg-card/40 p-8 text-muted-foreground">
        Loading map…
      </div>
    ),
  },
);

export function WarehouseMapSection() {
  return <WarehouseMapClient />;
}
