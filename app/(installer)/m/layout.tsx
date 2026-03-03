import { features } from "@/lib/config";
import { AppShell } from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default function InstallerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!features.supabase) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="card mx-auto max-w-2xl">
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

  return <AppShell mode="field">{children}</AppShell>;
}
