"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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
  const homeHref = mode === "admin" ? "/admin" : "/m";
  const otherModeHref = mode === "admin" ? "/m" : "/admin";
  const otherModeLabel = mode === "admin" ? "Field" : "Admin";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-primary backdrop-blur-md shrink-0">
        <div className="relative mx-auto flex w-full max-w-6xl items-center gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
          <Link
            href={homeHref}
            className="min-w-0 truncate text-sm font-semibold text-primary-foreground"
          >
            Tommy D&apos;s
          </Link>

          <div className="hidden flex-1 justify-center sm:flex">
            <div className="w-full max-w-md rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1.5 text-sm text-primary-foreground/80">
              Search customer / job / address
            </div>
          </div>

          <div className="flex flex-1 items-center justify-end gap-2 sm:flex-initial">
            <Link
              href={otherModeHref}
              className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition touch-manipulation sm:px-3 ${
                pathname.startsWith(otherModeHref)
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "border border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20"
              }`}
            >
              {otherModeLabel}
            </Link>
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-primary-foreground hover:bg-primary-foreground/10 sm:hidden touch-manipulation"
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

      <div className="flex flex-1 min-h-0">
        <aside className="hidden w-52 shrink-0 border-r border-border bg-muted/20 sm:block">
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
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around border-t border-border bg-card px-2 py-2 safe-area-pb sm:hidden">
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
        <div className="absolute left-0 right-0 top-full border-t border-primary-foreground/20 bg-primary px-3 py-3 sm:hidden z-30">
          <ul className="flex flex-col gap-0.5">
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
  );
}
