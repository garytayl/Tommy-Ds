import Link from "next/link";

import { features } from "@/lib/config";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";

export default function AdminLayout({
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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-primary backdrop-blur-md">
        <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
          <Link
            href="/admin"
            className="min-w-0 truncate text-sm font-semibold text-primary-foreground"
          >
            Tommy D&apos;s
          </Link>
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
        {children}
      </main>
    </div>
  );
}
