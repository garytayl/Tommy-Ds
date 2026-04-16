"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const WarehouseMapClient = dynamic(
  () => import("./WarehouseMapClient").then((m) => m.WarehouseMapClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#050508] text-sm text-muted-foreground md:min-h-[min(72dvh,640px)]">
        Loading map…
      </div>
    ),
  },
);

export function WarehouseMapSection() {
  return (
    <div className="flex w-full flex-col md:min-h-0 md:flex-1">
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center bg-[#050508] text-sm text-muted-foreground md:min-h-[min(72dvh,640px)]">
            Loading map…
          </div>
        }
      >
        <WarehouseMapClient />
      </Suspense>
    </div>
  );
}
