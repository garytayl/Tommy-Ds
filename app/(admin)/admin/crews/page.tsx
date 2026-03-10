import { revalidatePath } from "next/cache";

import { createSupabaseServerClientForData } from "@/lib/supabase/server";

const SPECIALTIES = ["Windows and Doors", "Garage Doors"] as const;

export default async function CrewsPage() {
  async function createCrew(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const specialty = String(formData.get("specialty") ?? SPECIALTIES[0]).trim();
    if (!name) return;
    const supabase = await createSupabaseServerClientForData();
    await supabase.from("crews").insert({ name, specialty });
    revalidatePath("/admin/crews");
  }

  async function addMember(formData: FormData) {
    "use server";
    const crewId = String(formData.get("crew_id") ?? "").trim();
    const userId = String(formData.get("user_id") ?? "").trim();
    if (!crewId || !userId) return;
    const supabase = await createSupabaseServerClientForData();
    await supabase.from("crew_members").insert({ crew_id: crewId, user_id: userId });
    revalidatePath("/admin/crews");
  }

  async function removeMember(formData: FormData) {
    "use server";
    const crewId = String(formData.get("crew_id") ?? "").trim();
    const userId = String(formData.get("user_id") ?? "").trim();
    if (!crewId || !userId) return;
    const supabase = await createSupabaseServerClientForData();
    await supabase
      .from("crew_members")
      .delete()
      .eq("crew_id", crewId)
      .eq("user_id", userId);
    revalidatePath("/admin/crews");
  }

  const supabase = await createSupabaseServerClientForData();
  const [
    { data: crews },
    { data: installers },
  ] = await Promise.all([
    supabase
      .from("crews")
      .select("id,name,specialty,crew_members(user_id,profiles(user_id,full_name))")
      .order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("user_id,full_name")
      .eq("role", "installer")
      .order("full_name", { ascending: true }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Crews
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organize crews for schedule and jobs. Assign installers to crews; then assign crews to jobs.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <span className="block h-1 w-12 rounded-full bg-primary/80" />
        <h2 className="mt-3 text-base font-semibold text-foreground">Add crew</h2>
        <form action={createCrew} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            type="text"
            name="name"
            required
            placeholder="Crew name (e.g. Joe & Michael)"
            className="field"
          />
          <select name="specialty" className="field">
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary">Add crew</button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">All crews</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(crews ?? []).map((crew) => {
            const rawMembers = Array.isArray(crew.crew_members) ? crew.crew_members : [];
            const members = rawMembers.map((m: { user_id: string; profiles?: unknown }) => {
              const p = m.profiles;
              const fullName = Array.isArray(p) ? (p[0] as { full_name?: string | null })?.full_name : (p as { full_name?: string | null } | null)?.full_name;
              return { user_id: m.user_id, full_name: fullName ?? null };
            });
            const memberNames = members.map((m) => m.full_name ?? m.user_id);
            return (
              <div
                key={crew.id}
                className="rounded-xl border border-border bg-card overflow-hidden shadow-sm"
              >
                <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
                  <h3 className="font-semibold text-foreground">{crew.name}</h3>
                  <p className="text-sm text-muted-foreground">{crew.specialty}</p>
                </div>
                <div className="p-4 sm:p-5 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Members: {memberNames.length ? memberNames.join(", ") : "None"}
                  </p>
                  {members.length > 0 && (
                    <ul className="flex flex-wrap gap-2">
                      {members.map((m) => (
                        <li key={m.user_id} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-sm">
                          <span>{m.full_name ?? m.user_id}</span>
                          <form action={removeMember} className="inline">
                            <input type="hidden" name="crew_id" value={crew.id} />
                            <input type="hidden" name="user_id" value={m.user_id} />
                            <button type="submit" className="text-muted-foreground hover:text-destructive" aria-label="Remove">×</button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                  {(() => {
                    const available = (installers ?? []).filter(
                      (i) => !members.some((m) => m.user_id === i.user_id)
                    );
                    return available.length > 0 ? (
                      <form action={addMember} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="crew_id" value={crew.id} />
                        <select name="user_id" className="field flex-1 min-w-0 max-w-[200px]" required>
                          <option value="">Add installer…</option>
                          {available.map((i) => (
                            <option key={i.user_id} value={i.user_id}>
                              {i.full_name ?? i.user_id}
                            </option>
                          ))}
                        </select>
                        <button type="submit" className="btn-secondary text-sm py-2">Add</button>
                      </form>
                    ) : (
                      <p className="text-xs text-muted-foreground">All installers are in a crew. Add more in auth/profiles.</p>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
