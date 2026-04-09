import Link from "next/link";

import { PublicShell } from "@/components/PublicShell";
import { WarehouseMapSection } from "@/components/warehouse/WarehouseMapSection";
import { features } from "@/lib/config";

export default function WarehousePage() {
  if (!features.supabase) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-2xl px-4 pb-16 pt-6 md:px-6">
          <div className="rounded-xl border border-border bg-card/60 p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-foreground">Warehouse map</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Supabase is not configured. Add <code className="text-foreground">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="text-foreground">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, apply migrations, then reload.
            </p>
            <Link href="/" className="mt-4 inline-block text-sm font-medium text-accent-gold underline-offset-4 hover:underline">
              ← Home
            </Link>
          </div>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <div className="flex flex-col">
        <header className="shrink-0 border-b border-white/10 px-4 pb-4 pt-2 md:px-8">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Yard</p>
          <div className="mt-1 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Upper warehouse</h1>
            <p className="max-w-xl text-xs leading-relaxed text-muted-foreground md:text-right">
              Switch to the table to drag markers between grid cells, or open the floor view to pan the plan. Stack as
              many items per cell as needed; types are window, door, or screen.
            </p>
          </div>
        </header>

        {/* Viewport-tied floor: avoids a short “card” map; main already has pt-20 and footer below */}
        <div className="flex h-[min(calc(100dvh-12rem),1200px)] min-h-[min(72dvh,640px)] flex-col bg-[#050508]">
          <WarehouseMapSection />
        </div>
      </div>
    </PublicShell>
  );
}
