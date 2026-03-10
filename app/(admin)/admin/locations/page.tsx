import { createSupabaseServerClientForData } from "@/lib/supabase/server";

export default async function LocationsPage() {
  const supabase = await createSupabaseServerClientForData();
  const { data: locations } = await supabase
    .from("locations")
    .select("id,code,name")
    .order("code", { ascending: true });

  const labels: Record<string, string> = {
    door_shop: "Door Shop (center)",
    lower_warehouse: "Lower warehouse",
    upper_warehouse: "Upper warehouse",
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Locations
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Material storage: door shop (center), lower warehouse, and upper warehouse.
        </p>
      </div>
      <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="border-b border-border bg-muted/50 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-foreground">All locations</h2>
        </div>
        <ul className="divide-y divide-border">
          {(locations ?? []).map((loc) => (
            <li
              key={loc.id}
              className="flex items-center justify-between px-4 py-4 sm:px-5"
            >
              <div>
                <p className="font-medium text-foreground">{loc.name}</p>
                <p className="text-sm text-muted-foreground">
                  Code: {labels[loc.code] ?? loc.code}
                </p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {loc.code}
              </span>
            </li>
          ))}
        </ul>
        {(locations ?? []).length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No locations. Run migrations and seed.
          </p>
        )}
      </section>
    </div>
  );
}
