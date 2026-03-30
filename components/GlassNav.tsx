"use client";

import { createElement, type ReactNode } from "react";

import { FormSubmitButton } from "@/components/forms/FormSubmitButton";
import {
  Boxes,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  Circle,
  ClipboardList,
  Fuel,
  FileCheck2,
  FileText,
  Lightbulb,
  LayoutDashboard,
  MapPin,
  Package,
  ScanLine,
  Sparkles,
  UserCog,
  Users,
  Users2,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

export type GlassNavLink = {
  label: string;
  href: string;
  description?: string;
};

/** Collapsible group inside “Tools & back office” (Launchpad). */
export type GlassNavToolGroup = {
  title: string;
  links: GlassNavLink[];
};

export type GlassNavSection = {
  title: string;
  /** Flat tiles (e.g. Look up). */
  links?: GlassNavLink[];
  /** Grouped, collapsed by default (e.g. back office). */
  groups?: GlassNavToolGroup[];
};

type GlassNavProps = {
  /** When set with `menuSections`, shows signed-in app chrome (Office / Field + All pages). */
  mode?: "admin" | "field";
  primaryLinks?: GlassNavLink[];
  menuSections?: GlassNavSection[];
};

function isLinkActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  // `/admin` is a prefix of every office route; only the dashboard root should match exactly.
  if (href === "/admin") {
    return pathname === "/admin" || pathname === "/admin/";
  }
  // Reports index only — not /admin/reports/gas
  if (href === "/admin/reports") {
    return pathname === "/admin/reports" || pathname === "/admin/reports/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isOfficeContext(pathname: string): boolean {
  return pathname.startsWith("/admin") || pathname.startsWith("/jobs");
}

function isFieldContext(pathname: string): boolean {
  return pathname.startsWith("/m");
}

function workspaceHome(mode: "admin" | "field"): string {
  return mode === "field" ? "/m" : "/admin";
}

const LINK_ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/schedule": CalendarDays,
  "/admin/jobs": BriefcaseBusiness,
  "/admin/customers": Users,
  "/admin/invoices": FileText,
  "/admin/quotes": FileCheck2,
  "/admin/analytics": ChartNoAxesCombined,
  "/admin/reports": ClipboardList,
  "/admin/reports/gas": Fuel,
  "/admin/crews": Users2,
  "/admin/team": UserCog,
  "/admin/locations": MapPin,
  "/admin/lots": Boxes,
  "/admin/materials": Package,
  "/admin/scan": ScanLine,
  "/admin/future-features": Lightbulb,
  "/m": Wrench,
};

function PublicNavBar() {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setSheetOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 print:hidden sm:px-6"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)" }}
      >
        <div className="mx-auto w-full max-w-6xl">
          <div className="pointer-events-auto flex items-center justify-between gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-2 shadow-2xl backdrop-blur-xl sm:px-5 sm:py-2.5">
            <Link
              href="/"
              className="touch-manipulation truncate rounded-full px-2 py-1 text-sm font-semibold text-white/95 transition duration-150 hover:bg-white/10 active:scale-95"
            >
              Tommy D&apos;s
            </Link>

            <div className="hidden items-center gap-1 sm:flex">
              <Link
                href="/"
                className={cn(
                  "touch-manipulation rounded-full px-3 py-1.5 text-sm font-medium transition duration-150 active:scale-95",
                  pathname === "/"
                    ? "bg-white text-black"
                    : "text-white/85 hover:bg-white/15 hover:text-white",
                )}
              >
                Home
              </Link>
              <Link
                href="/auth/login?next=/admin"
                className="touch-manipulation rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white transition duration-150 hover:bg-white/20 active:scale-95"
              >
                Team sign in
              </Link>
            </div>

            <button
              type="button"
              aria-expanded={sheetOpen}
              aria-controls="glass-public-sheet"
              onClick={() => setSheetOpen((o) => !o)}
              className={cn(
                "touch-manipulation rounded-full px-3 py-1.5 text-sm font-semibold transition duration-150 active:scale-95 sm:hidden",
                sheetOpen
                  ? "bg-white text-black"
                  : "text-white/85 hover:bg-white/15 hover:text-white",
              )}
            >
              Menu
            </button>
          </div>

          <div
            id="glass-public-sheet"
            className={cn(
              "pointer-events-auto mt-2 origin-top rounded-2xl border border-white/20 bg-black/50 p-3 shadow-2xl backdrop-blur-xl transition-all duration-200 sm:hidden",
              sheetOpen
                ? "translate-y-0 scale-100 opacity-100"
                : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
            )}
          >
            <div className="grid gap-2">
              <Link
                href="/"
                onClick={() => setSheetOpen(false)}
                className="touch-manipulation rounded-xl border border-white/20 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Home
              </Link>
              <Link
                href="/auth/login?next=/admin"
                onClick={() => setSheetOpen(false)}
                className="touch-manipulation rounded-xl border border-white/25 bg-white/10 px-3 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Team sign in
              </Link>
            </div>
          </div>
        </div>
      </div>

      {sheetOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setSheetOpen(false)}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] print:hidden sm:hidden"
        />
      ) : null}
    </>
  );
}

type WorkspacePillProps = {
  href: string;
  active: boolean;
  children: ReactNode;
  onNavigate: () => void;
};

function WorkspacePill({ href, active, children, onNavigate }: WorkspacePillProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "touch-manipulation rounded-full px-3 py-1.5 text-sm font-semibold transition duration-150 active:scale-95",
        active
          ? "bg-white text-black"
          : "text-white/85 hover:bg-white/15 hover:text-white",
      )}
    >
      {children}
    </Link>
  );
}

type DockLinkProps = {
  href: string;
  label: string;
  active: boolean;
  onNavigate: () => void;
  compact?: boolean;
};

function renderIconForHref(href: string, className: string) {
  return createElement(LINK_ICONS[href] ?? Circle, { className });
}

function DockLink({ href, label, active, onNavigate, compact = false }: DockLinkProps) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "touch-manipulation rounded-2xl border transition duration-150 active:scale-[0.98]",
        compact
          ? "flex items-center gap-2 px-3 py-2 text-sm font-medium"
          : "flex flex-col items-center gap-1 px-3 py-2 text-center text-xs font-semibold sm:text-sm",
        active
          ? "border-white/70 bg-white text-black shadow-[0_10px_24px_-16px_rgba(255,255,255,0.95)]"
          : "border-white/20 bg-white/[0.04] text-white hover:bg-white/12",
      )}
    >
      {renderIconForHref(href, cn("size-4", compact ? "shrink-0" : "size-4 sm:size-5"))}
      <span>{label}</span>
    </Link>
  );
}

export function GlassNav({ mode, primaryLinks, menuSections }: GlassNavProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isApp = Boolean((menuSections?.length ?? 0) || (primaryLinks?.length ?? 0));

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY;
    const originalBody = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBody.overflow;
      document.body.style.position = originalBody.position;
      document.body.style.top = originalBody.top;
      document.body.style.width = originalBody.width;
      document.documentElement.style.overflow = originalHtmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  const allSections = useMemo(() => menuSections ?? [], [menuSections]);
  const compactPrimary = useMemo(() => primaryLinks ?? [], [primaryLinks]);
  const closeMenu = () => setIsOpen(false);

  if (!isApp || !mode) {
    return <PublicNavBar />;
  }

  const homeHref = workspaceHome(mode);
  const officeActive = isOfficeContext(pathname);
  const fieldActive = isFieldContext(pathname);

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 print:hidden sm:px-6"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)" }}
      >
        <div className="mx-auto w-full max-w-6xl">
          <div className="pointer-events-auto rounded-3xl border border-white/20 bg-black/30 p-2.5 shadow-2xl backdrop-blur-2xl sm:p-3">
            <div className="flex items-center gap-2">
              <Link
                href={homeHref}
                onClick={closeMenu}
                className="touch-manipulation shrink-0 truncate rounded-full px-2 py-1 text-sm font-semibold text-white/95 transition duration-150 hover:bg-white/10 active:scale-95"
              >
                Tommy D&apos;s
              </Link>

              <span className="hidden h-4 w-px bg-white/20 sm:block" aria-hidden />

              {mode === "admin" ? (
                <div className="flex flex-wrap items-center gap-1">
                  <WorkspacePill href="/admin" active={officeActive} onNavigate={closeMenu}>
                    Office
                  </WorkspacePill>
                  <WorkspacePill href="/m" active={fieldActive} onNavigate={closeMenu}>
                    Field
                  </WorkspacePill>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <WorkspacePill href="/m" active={fieldActive} onNavigate={closeMenu}>
                    My jobs
                  </WorkspacePill>
                </div>
              )}

              <div className="ml-auto flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls="glass-app-pages-panel"
                  onClick={() => setIsOpen((open) => !open)}
                  className={cn(
                    "touch-manipulation rounded-full px-3 py-1.5 text-sm font-semibold transition duration-150 active:scale-95",
                    isOpen
                      ? "bg-white text-black"
                      : "border border-white/25 bg-white/5 text-white/90 hover:bg-white/15",
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="size-4" />
                    <span className="hidden sm:inline">Launchpad</span>
                  </span>
                </button>
                <form action="/auth/logout" method="post" className="hidden sm:block">
                  <FormSubmitButton
                    pendingLabel="…"
                    className="touch-manipulation rounded-full px-3 py-1.5 text-sm font-semibold text-white/85 transition duration-150 hover:bg-white/15 hover:text-white active:scale-95 disabled:opacity-60"
                  >
                    Sign out
                  </FormSubmitButton>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isOpen ? (
        <>
          <button
            aria-label="Close navigation"
            type="button"
            onClick={closeMenu}
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] print:hidden"
          />
          <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-20 print:hidden sm:p-6 sm:pt-24">
            <div
              id="glass-app-pages-panel"
              className="pointer-events-auto w-full max-w-xl rounded-3xl border border-white/20 bg-black/70 p-4 shadow-2xl backdrop-blur-2xl"
            >
              <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                <Link
                  href={mode === "admin" ? "/admin" : "/m"}
                  onClick={closeMenu}
                  className="group/lp -m-1 flex min-w-0 flex-1 items-start gap-2 rounded-xl p-1 text-left transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
                  aria-label="Open command center (dashboard)"
                >
                  <span className="mt-0.5 shrink-0 rounded-full bg-white/10 p-1.5 transition group-hover/lp:bg-white/15">
                    <Sparkles className="size-4 text-white" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">Launchpad</p>
                    <p className="text-xs leading-snug text-white/60">
                      Tap this row for Command center (dashboard). Scroll for Today, Look up, and back office menus.
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={closeMenu}
                  className="shrink-0 rounded-full border border-white/15 bg-white/5 p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
                  aria-label="Close launchpad"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-3 space-y-4">
                {compactPrimary.length > 0 ? (
                  <div>
                    <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-white/55">
                      Today
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {compactPrimary.map((link) => (
                        <DockLink
                          key={`core-${link.href}`}
                          href={link.href}
                          label={link.label}
                          active={isLinkActive(pathname, link.href)}
                          onNavigate={closeMenu}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                {allSections.map((section) => {
                  if (section.groups?.length) {
                    return (
                      <div key={section.title}>
                        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-white/55">
                          {section.title}
                        </p>
                        <div className="space-y-1.5">
                          {section.groups.map((group) => (
                            <details
                              key={`${section.title}-${group.title}`}
                              className="group/dtl overflow-hidden rounded-xl border border-white/15 bg-white/[0.04]"
                            >
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/[0.06] [&::-webkit-details-marker]:hidden">
                                <span>{group.title}</span>
                                <ChevronDown
                                  className="size-4 shrink-0 text-white/45 transition duration-200 group-open/dtl:rotate-180"
                                  aria-hidden
                                />
                              </summary>
                              <div className="border-t border-white/10 px-2 pb-2 pt-1.5">
                                <div className="grid gap-1.5 sm:grid-cols-2">
                                  {group.links.map((link) => (
                                    <DockLink
                                      key={`${group.title}-${link.href}`}
                                      href={link.href}
                                      label={link.label}
                                      active={isLinkActive(pathname, link.href)}
                                      onNavigate={closeMenu}
                                      compact
                                    />
                                  ))}
                                </div>
                              </div>
                            </details>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  if (section.links?.length) {
                    return (
                      <div key={section.title}>
                        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-white/55">
                          {section.title}
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {section.links.map((link) => (
                            <DockLink
                              key={`${section.title}-${link.href}`}
                              href={link.href}
                              label={link.label}
                              active={isLinkActive(pathname, link.href)}
                              onNavigate={closeMenu}
                              compact
                            />
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}

                <div className="grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-2">
                  <Link
                    href="/"
                    onClick={closeMenu}
                    className="touch-manipulation rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/12"
                  >
                    Public site
                  </Link>
                  <div className="sm:hidden">
                    <form action="/auth/logout" method="post">
                      <FormSubmitButton
                        pendingLabel="Signing out…"
                        className="w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-left text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-60"
                      >
                        Sign out
                      </FormSubmitButton>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
