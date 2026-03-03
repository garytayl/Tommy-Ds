import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/invoices", label: "Invoices" },
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const isSupabaseConfigured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!isSupabaseConfigured) {
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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    redirect("/m");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-primary backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/admin"
            className="text-sm font-semibold text-primary-foreground"
          >
            Field Service Scheduler
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground/90 transition hover:text-[rgb(251,146,60)]"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/m"
              className="ml-2 inline-flex items-center rounded-lg border border-primary-foreground/30 bg-primary-foreground px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-foreground hover:text-primary-foreground"
            >
              Installer View
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
