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
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/quotes", label: "Quotes" },
  { href: "/admin/crews", label: "Installers" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/invoices", label: "Money" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/future-features", label: "Future features" },
] as const;

const FIELD_NAV = [{ href: "/m", label: "My jobs" }] as const;

function navFor(mode: Mode) {
  return mode === "admin" ? ADMIN_NAV : FIELD_NAV;
}

function isActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === href;
  if (href === "/m") return pathname === "/m" || pathname.startsWith("/m/");
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
  const otherModeLabel = mode === "admin" ? "Installer" : "Admin";

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

          {mode === "admin" ? (
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
          ) : (
            <div className="hidden flex-1 justify-center sm:flex">
              <Link
                href="/admin/search"
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-primary-foreground/80 backdrop-blur-sm transition hover:bg-white/15 hover:text-primary-foreground"
              >
                Search
              </Link>
            </div>
          )}

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
              className="relative flex min-h-[44px] min-w-[44px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl text-primary-foreground hover:bg-white/10 sm:hidden touch-manipulation"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span
                className={`block h-px w-6 origin-center bg-current transition-all duration-300 ease-out ${
                  mobileMenuOpen ? "translate-y-[5px] rotate-45" : ""
                }`}
              />
              <span
                className={`block h-px w-6 bg-current transition-all duration-200 ${
                  mobileMenuOpen ? "opacity-0 -translate-x-2" : "opacity-100 translate-x-0"
                }`}
              />
              <span
                className={`block h-px w-6 origin-center bg-current transition-all duration-300 ease-out ${
                  mobileMenuOpen ? "-translate-y-[5px] -rotate-45" : ""
                }`}
              />
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
        {(mode === "field" ? [...nav, { href: otherModeHref, label: otherModeLabel }] : nav.slice(0, 4)).map((item) => {
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

      {/* Full-screen overlay menu (maniafueled-style) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 flex flex-col bg-background/95 backdrop-blur-lg sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          onClick={() => setMobileMenuOpen(false)}
        >
          <nav
            className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8"
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              href="/"
              className={`min-h-[48px] flex items-center justify-center text-2xl font-medium tracking-tight transition sm:text-3xl ${
                pathname === "/" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/pay"
              className={`min-h-[48px] flex items-center justify-center text-2xl font-medium tracking-tight transition sm:text-3xl ${
                pathname === "/pay" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Pay invoice
            </Link>
            {mode === "admin" && (
              <Link
                href="/admin/search"
                className={`min-h-[48px] flex items-center justify-center text-2xl font-medium tracking-tight transition sm:text-3xl ${
                  pathname === "/admin/search" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Search
              </Link>
            )}
            <div className="my-2 h-px w-16 bg-border" aria-hidden />
            {nav.map((item, index) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                className={`min-h-[48px] flex items-center justify-center text-2xl font-medium tracking-tight transition sm:text-3xl ${
                  isActive(item.href, pathname) || (item.href === "/admin" && pathname.startsWith("/jobs"))
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="my-2 h-px w-16 bg-border" aria-hidden />
            <Link
              href={otherModeHref}
              className="min-h-[48px] flex items-center justify-center rounded-xl border border-border bg-muted/50 px-6 py-3 text-lg font-medium text-foreground hover:bg-muted"
              onClick={() => setMobileMenuOpen(false)}
            >
              {otherModeLabel}
            </Link>
          </nav>
        </div>
      )}
      </div>
    </div>
  );
}
