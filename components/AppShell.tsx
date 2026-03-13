"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const Aurora = dynamic(() => import("@/components/Aurora").then((m) => m.default), {
  ssr: false,
});

type Mode = "admin" | "field";

const ADMIN_NAV = [
  { href: "/admin", label: "Today" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/crews", label: "Crews" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/invoices", label: "Money" },
  { href: "/admin/future-features", label: "Future features" },
] as const;

const FIELD_NAV = [
  { href: "/m", label: "Today" },
  { href: "/m", label: "My Jobs" },
  { href: "/m#photos", label: "Photos" },
  { href: "/m#payments", label: "Payments" },
] as const;

function navFor(mode: Mode) {
  return mode === "admin" ? ADMIN_NAV : FIELD_NAV;
}

function isActive(href: string, pathname: string): boolean {
  if (href === "/admin" || href === "/m") return pathname === href;
  if (href === "/admin/jobs") return pathname.startsWith("/admin/jobs") || pathname.startsWith("/jobs/");
  return pathname.startsWith(href);
}

export function AppShell({
  mode,
  children,
}: {
  mode: Mode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const nav = navFor(mode);
  const otherModeHref = mode === "admin" ? "/m" : "/admin";
  const otherModeLabel = mode === "admin" ? "Field" : "Admin";

  const hubLinkStyle = (href: string) =>
    pathname === href
      ? "bg-primary-foreground/20 text-primary-foreground"
      : "border border-white/30 bg-white/10 text-primary-foreground hover:bg-white/20";

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="fixed inset-0 h-full w-full">
        <Aurora
          colorStops={["#1a0a0e", "#2d1810", "#1a0a0e"]}
          amplitude={0.6}
          blend={0.4}
        />
      </div>
      <div className="relative z-10 flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 shrink-0 rounded-b-xl border-b border-white/10 bg-primary/90 backdrop-blur-md sm:rounded-b-2xl">
        <div className="relative mx-auto flex w-full max-w-6xl items-center gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
          <Link
            href="/"
            className="min-w-0 truncate text-sm font-semibold text-primary-foreground transition hover:text-primary-foreground/90"
          >
            Tommy D&apos;s
          </Link>

          <div className="hidden flex-1 justify-center sm:flex">
            <Link
              href="/admin/search"
              className="flex w-full max-w-md items-center rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-primary-foreground/80 backdrop-blur-sm transition hover:bg-white/15 hover:text-primary-foreground"
            >
              <span className="mr-2 shrink-0 text-muted-foreground">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </span>
              Search customer / job / address
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2 sm:flex-initial">
            <Link
              href="/"
              className={`hidden rounded-xl px-2.5 py-1.5 text-sm font-medium transition touch-manipulation sm:inline-flex sm:px-3 ${hubLinkStyle("/")}`}
            >
              Home
            </Link>
            <Link
              href="/pay"
              className={`hidden rounded-xl px-2.5 py-1.5 text-sm font-medium transition touch-manipulation sm:inline-flex sm:px-3 ${hubLinkStyle("/pay")}`}
            >
              Pay invoice
            </Link>
            <Link
              href={otherModeHref}
              className={`rounded-xl px-2.5 py-1.5 text-sm font-medium transition touch-manipulation sm:px-3 ${
                pathname.startsWith(otherModeHref)
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "border border-white/30 bg-white/10 text-primary-foreground hover:bg-white/20"
              }`}
            >
              {otherModeLabel}
            </Link>
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-primary-foreground hover:bg-white/10 sm:hidden touch-manipulation"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="4" y1="8" x2="20" y2="8" />
                  <line x1="4" y1="16" x2="20" y2="16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-52 shrink-0 border-r border-border bg-card/50 sm:block">
          <nav className="sticky top-[57px] flex flex-col gap-0.5 p-2">
            {nav.map((item) => {
              const active = isActive(item.href, pathname) || (item.href === "/admin" && pathname.startsWith("/jobs"));
              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-6 pb-20 sm:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around border-t border-white/10 bg-card/95 px-2 py-2 backdrop-blur-md safe-area-pb sm:hidden">
        {nav.slice(0, 4).map((item) => {
          const active = isActive(item.href, pathname);
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs font-medium touch-manipulation ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 sm:hidden"
          aria-hidden
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      {mobileMenuOpen && (
        <div className="absolute left-0 right-0 top-full z-30 border-t border-white/20 bg-primary/95 px-3 py-3 backdrop-blur-md sm:hidden">
          <ul className="flex flex-col gap-0.5">
            <li>
              <Link
                href="/"
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium text-primary-foreground touch-manipulation ${
                  pathname === "/" ? "bg-primary-foreground/20" : "hover:bg-primary-foreground/10"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/pay"
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium text-primary-foreground touch-manipulation ${
                  pathname === "/pay" ? "bg-primary-foreground/20" : "hover:bg-primary-foreground/10"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Pay invoice
              </Link>
            </li>
            <li>
              <Link
                href="/admin/search"
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium text-primary-foreground touch-manipulation ${
                  pathname === "/admin/search" ? "bg-primary-foreground/20" : "hover:bg-primary-foreground/10"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Search
              </Link>
            </li>
            <li className="my-1 border-t border-primary-foreground/20" aria-hidden />
            {nav.map((item) => (
              <li key={`${item.href}-${item.label}`}>
                <Link
                  href={item.href}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium text-primary-foreground touch-manipulation ${
                    isActive(item.href, pathname) ? "bg-primary-foreground/20" : "hover:bg-primary-foreground/10"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="my-1 border-t border-primary-foreground/20" aria-hidden />
            <li>
              <Link
                href={otherModeHref}
                className="block rounded-lg border border-primary-foreground/30 px-3 py-2.5 text-sm font-medium text-primary-foreground touch-manipulation"
                onClick={() => setMobileMenuOpen(false)}
              >
                Switch to {otherModeLabel}
              </Link>
            </li>
          </ul>
        </div>
      )}
      </div>
    </div>
  );
}
