import { revalidatePath } from "next/cache";

import { createSupabaseServerClientForData } from "@/lib/supabase/server";

export default async function MaterialsPage() {
  async function createMaterial(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    const sku = String(formData.get("sku") ?? "").trim();
    const unit = String(formData.get("unit") ?? "each").trim() || "each";
    const defaultLocationId = String(formData.get("default_location_id") ?? "").trim() || null;

    if (!name) return;

    const supabase = await createSupabaseServerClientForData();
    await supabase.from("materials").insert({
      name,
      sku: sku || null,
      unit,
      default_location_id: defaultLocationId || null,
    });

    revalidatePath("/admin/materials");
  }

  const supabase = await createSupabaseServerClientForData();
  const [{ data: materials }, { data: locations }] = await Promise.all([
    supabase
      .from("materials")
      .select("id,name,sku,unit,default_location_id,locations(name,code)")
      .order("name", { ascending: true }),
    supabase
      .from("locations")
      .select("id,code,name")
      .order("code", { ascending: true }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Materials
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Supplies and parts catalog. Assign materials to jobs from the job workspace Supplies tab.
        </p>
      </div>
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <span className="block h-1 w-12 rounded-full bg-primary/80" />
        <h2 className="mt-3 text-base font-semibold text-foreground">Add material</h2>
        <form action={createMaterial} className="mt-4 grid gap-3 sm:grid-cols-4">
          <input
            type="text"
            name="name"
            required
            placeholder="Name"
            className="field sm:col-span-2"
          />
          <input type="text" name="sku" placeholder="SKU" className="field" />
          <input
            type="text"
            name="unit"
            placeholder="Unit (e.g. each, pack)"
            defaultValue="each"
            className="field"
          />
          <select name="default_location_id" className="field sm:col-span-2">
            <option value="">No default location</option>
            {(locations ?? []).map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary">
            Add material
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="border-b border-border bg-muted/50 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-foreground">All materials</h2>
        </div>
        <div className="table-wrap overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="table-header py-3 pl-5 pr-4">Name</th>
                <th className="table-header py-3 pr-4">SKU</th>
                <th className="table-header py-3 pr-4">Unit</th>
                <th className="table-header py-3 pr-5">Default location</th>
              </tr>
            </thead>
            <tbody>
              {(materials ?? []).map((m) => {
                const locRaw = m.locations;
                const loc = Array.isArray(locRaw) ? locRaw[0] : locRaw;
                return (
                  <tr
                    key={m.id}
                    className="border-b border-border transition hover:bg-muted/30"
                  >
                    <td className="py-3 pl-5 pr-4 font-medium text-foreground">{m.name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{m.sku ?? "—"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{m.unit}</td>
                    <td className="py-3 pr-5 text-muted-foreground">
                      {loc?.name ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(materials ?? []).length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No materials yet. Add one above or run seed.
          </p>
        )}
      </section>
    </div>
  );
}
