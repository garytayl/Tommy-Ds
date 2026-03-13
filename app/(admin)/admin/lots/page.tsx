import Link from "next/link";
import { revalidatePath } from "next/cache";

import { setToastCookie } from "@/lib/toast";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

export default async function LotsPage() {
  async function createLot(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    const locationId = String(formData.get("location_id") ?? "").trim();
    const barcode = String(formData.get("barcode") ?? "").trim() || null;

    if (!name || !locationId) return;

    const supabase = await createSupabaseServerClientForData();
    await supabase.from("lots").insert({
      name,
      location_id: locationId,
      barcode,
    });

    await setToastCookie("Lot added");
    revalidatePath("/admin/lots");
  }

  const supabase = await createSupabaseServerClientForData();
  const [{ data: lots }, { data: locations }] = await Promise.all([
    supabase
      .from("lots")
      .select("id,name,barcode,location_id,locations(name,code)")
      .order("name", { ascending: true }),
    supabase
      .from("locations")
      .select("id,code,name")
      .order("code", { ascending: true }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Lots
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Barcode-labeled areas within a location. Add inventory to lots so installers can find parts quickly.
          </p>
        </div>
        <Link href="/admin/scan" className="btn-primary">
          Scan barcode
        </Link>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <span className="block h-1 w-12 rounded-full bg-primary/80" />
        <h2 className="mt-3 text-base font-semibold text-foreground">Add lot</h2>
        <form action={createLot} className="mt-4 grid gap-3 sm:grid-cols-4">
          <input
            type="text"
            name="name"
            required
            placeholder="Lot name (e.g. A-1, Shelf 3)"
            className="field sm:col-span-2"
          />
          <select name="location_id" required className="field">
            <option value="">Select location</option>
            {(locations ?? []).map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="barcode"
            placeholder="Barcode (optional)"
            className="field"
          />
          <button type="submit" className="btn-primary sm:col-span-4">
            Add lot
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="border-b border-border bg-muted/50 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-foreground">All lots</h2>
        </div>
        <div className="table-wrap overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="table-header py-3 pl-5 pr-4">Name</th>
                <th className="table-header py-3 pr-4">Location</th>
                <th className="table-header py-3 pr-4">Barcode</th>
                <th className="table-header py-3 pr-5">Action</th>
              </tr>
            </thead>
            <tbody>
              {(lots ?? []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    No lots yet. Add one above and assign inventory from the lot page.
                  </td>
                </tr>
              ) : (
                (lots ?? []).map((lot) => {
                  const loc = Array.isArray(lot.locations) ? lot.locations[0] : lot.locations;
                  return (
                    <tr key={lot.id} className="border-b border-border hover:bg-muted/30">
                      <td className="py-3 pl-5 pr-4 font-medium text-foreground">{lot.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{loc?.name ?? "—"}</td>
                      <td className="py-3 pr-4 font-mono text-muted-foreground">{lot.barcode ?? "—"}</td>
                      <td className="py-3 pr-5">
                        <Link href={`/admin/lots/${lot.id}`} className="link">
                          Open
                        </Link>
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
