import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

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

function getAppUrl(): string {
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (publicUrl) return publicUrl.replace(/\/+$/, "");
  const vercelProjectUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProjectUrl) return `https://${vercelProjectUrl.replace(/\/+$/, "")}`;
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}

function isLocalHostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return url.includes("localhost");
  }
}

async function resolveInviteAppUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const h = await headers();
  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost ?? h.get("host");
  const forwardedProto = h.get("x-forwarded-proto");
  if (host) {
    const proto =
      forwardedProto ??
      (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${proto}://${host}`.replace(/\/+$/, "");
  }

  return getAppUrl();
}

export default async function TeamPage() {
  const auth = await getCurrentUserAndProfile();
  if (!auth || auth.profile.role !== "admin") redirect("/admin");
  const inviteBaseUrl = await resolveInviteAppUrl();
  const inviteBaseIsLocalhost = isLocalHostUrl(inviteBaseUrl);

  async function sendInvite(formData: FormData) {
    "use server";
    const auth = await getCurrentUserAndProfile();
    if (!auth || auth.profile.role !== "admin") {
      await setToastCookie("You don’t have permission to invite users.");
      revalidatePath("/admin/team");
      return;
    }
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const fullName = String(formData.get("full_name") ?? "").trim() || null;
    const role = String(formData.get("role") ?? "manager").trim();
    if (!email) {
      await setToastCookie("Email is required.");
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
      const appUrl = await resolveInviteAppUrl();
      if (process.env.NODE_ENV === "production" && isLocalHostUrl(appUrl)) {
        await setToastCookie(
          "Invite links are using localhost. Set NEXT_PUBLIC_APP_URL to your public site URL and try again.",
        );
        revalidatePath("/admin/team");
        return;
      }
      const redirectTo = `${appUrl}/auth/callback?next=/auth/onboarding`;
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo,
          data: fullName ? { full_name: fullName } : undefined,
        },
      );
      if (inviteError) {
        await setToastCookie(inviteError.message);
        revalidatePath("/admin/team");
        return;
      }
      const invitedUser = inviteData.user;
      if (!invitedUser) {
        await setToastCookie("Invite could not be created.");
        revalidatePath("/admin/team");
        return;
      }
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          user_id: invitedUser.id,
          role,
          full_name: fullName,
          onboarding_completed_at: null,
        },
        { onConflict: "user_id" },
      );
      if (profileError) {
        await setToastCookie(profileError.message);
        revalidatePath("/admin/team");
        return;
      }
      await setToastCookie(`Invite sent to ${email}.`);
      revalidatePath("/admin/team");
    } catch (e) {
      await setToastCookie(e instanceof Error ? e.message : "Failed to send invite");
      revalidatePath("/admin/team");
    }
  }

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
          onboarding_completed_at: null,
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
    .select("user_id, role, full_name, onboarding_completed_at, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div className="animate-fade-in-section schedule-delay-0">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Team</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invite office staff/installers to self-setup, or create users manually as a fallback. Only users with a profile and role can access the app.
        </p>
      </div>

      <section className="animate-card-in schedule-delay-75 rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/5 transition-shadow duration-300 hover:shadow-xl">
        <span className="block h-1 w-12 rounded-full bg-primary/80 transition-all duration-200" />
        <h2 className="mt-3 text-base font-semibold text-foreground">Send invite link</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Recommended: send an email invite so they can set up their own account.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Invite redirect base: <code className="rounded bg-muted px-1">{inviteBaseUrl}</code>
        </p>
        {inviteBaseIsLocalhost ? (
          <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            This is a localhost URL. For real users, set{" "}
            <code className="rounded bg-amber-500/20 px-1">NEXT_PUBLIC_APP_URL</code> to your live domain
            so invite links open correctly outside your machine.
          </p>
        ) : null}
        <form action={sendInvite} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="invite-email" className="form-label">Email</label>
            <input id="invite-email" type="email" name="email" required className="field" placeholder="name@example.com" />
          </div>
          <div>
            <label htmlFor="invite-name" className="form-label">Full name (optional)</label>
            <input id="invite-name" type="text" name="full_name" className="field" placeholder="Jane Smith" />
          </div>
          <div>
            <label htmlFor="invite-role" className="form-label">Role</label>
            <select id="invite-role" name="role" className="field">
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <button type="submit" className="btn-primary w-full">Send invite</button>
          </div>
        </form>
      </section>

      <section className="animate-card-in schedule-delay-100 rounded-2xl border border-border bg-card p-5 shadow-lg shadow-black/5 transition-shadow duration-300 hover:shadow-xl">
        <span className="block h-1 w-12 rounded-full bg-primary/80 transition-all duration-200" />
        <h2 className="mt-3 text-base font-semibold text-foreground">Add user manually</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Fallback option: create a user with a temporary password and share it securely.
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
            <button type="submit" className="btn-secondary">Create user manually</button>
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
                <th className="p-3 font-medium">Onboarding</th>
                <th className="p-3 font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((p) => (
                <tr key={p.user_id} className="border-b border-border last:border-0 transition-all duration-200 hover:bg-muted/30">
                  <td className="p-3 text-foreground">{p.full_name ?? "—"}</td>
                  <td className="p-3 capitalize text-foreground">{p.role}</td>
                  <td className="p-3 text-muted-foreground">
                    {p.onboarding_completed_at ? "Complete" : "Pending"}
                  </td>
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
            <strong>Invite by email:</strong> Admin Team now supports sending Supabase invite links. Make sure your Supabase project email settings/SMTP are configured so invitation emails deliver.
          </li>
          <li>
            <strong>Invite API details:</strong> Supabase supports{" "}
            <a
              href="https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              inviteUserByEmail
            </a>
            {" "}for self-setup links.
          </li>
        </ul>
      </div>
    </div>
  );
}
