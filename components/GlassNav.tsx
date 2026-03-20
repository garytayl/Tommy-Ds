"use client";

import type { ReactNode } from "react";

import { FormSubmitButton } from "@/components/forms/FormSubmitButton";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

export type GlassNavLink = {
  label: string;
  href: string;
  description?: string;
};

export type GlassNavSection = {
  title: string;
  links: GlassNavLink[];
};

type GlassNavProps = {
  /** When set with `menuSections`, shows signed-in app chrome (Office / Field + All pages). */
  mode?: "admin" | "field";
  menuSections?: GlassNavSection[];
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
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
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
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
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] sm:hidden"
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

export function GlassNav({ mode, menuSections }: GlassNavProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isApp = Boolean(menuSections?.length);

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
  const closeMenu = () => setIsOpen(false);

  if (!isApp || !mode) {
    return <PublicNavBar />;
  }

  const homeHref = workspaceHome(mode);
  const officeActive = isOfficeContext(pathname);
  const fieldActive = isFieldContext(pathname);

  const contextTitle = mode === "field" ? "Field app" : "Office app";
  const contextBlurb =
    mode === "field"
      ? "Jobs and photos for installers."
      : "Schedule, customers, billing, and team.";

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="pointer-events-auto rounded-2xl border border-white/20 bg-black/30 px-3 py-2.5 shadow-2xl backdrop-blur-xl sm:rounded-full sm:px-4 sm:py-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
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
                  All pages
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

          <div
            id="glass-app-pages-panel"
            className={cn(
              "pointer-events-auto mt-2 origin-top rounded-2xl border border-white/20 bg-black/50 p-4 shadow-2xl backdrop-blur-xl transition-all duration-200 max-h-[min(70dvh,520px)] overflow-y-auto overscroll-contain",
              isOpen
                ? "translate-y-0 scale-100 opacity-100"
                : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
            )}
          >
            <div className="border-b border-white/15 pb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/55">{contextTitle}</p>
              <p className="mt-1 text-xs text-white/70">{contextBlurb}</p>
            </div>

            <div className="mt-4 space-y-4">
              {allSections.map((section) => (
                <div key={section.title}>
                  <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-white/55">
                    {section.title}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {section.links.map((link) => {
                      const active = isActive(pathname, link.href);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={closeMenu}
                          className={cn(
                            "touch-manipulation rounded-xl border px-3 py-2 transition duration-150 active:scale-[0.98]",
                            active
                              ? "border-white/70 bg-white text-black"
                              : "border-white/20 bg-white/5 text-white hover:bg-white/15",
                          )}
                        >
                          <p className="text-sm font-semibold">{link.label}</p>
                          {link.description ? (
                            <p
                              className={cn(
                                "mt-0.5 text-xs",
                                active ? "text-zinc-700" : "text-white/65",
                              )}
                            >
                              {link.description}
                            </p>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="border-t border-white/15 pt-3">
                <Link
                  href="/"
                  onClick={closeMenu}
                  className="block rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85 transition hover:bg-white/10"
                >
                  Public site home
                </Link>
              </div>

              <div className="sm:hidden">
                <form action="/auth/logout" method="post">
                  <FormSubmitButton
                    pendingLabel="Signing out…"
                    className="w-full rounded-xl border border-white/25 bg-white/5 px-3 py-2 text-left text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
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
        <button
          aria-label="Close navigation"
          type="button"
          onClick={closeMenu}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        />
      ) : null}
    </>
  );
}
