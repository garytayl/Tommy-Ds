import Link from "next/link";

export const dynamic = "force-dynamic";

export default function InstallerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const isSupabaseConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen p-6" style={{ background: "var(--background)" }}>
        <div className="card mx-auto max-w-2xl">
          <h1 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>Supabase Not Configured</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Vercel Project Settings
            → Environment Variables, then redeploy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header
        className="sticky top-0 z-20 border-b backdrop-blur-md"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/m" className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            Installer View
          </Link>
          <Link href="/admin" className="link text-sm">
            Office Admin
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
