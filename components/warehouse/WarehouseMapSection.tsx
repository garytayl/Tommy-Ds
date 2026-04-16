"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const WarehouseMapClient = dynamic(
  () => import("./WarehouseMapClient").then((m) => m.WarehouseMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[min(72dvh,640px)] flex-1 items-center justify-center bg-[#050508] text-sm text-muted-foreground">
        Loading map…
      </div>
    ),
  },
);

export function WarehouseMapSection() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Suspense
        fallback={
          <div className="flex min-h-[min(72dvh,640px)] flex-1 items-center justify-center bg-[#050508] text-sm text-muted-foreground">
            Loading map…
          </div>
        }
      >
        <WarehouseMapClient />
      </Suspense>
    </div>
  );
}
