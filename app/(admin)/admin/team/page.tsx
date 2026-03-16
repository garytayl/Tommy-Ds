import { revalidatePath } from "next/cache";

import { getCurrentUserAndProfile } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { setToastCookie } from "@/lib/toast";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Office" },
  { value: "installer", label: "Installer" },
] as const;

export default async function TeamPage() {
  const auth = await getCurrentUserAndProfile();
  if (!auth || auth.profile.role !== "admin") redirect("/admin");

  async function createUser(formData: FormData) {
    "use server";
    const auth = await getCurrentUserAndProfile();
    if (!auth || auth.profile.role !== "admin") {
      await setToastCookie("You don’t have permission to add users.");
      revalidatePath("/admin/team");
      return;
    }
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "").trim();
    const fullName = String(formData.get("full_name") ?? "").trim() || null;
    const role = String(formData.get("role") ?? "manager").trim();
    if (!email || !password) {
      await setToastCookie("Email and password are required.");
      revalidatePath("/admin/team");
      return;
    }
    if (!ROLES.some((r) => r.value === role)) {
      await setToastCookie("Invalid role.");
      revalidatePath("/admin/team");
      return;
    }
    try {
      const supabase = createSupabaseServiceClient();
      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: fullName ? { full_name: fullName } : undefined,
      });
      if (createError) {
        await setToastCookie(createError.message);
        revalidatePath("/admin/team");
        return;
      }
      if (!userData.user) {
        await setToastCookie("User was not created.");
        revalidatePath("/admin/team");
        return;
      }
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          user_id: userData.user.id,
          role,
          full_name: fullName,
        },
        { onConflict: "user_id" }
      );
      if (profileError) {
        await setToastCookie(profileError.message);
        revalidatePath("/admin/team");
        return;
      }
      await setToastCookie("User created. Share the login link and temporary password with them.");
      revalidatePath("/admin/team");
    } catch (e) {
      await setToastCookie(e instanceof Error ? e.message : "Failed to create user");
      revalidatePath("/admin/team");
    }
  }

  const supabase = await createSupabaseServerClientForData();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, role, full_name, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-section schedule-delay-0">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create accounts for office, installers, and other admins. Each person signs in at the app with the email and temporary password you set. Only users with a profile and role can access the app.
        </p>
      </div>

      <section className="animate-card-in schedule-delay-75 rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/5 transition-shadow duration-300 hover:shadow-xl">
        <span className="block h-1 w-12 rounded-full bg-primary/80 transition-all duration-200" />
        <h2 className="mt-3 text-base font-semibold text-foreground">Add user</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set a temporary password and share it securely. They can sign in at your app&apos;s login page and change it later if you add a password-reset flow.
        </p>
        <form action={createUser} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="team-email" className="form-label">Email</label>
            <input id="team-email" type="email" name="email" required className="field" placeholder="name@example.com" />
          </div>
          <div>
            <label htmlFor="team-password" className="form-label">Temporary password</label>
            <input id="team-password" type="text" name="password" required className="field" placeholder="e.g. TempPass123!" autoComplete="off" />
          </div>
          <div>
            <label htmlFor="team-name" className="form-label">Full name (optional)</label>
            <input id="team-name" type="text" name="full_name" className="field" placeholder="Jane Smith" />
          </div>
          <div>
            <label htmlFor="team-role" className="form-label">Role</label>
            <select id="team-role" name="role" className="field">
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="submit" className="btn-primary">Create user</button>
          </div>
        </form>
      </section>

      <section className="animate-card-in schedule-delay-150 rounded-2xl border border-border bg-card overflow-hidden shadow-lg shadow-black/5 transition-shadow duration-300 hover:shadow-xl">
        <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-foreground">Everyone with access</h2>
          <p className="text-sm text-muted-foreground">Users listed here have a profile and can sign in.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="p-3 font-medium">Name</th>
                <th className="p-3 font-medium">Role</th>
                <th className="p-3 font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((p) => (
                <tr key={p.user_id} className="border-b border-border last:border-0 transition-all duration-200 hover:bg-muted/30">
                  <td className="p-3 text-foreground">{p.full_name ?? "—"}</td>
                  <td className="p-3 capitalize text-foreground">{p.role}</td>
                  <td className="p-3 text-muted-foreground">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!profiles || profiles.length === 0) && (
          <p className="p-4 text-sm text-muted-foreground">No users yet. Create one above.</p>
        )}
      </section>

      <div className="animate-fade-in-section schedule-delay-225 rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground shadow-sm transition-shadow duration-200 hover:shadow-md">
        <p className="font-medium text-foreground">Other ways to add users</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            <strong>Supabase Dashboard:</strong> In your{" "}
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Supabase project
            </a>
            , open <strong>Authentication → Users</strong> to add a user manually. Then add a row to the <code className="rounded bg-muted px-1">profiles</code> table with that user&apos;s <code className="rounded bg-muted px-1">user_id</code> and <code className="rounded bg-muted px-1">role</code> (admin, installer, or manager) or they won&apos;t be able to sign in to this app.
          </li>
          <li>
            <strong>“Database error creating new user”:</strong> Usually a trigger on <code className="rounded bg-muted px-1">auth.users</code> is failing. Apply the migration <code className="rounded bg-muted px-1">20260314100000_fix_auth_user_triggers.sql</code> (drops common broken triggers), or in Supabase SQL Editor run it manually. Check Postgres logs in the Dashboard if it persists.
          </li>
          <li>
            <strong>Invite by email:</strong> Supabase supports{" "}
            <a
              href="https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              inviteUserByEmail
            </a>
            {" "}so you can send a sign-up link instead of a password; you&apos;d need to add a &quot;pending invite&quot; flow and profile creation when they first sign in to assign their role.
          </li>
        </ul>
      </div>
    </div>
  );
}
