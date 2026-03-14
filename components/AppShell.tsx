"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import {
  Home,
  CreditCard,
  Search,
  LayoutDashboard,
  UserPlus,
  Calendar,
  Briefcase,
  FileText,
  Users,
  UserCircle,
  UserCog,
  DollarSign,
  BarChart3,
  Sparkles,
  Smartphone,
  LogOut,
} from "lucide-react";
import type { ProfileRole } from "@/lib/auth";

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
  { href: "/admin/team", label: "Team" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/future-features", label: "Future features" },
] as const;

/** Office (manager) role: no Installers, Reports, or Future features. */
const OFFICE_NAV = [
  { href: "/admin", label: "Today" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/quotes", label: "Quotes" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/invoices", label: "Money" },
] as const;

const FIELD_NAV = [{ href: "/m", label: "My jobs" }] as const;

function navFor(mode: Mode, role?: ProfileRole) {
  if (mode === "field") return FIELD_NAV;
  if (role === "manager") return OFFICE_NAV;
  return ADMIN_NAV;
}

function isActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === href;
  if (href === "/m") return pathname === "/m" || pathname.startsWith("/m/");
  if (href === "/admin/jobs") return pathname.startsWith("/admin/jobs") || pathname.startsWith("/jobs/");
  return pathname.startsWith(href);
}

export function AppShell({
  mode,
  role,
  children,
}: {
  mode: Mode;
  role?: ProfileRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const nav = navFor(mode, role);
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
              className={`hidden rounded-xl px-2.5 py-1.5 text-sm font-medium transition touch-manipulation sm:inline-flex sm:px-3 ${
                pathname.startsWith(otherModeHref)
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "border border-white/30 bg-white/10 text-primary-foreground hover:bg-white/20"
              }`}
            >
              {otherModeLabel}
            </Link>
            <a
              href="/auth/logout"
              className="rounded-xl border border-white/30 bg-white/10 px-2.5 py-1.5 text-sm font-medium text-primary-foreground transition hover:bg-white/20 touch-manipulation sm:px-3 inline-flex items-center gap-1.5"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Sign out</span>
            </a>
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

      {/* Mobile overlay menu — card panel with icons and sections */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-background/90 p-4 backdrop-blur-xl sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-border bg-muted/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Menu</p>
            </div>
            <nav className="flex flex-col py-2">
              <div className="px-2 py-1.5">
                <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Quick links</p>
                <div className="flex flex-col gap-0.5">
                  <Link
                    href="/"
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                      pathname === "/" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Home className="h-5 w-5 shrink-0" />
                    <span className="font-medium">Home</span>
                  </Link>
                  <Link
                    href="/pay"
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                      pathname === "/pay" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <CreditCard className="h-5 w-5 shrink-0" />
                    <span className="font-medium">Pay invoice</span>
                  </Link>
                  {mode === "admin" && (
                    <Link
                      href="/admin/search"
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                        pathname === "/admin/search" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Search className="h-5 w-5 shrink-0" />
                      <span className="font-medium">Search</span>
                    </Link>
                  )}
                </div>
              </div>
              <div className="border-t border-border px-2 py-1.5">
                <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {mode === "admin" ? "Admin" : "Field"}
                </p>
                <div className="flex flex-col gap-0.5">
                  {nav.map((item) => {
                    const active = isActive(item.href, pathname) || (item.href === "/admin" && pathname.startsWith("/jobs"));
                    const icons: Record<string, ReactNode> = {
                      "/admin": <LayoutDashboard className="h-5 w-5 shrink-0" />,
                      "/admin/leads": <UserPlus className="h-5 w-5 shrink-0" />,
                      "/admin/schedule": <Calendar className="h-5 w-5 shrink-0" />,
                      "/admin/jobs": <Briefcase className="h-5 w-5 shrink-0" />,
                      "/admin/quotes": <FileText className="h-5 w-5 shrink-0" />,
                      "/admin/crews": <Users className="h-5 w-5 shrink-0" />,
                      "/admin/customers": <UserCircle className="h-5 w-5 shrink-0" />,
                      "/admin/invoices": <DollarSign className="h-5 w-5 shrink-0" />,
                      "/admin/team": <UserCog className="h-5 w-5 shrink-0" />,
                      "/admin/reports": <BarChart3 className="h-5 w-5 shrink-0" />,
                      "/admin/future-features": <Sparkles className="h-5 w-5 shrink-0" />,
                      "/m": <Briefcase className="h-5 w-5 shrink-0" />,
                    };
                    return (
                      <Link
                        key={`${item.href}-${item.label}`}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                          active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {icons[item.href] ?? <LayoutDashboard className="h-5 w-5 shrink-0" />}
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </nav>
            <div className="border-t border-border bg-muted/30 p-3 flex flex-col gap-2">
              <Link
                href={otherModeHref}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Smartphone className="h-4 w-4 shrink-0" />
                {otherModeLabel}
              </Link>
              <a
                href="/auth/logout"
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign out
              </a>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
