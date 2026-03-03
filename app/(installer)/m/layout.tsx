import Link from "next/link";

import { features } from "@/lib/config";

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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-primary backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3">
          <Link href="/m" className="min-w-0 truncate text-sm font-semibold text-primary-foreground touch-manipulation">
            Tommy D&apos;s · Field
          </Link>
          <Link
            href="/admin"
            className="shrink-0 text-sm font-medium text-primary-foreground/90 transition hover:text-accent-gold touch-manipulation"
          >
            Office Admin
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-6 sm:py-6">{children}</main>
    </div>
  );
}
