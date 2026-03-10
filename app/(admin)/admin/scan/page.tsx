import Link from "next/link";

import { createSupabaseServerClientForData } from "@/lib/supabase/server";
import { BarcodeLookup } from "./BarcodeLookup";

type LotRow = { id: string; name: string; barcode?: string | null; locations?: { name: string; code?: string } | { name: string; code?: string }[] };
type MaterialRow = { id: string; name: string; sku?: string | null; unit: string; locations?: { name: string } | { name: string }[] };
type InvRow = { id: string; quantity: number; lot_id?: string; materials?: { name?: string; unit?: string } | { name?: string; unit?: string }[]; lots?: { name?: string; locations?: { name?: string } } | { name?: string; locations?: { name?: string } }[] };

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const barcode = (q ?? "").trim();

  let lotResult: LotRow | null = null;
  let materialResult: MaterialRow | null = null;
  let inventoryInLot: InvRow[] | null = null;
  let inventoryForMaterial: InvRow[] | null = null;

  if (barcode) {
    const supabase = await createSupabaseServerClientForData();
    const [lotRes, matRes] = await Promise.all([
      supabase.from("lots").select("id,name,barcode,location_id,locations(name,code)").eq("barcode", barcode).maybeSingle(),
      supabase.from("materials").select("id,name,sku,unit,barcode,default_location_id,locations(name)").eq("barcode", barcode).maybeSingle(),
    ]);
    lotResult = lotRes.data as LotRow | null;
    materialResult = matRes.data as MaterialRow | null;

    if (lotResult) {
      const invRes = await supabase
        .from("inventory")
        .select("id,quantity,materials(id,name,unit,barcode)")
        .eq("lot_id", lotResult.id)
        .order("created_at", { ascending: true });
      inventoryInLot = (invRes.data ?? []) as InvRow[];
    }
    if (materialResult) {
      const invRes = await supabase
        .from("inventory")
        .select("id,quantity,lot_id,lots(id,name,barcode,locations(name))")
        .eq("material_id", materialResult.id)
        .order("quantity", { ascending: false });
      inventoryForMaterial = (invRes.data ?? []) as InvRow[];
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Barcode lookup
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan or type a barcode to see the lot (and what’s in it) or the material (and where it lives).
        </p>
      </div>

      <BarcodeLookup initialValue={barcode} />

      {barcode && (
        <section className="space-y-4">
          {lotResult ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
                <h2 className="text-base font-semibold text-foreground">Lot: {lotResult.name}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {(Array.isArray(lotResult.locations) ? lotResult.locations[0] : lotResult.locations)?.name ?? "—"}
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-sm text-muted-foreground mb-3">Inventory in this lot:</p>
                {(inventoryInLot ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No inventory recorded.</p>
                ) : (
                  <ul className="space-y-2">
                    {(inventoryInLot ?? []).map((inv) => {
                      const mat = Array.isArray(inv.materials) ? inv.materials[0] : inv.materials;
                      return (
                        <li key={inv.id} className="flex justify-between text-sm">
                          <span className="font-medium">{mat?.name ?? "—"}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {inv.quantity} {mat?.unit ?? ""}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <Link href={`/admin/lots/${lotResult.id}`} className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
                  Open lot →
                </Link>
              </div>
            </div>
          ) : materialResult ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
                <h2 className="text-base font-semibold text-foreground">Material: {materialResult.name}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  SKU: {materialResult.sku ?? "—"} · Unit: {materialResult.unit}
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <p className="text-sm text-muted-foreground">
                  Default location: {(Array.isArray(materialResult.locations) ? materialResult.locations[0] : materialResult.locations)?.name ?? "—"}
                </p>
                {(inventoryForMaterial ?? []).length > 0 ? (
                  <>
                    <p className="mt-3 text-sm font-medium text-foreground">In these lots:</p>
                    <ul className="mt-2 space-y-2">
                      {(inventoryForMaterial ?? []).map((inv) => {
                        const lot = Array.isArray(inv.lots) ? inv.lots[0] : inv.lots;
                        const loc = Array.isArray(lot?.locations) ? lot?.locations[0] : lot?.locations;
                        return (
                          <li key={inv.id} className="flex justify-between text-sm">
                            <Link href={`/admin/lots/${inv.lot_id}`} className="font-medium text-primary hover:underline">
                              {lot?.name ?? "—"} ({loc?.name ?? "—"})
                            </Link>
                            <span className="tabular-nums text-muted-foreground">{inv.quantity}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    No inventory in lots yet. Add this material to a lot from the Lots page.
                  </p>
                )}
                <Link href="/admin/materials" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
                  Materials →
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <p className="text-sm text-muted-foreground">
                No lot or material found with barcode &quot;{barcode}&quot;. Add a barcode to a lot or material to look it up.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
