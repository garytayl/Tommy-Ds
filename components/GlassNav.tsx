"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  primaryLinks?: GlassNavLink[];
  menuSections?: GlassNavSection[];
};

const DEFAULT_PRIMARY_LINKS: GlassNavLink[] = [
  { label: "Home", href: "/" },
  { label: "Office", href: "/admin" },
  { label: "Installer", href: "/m" },
];

const DEFAULT_MENU_SECTIONS: GlassNavSection[] = [
  {
    title: "Main",
    links: [
      { label: "Home", href: "/" },
      { label: "Office dashboard", href: "/admin", description: "Admin workspace" },
      { label: "Installer view", href: "/m", description: "Field job workflow" },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function GlassNav({
  primaryLinks = DEFAULT_PRIMARY_LINKS,
  menuSections = DEFAULT_MENU_SECTIONS,
}: GlassNavProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Prevent the underlying page from scrolling on mobile while menu is open.
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

  const allSections = useMemo(() => menuSections, [menuSections]);
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="pointer-events-auto rounded-full border border-white/20 bg-black/25 px-3 py-2 shadow-2xl backdrop-blur-xl sm:px-5 sm:py-2.5">
            <div className="flex items-center justify-between gap-2">
              <Link
                href="/"
                onClick={closeMenu}
                className="truncate rounded-full px-2 py-1 text-sm font-semibold text-white/95 transition hover:bg-white/10"
              >
                Tommy D&apos;s
              </Link>

              <div className="hidden items-center gap-1 md:flex">
                {primaryLinks.map((link) => {
                  const active = isActive(pathname, link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMenu}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                        active
                          ? "bg-white text-black"
                          : "text-white/85 hover:bg-white/15 hover:text-white"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls="glass-global-menu"
                  onClick={() => setIsOpen((open) => !open)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    isOpen
                      ? "bg-white text-black"
                      : "text-white/85 hover:bg-white/15 hover:text-white"
                  }`}
                >
                  Menu
                </button>
              </div>

              <div className="flex items-center gap-1 md:hidden">
                <Link
                  href="/"
                  onClick={closeMenu}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                    isActive(pathname, "/")
                      ? "bg-white text-black"
                      : "text-white/85 hover:bg-white/15 hover:text-white"
                  }`}
                >
                  Home
                </Link>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls="glass-global-menu"
                  onClick={() => setIsOpen((open) => !open)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                    isOpen
                      ? "bg-white text-black"
                      : "text-white/85 hover:bg-white/15 hover:text-white"
                  }`}
                >
                  Menu
                </button>
              </div>
            </div>
          </div>

          <div
            id="glass-global-menu"
            className={`pointer-events-auto mt-2 origin-top rounded-2xl border border-white/20 bg-black/45 p-3 shadow-2xl backdrop-blur-xl transition-all duration-200 max-h-[calc(100dvh-5.5rem)] overflow-y-auto overscroll-contain ${
              isOpen
                ? "translate-y-0 scale-100 opacity-100"
                : "-translate-y-1 scale-[0.98] opacity-0 pointer-events-none"
            }`}
          >
            <div className="space-y-3">
              {allSections.map((section) => (
                <div key={section.title}>
                  <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-white/60">
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
                          className={`rounded-xl border px-3 py-2 transition ${
                            active
                              ? "border-white/70 bg-white text-black"
                              : "border-white/20 bg-white/5 text-white hover:bg-white/15"
                          }`}
                        >
                          <p className="text-sm font-semibold">{link.label}</p>
                          {link.description ? (
                            <p
                              className={`mt-0.5 text-xs ${
                                active ? "text-zinc-700" : "text-white/65"
                              }`}
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
            </div>
          </div>
        </div>
      </div>

      {isOpen ? (
        <button
          aria-label="Close navigation menu"
          type="button"
          onClick={closeMenu}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        />
      ) : null}
    </>
  );
}
