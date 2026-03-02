import Link from "next/link";

export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/jobs", label: "Jobs" },
];

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="text-sm font-semibold">
            Field Service Scheduler
          </Link>
          <nav className="flex items-center gap-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/m"
              className="rounded bg-black px-3 py-1 text-sm text-white"
            >
              Installer View
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl p-4">{children}</main>
    </div>
  );
}
