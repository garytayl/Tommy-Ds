import Link from "next/link";

import { PublicShell } from "@/components/PublicShell";
import { WarehouseYardClient } from "@/components/warehouse/WarehouseYardClient";
import { features } from "@/lib/config";

type PageProps = { searchParams: Promise<{ slot?: string }> };

export default async function WarehousePage({ searchParams }: PageProps) {
  const { slot: slotParam } = await searchParams;
  if (!features.supabase) {
    return (
      <PublicShell>
        <div className="mx-auto max-w-2xl px-4 pb-16 pt-6 md:px-6">
          <div className="rounded-xl border border-border bg-card/60 p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-foreground">Warehouse yard</h1>
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
    <PublicShell immersive>
      <div className="flex min-h-0 flex-1 flex-col">
        <WarehouseYardClient initialSlot={slotParam} />
      </div>
    </PublicShell>
  );
}
