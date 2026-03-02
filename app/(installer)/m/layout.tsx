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
      <div className="min-h-screen bg-zinc-50 p-6">
        <div className="card mx-auto max-w-2xl">
          <h1 className="text-lg font-semibold">Supabase Not Configured</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in Vercel Project Settings
            → Environment Variables, then redeploy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/m" className="text-sm font-semibold text-zinc-900">
            Installer View
          </Link>
          <Link href="/admin" className="text-sm font-medium text-blue-700 hover:underline">
            Office Admin
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
