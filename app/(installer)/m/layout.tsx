import Link from "next/link";

export const dynamic = "force-dynamic";

export default function InstallerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/m" className="text-sm font-semibold">
            Installer View
          </Link>
          <Link href="/admin" className="text-sm text-blue-700 hover:underline">
            Office Admin
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl p-4">{children}</main>
    </div>
  );
}
