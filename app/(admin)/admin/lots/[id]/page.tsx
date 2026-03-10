import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { createSupabaseServerClientForData } from "@/lib/supabase/server";

export default async function LotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClientForData();

  const [lotResult, inventoryResult, materialsResult] = await Promise.all([
    supabase
      .from("lots")
      .select("id,name,barcode,location_id,locations(name,code)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("inventory")
      .select("id,material_id,quantity,materials(id,name,unit,barcode)")
      .eq("lot_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("materials").select("id,name,unit,barcode").order("name", { ascending: true }),
  ]);

  const lot = lotResult.data;
  const inventory = inventoryResult.data ?? [];
  const materials = materialsResult.data ?? [];

  if (!lot) notFound();

  const location = Array.isArray(lot.locations) ? lot.locations[0] : lot.locations;

  async function addInventory(formData: FormData) {
    "use server";

    const materialId = String(formData.get("material_id") ?? "").trim();
    const qty = Number.parseFloat(String(formData.get("quantity") ?? "1"));

    if (!materialId || !Number.isFinite(qty) || qty <= 0) return;

    const supabase = await createSupabaseServerClientForData();
    const { data: existing } = await supabase
      .from("inventory")
      .select("id,quantity")
      .eq("lot_id", id)
      .eq("material_id", materialId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("inventory")
        .update({ quantity: existing.quantity + qty, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("inventory").insert({
        lot_id: id,
        material_id: materialId,
        quantity: qty,
      });
    }

    revalidatePath(`/admin/lots/${id}`);
  }

  async function adjustQuantity(formData: FormData) {
    "use server";

    const inventoryId = String(formData.get("inventory_id") ?? "").trim();
    const delta = Number(formData.get("delta"));
    if (!inventoryId || !Number.isFinite(delta)) return;

    const supabase = await createSupabaseServerClientForData();
    const { data: row } = await supabase
      .from("inventory")
      .select("quantity")
      .eq("id", inventoryId)
      .maybeSingle();

    if (!row) return;
    const newQty = Math.max(0, row.quantity + delta);
    if (newQty === 0) {
      await supabase.from("inventory").delete().eq("id", inventoryId);
    } else {
      await supabase
        .from("inventory")
        .update({ quantity: newQty, updated_at: new Date().toISOString() })
        .eq("id", inventoryId);
    }

    revalidatePath(`/admin/lots/${id}`);
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Lot
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          {lot.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {location?.name ?? "—"} {lot.barcode && `· Barcode: ${lot.barcode}`}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href="/admin/lots" className="link text-sm">
            Back to lots
          </Link>
          <Link href="/admin/scan" className="link text-sm">
            Scan barcode
          </Link>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <span className="block h-1 w-12 rounded-full bg-primary/80" />
        <h2 className="mt-3 text-base font-semibold text-foreground">Add / adjust inventory</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan or select a material and quantity to add to this lot.
        </p>
        <form action={addInventory} className="mt-4 grid gap-3 sm:grid-cols-4">
          <select name="material_id" required className="field sm:col-span-2">
            <option value="">Select material</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {m.barcode ? `(${m.barcode})` : ""}
              </option>
            ))}
          </select>
          <input
            type="number"
            name="quantity"
            min="0.01"
            step="0.01"
            defaultValue="1"
            className="field"
          />
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="border-b border-border bg-muted/50 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-foreground">Inventory in this lot</h2>
        </div>
        <div className="table-wrap overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="table-header py-3 pl-5 pr-4">Material</th>
                <th className="table-header py-3 pr-4">Barcode</th>
                <th className="table-header py-3 pr-4">Quantity</th>
                <th className="table-header py-3 pr-5">Adjust</th>
              </tr>
            </thead>
            <tbody>
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    No inventory in this lot. Add materials above.
                  </td>
                </tr>
              ) : (
                inventory.map((row) => {
                  const mat = Array.isArray(row.materials) ? row.materials[0] : row.materials;
                  return (
                    <tr key={row.id} className="border-b border-border hover:bg-muted/30">
                      <td className="py-3 pl-5 pr-4 font-medium text-foreground">{mat?.name ?? "—"}</td>
                      <td className="py-3 pr-4 font-mono text-muted-foreground">{mat?.barcode ?? "—"}</td>
                      <td className="py-3 pr-4 tabular-nums">{row.quantity} {mat?.unit ?? ""}</td>
                      <td className="py-3 pr-5 flex items-center gap-2">
                        <form action={adjustQuantity} className="inline">
                          <input type="hidden" name="inventory_id" value={row.id} />
                          <input type="hidden" name="delta" value="-1" />
                          <button type="submit" className="rounded border border-border bg-card px-2 py-1 text-xs hover:bg-muted">
                            −
                          </button>
                        </form>
                        <form action={adjustQuantity} className="inline">
                          <input type="hidden" name="inventory_id" value={row.id} />
                          <input type="hidden" name="delta" value="1" />
                          <button type="submit" className="rounded border border-border bg-card px-2 py-1 text-xs hover:bg-muted">
                            +
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
