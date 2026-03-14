import { AppShell } from "@/components/AppShell";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { features } from "@/lib/config";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function JobWorkspaceLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!features.supabase) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-5 shadow-sm">
          <h1 className="text-lg font-semibold text-foreground">Supabase Not Configured</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Vercel Project Settings
            → Environment Variables, then redeploy.
          </p>
        </div>
      </div>
    );
  }

  const auth = await getCurrentUserAndProfile();
  if (!auth) redirect("/auth/login?next=/jobs");
  if (!auth.profile) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 flex items-center justify-center">
        <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <h1 className="text-lg font-semibold text-foreground">No access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account doesn’t have a role yet. Contact your admin to get access.
          </p>
          <form action="/auth/logout" method="post" className="mt-4">
            <button type="submit" className="btn-primary">Sign out</button>
          </form>
        </div>
      </div>
    );
  }
  if (auth.profile.role === "installer") redirect("/m");

  return (
    <AppShell mode="admin" role={auth.profile.role}>
      {children}
    </AppShell>
  );
}
