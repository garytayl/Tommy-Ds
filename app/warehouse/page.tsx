import Link from "next/link";

import { PublicShell } from "@/components/PublicShell";
import { WarehouseMapSection } from "@/components/warehouse/WarehouseMapSection";
import { features } from "@/lib/config";

export default function WarehousePage() {
  if (!features.supabase) {
    return (
      <PublicShell>
        <div className="container mx-auto max-w-2xl px-4 pb-16 pt-6 md:px-6">
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
      <div className="container mx-auto max-w-6xl px-4 pb-16 pt-6 md:px-6 md:pt-8">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Yard</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Upper warehouse
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Three columns: A has ten rows; B and C have eight rows each. Each grid cell can hold up to ten stacked items
            (pins show a count). Use the toolbar (+/−) or pinch and scroll to zoom, and drag to pan. On mobile, use the map
            mode toggle and quick marker chips to jump to any item. Mark windows and doors on the layout map, or use the
            inventory map for stock and bay labels. Changes save for everyone in real time.
          </p>
        </div>
        <WarehouseMapSection />
      </div>
    </PublicShell>
  );
}
