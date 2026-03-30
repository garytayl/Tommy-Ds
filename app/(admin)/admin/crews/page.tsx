import { revalidatePath } from "next/cache";

import { getCrewDisplayName } from "@/lib/crews";
import { setToastCookie } from "@/lib/toast";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SPECIALTIES = ["Windows and Doors", "Garage Doors"] as const;

export default async function CrewsPage() {
  async function createCrew(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const specialty = String(formData.get("specialty") ?? SPECIALTIES[0]).trim();
    if (!name) return;
    const supabase = await createSupabaseServerClient();
    await supabase.from("crews").insert({ name, specialty });
    await setToastCookie("Crew added");
    revalidatePath("/admin/crews");
  }

  async function addMember(formData: FormData) {
    "use server";
    const crewId = String(formData.get("crew_id") ?? "").trim();
    const userId = String(formData.get("user_id") ?? "").trim();
    if (!crewId || !userId) return;
    const supabase = await createSupabaseServerClient();
    await supabase.from("crew_members").insert({ crew_id: crewId, user_id: userId });
    await setToastCookie("Member added");
    revalidatePath("/admin/crews");
  }

  async function updateCrew(formData: FormData) {
    "use server";
    const crewId = String(formData.get("crew_id") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const specialty = String(formData.get("specialty") ?? SPECIALTIES[0]).trim();
    if (!crewId || !name) return;
    const supabase = await createSupabaseServerClient();
    await supabase
      .from("crews")
      .update({ name, specialty })
      .eq("id", crewId);
    await setToastCookie("Crew saved");
    revalidatePath("/admin/crews");
  }

  async function removeMember(formData: FormData) {
    "use server";
    const crewId = String(formData.get("crew_id") ?? "").trim();
    const userId = String(formData.get("user_id") ?? "").trim();
    if (!crewId || !userId) return;
    const supabase = await createSupabaseServerClient();
    await supabase
      .from("crew_members")
      .delete()
      .eq("crew_id", crewId)
      .eq("user_id", userId);
    await setToastCookie("Member removed");
    revalidatePath("/admin/crews");
  }

  const supabase = await createSupabaseServerClient();
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
      <div className="animate-fade-in-section schedule-delay-0">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Crews
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organize crews for schedule and jobs. Add installers as members below — the crew name will show as their names (e.g. Joe & Michael). If you see no installers to add, create users in Supabase Auth and set their role to &quot;installer&quot; in the profiles table.
        </p>
      </div>

      <section className="animate-card-in schedule-delay-75 rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/5 transition-shadow duration-300 hover:shadow-xl">
        <span className="block h-1 w-12 rounded-full bg-primary/80 transition-all duration-200" />
        <h2 className="mt-3 text-base font-semibold text-foreground">Add crew</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a crew, then add 2–3 installers as members. The crew name will show as the members’ names (e.g. Joe & Michael).
        </p>
        <form action={createCrew} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input
            type="text"
            name="name"
            required
            placeholder="Placeholder name until you add members"
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

      <section className="animate-fade-in-section schedule-delay-150 space-y-4">
        <h2 className="text-base font-semibold text-foreground">All crews</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(crews ?? []).map((crew) => {
            const rawMembers = Array.isArray(crew.crew_members) ? crew.crew_members : [];
            const members = rawMembers.map((m: { user_id: string; profiles?: unknown }) => {
              const p = m.profiles;
              const fullName = Array.isArray(p) ? (p[0] as { full_name?: string | null })?.full_name : (p as { full_name?: string | null } | null)?.full_name;
              return { user_id: m.user_id, full_name: fullName ?? null };
            });
            const displayName = getCrewDisplayName({ name: crew.name, crew_members: crew.crew_members });
            return (
              <div
                key={crew.id}
                className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl"
              >
                <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
                  <h3 className="font-semibold text-foreground">{displayName}</h3>
                  <p className="text-sm text-muted-foreground">{crew.specialty}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {members.length ? `${members.length} member${members.length !== 1 ? "s" : ""}` : "No members yet — add installers below"}
                  </p>
                </div>
                <div className="p-4 sm:p-5 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Members</h4>
                    {members.length > 0 ? (
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
                    ) : (
                      <p className="text-sm text-muted-foreground">None yet. Add installers below — the crew name will become their names.</p>
                    )}
                  </div>
                  {(() => {
                    const allInstallers = installers ?? [];
                    const available = allInstallers.filter(
                      (i) => !members.some((m) => m.user_id === i.user_id)
                    );
                    if (available.length > 0) {
                      return (
                        <form action={addMember} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="crew_id" value={crew.id} />
                          <select name="user_id" className="field flex-1 min-w-0 max-w-[200px]" required>
                            <option value="">Add installer to this crew…</option>
                            {available.map((i) => (
                              <option key={i.user_id} value={i.user_id}>
                                {i.full_name ?? i.user_id}
                              </option>
                            ))}
                          </select>
                          <button type="submit" className="btn-secondary text-sm py-2">Add</button>
                        </form>
                      );
                    }
                    if (allInstallers.length === 0) {
                      return (
                        <p className="text-sm text-muted-foreground">
                          No installers in the system yet. Add users in Supabase{" "}
                          <strong>Authentication</strong>, then set their <strong>role</strong> to{" "}
                          <code className="rounded bg-muted px-1 text-xs">installer</code> in the{" "}
                          <strong>profiles</strong> table (e.g. in the Table Editor or via an auth hook). They will then appear here to add to crews.
                        </p>
                      );
                    }
                    return (
                      <p className="text-xs text-muted-foreground">
                        All installers are already in a crew. Add more users with the installer role in auth/profiles to assign them here.
                      </p>
                    );
                  })()}
                  <div className="pt-2 border-t border-border">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Crew details</h4>
                    <form action={updateCrew} className="grid gap-2 sm:grid-cols-3">
                      <input type="hidden" name="crew_id" value={crew.id} />
                      <input
                        type="text"
                        name="name"
                        required
                        defaultValue={crew.name}
                        placeholder="Fallback name (when no members)"
                        className="field"
                      />
                      <select name="specialty" className="field" defaultValue={crew.specialty}>
                        {SPECIALTIES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <button type="submit" className="btn-secondary text-sm py-2">Save</button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
