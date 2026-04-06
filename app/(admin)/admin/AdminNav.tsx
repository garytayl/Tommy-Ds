"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

/** Daily-driving work: what runs the business. */
const NAV_PRIMARY = [
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/quotes", label: "Estimates" },
] as const;

/** Common lookups — visible, quieter than primary. */
const NAV_SECONDARY = [
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/invoices", label: "Invoices" },
  { href: "/admin/billings", label: "Billings" },
] as const;

/** Look at later / admin / inventory — not daily “what do I do now?” */
const NAV_TOOLS: ReadonlyArray<{
  href: string;
  label: string;
  exact?: boolean;
}> = [
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/reports", label: "Reports", exact: true },
  { href: "/admin/reports/gas", label: "Gas" },
  { href: "/admin/crews", label: "Crews" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/locations", label: "Locations" },
  { href: "/admin/lots", label: "Lots" },
  { href: "/admin/materials", label: "Materials" },
  { href: "/admin/scan", label: "Scan" },
  { href: "/admin/future-features", label: "Future features" },
];

function pathActive(
  pathname: string,
  href: string,
  exact?: boolean,
): boolean {
  if (exact || href === "/admin") {
    return pathname === href;
  }
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

function toolsSectionActive(pathname: string): boolean {
  return NAV_TOOLS.some((item) =>
    pathActive(pathname, item.href, item.exact),
  );
}

export function AdminNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toolsActive = toolsSectionActive(pathname);

  const linkPrimary = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={cn(
        "rounded-lg px-2.5 py-2 text-sm font-semibold tracking-tight transition touch-manipulation sm:px-3",
        active
          ? "bg-primary-foreground/20 text-primary-foreground"
          : "text-primary-foreground/95 hover:text-accent-gold",
      )}
    >
      {label}
    </Link>
  );

  const linkSecondary = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={cn(
        "rounded-lg px-2 py-2 text-sm font-medium transition touch-manipulation sm:px-2.5",
        active
          ? "bg-primary-foreground/15 text-primary-foreground"
          : "text-primary-foreground/75 hover:text-primary-foreground",
      )}
    >
      {label}
    </Link>
  );

  return (
    <>
      <nav className="hidden flex-wrap items-center gap-x-0.5 gap-y-1 sm:flex sm:items-center">
        {NAV_PRIMARY.map((item) => (
          <span key={item.href}>
            {linkPrimary(
              item.href,
              item.label,
              pathActive(pathname, item.href),
            )}
          </span>
        ))}

        <span
          className="mx-1 hidden h-5 w-px shrink-0 bg-primary-foreground/25 sm:inline-block"
          aria-hidden
        />

        {NAV_SECONDARY.map((item) => (
          <span key={item.href}>
            {linkSecondary(
              item.href,
              item.label,
              pathActive(pathname, item.href),
            )}
          </span>
        ))}

        <details className="relative ml-0.5">
          <summary
            className={cn(
              "flex cursor-pointer list-none items-center gap-0.5 rounded-lg px-2.5 py-2 text-sm font-medium transition touch-manipulation sm:px-3",
              "[&::-webkit-details-marker]:hidden",
              toolsActive
                ? "bg-primary-foreground/15 text-primary-foreground"
                : "text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground",
            )}
          >
            Tools
            <svg
              className="h-3.5 w-3.5 opacity-70"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <div
            className="absolute right-0 top-full z-50 mt-1 min-w-[13rem] rounded-xl border border-primary-foreground/20 bg-primary py-1 shadow-lg"
            role="menu"
          >
            {NAV_TOOLS.map((item) => (
              <div key={item.href} className="px-1">
                <Link
                  href={item.href}
                  className={cn(
                    "block rounded-md px-3 py-2 text-sm transition",
                    pathActive(pathname, item.href, item.exact)
                      ? "bg-primary-foreground/15 font-medium text-primary-foreground"
                      : "text-primary-foreground/90 hover:bg-primary-foreground/10",
                  )}
                >
                  {item.label}
                </Link>
              </div>
            ))}
          </div>
        </details>

        <Link
          href="/m"
          className="ml-2 inline-flex items-center rounded-lg border border-primary-foreground/30 bg-primary-foreground px-2.5 py-1.5 text-sm font-medium text-foreground transition hover:bg-foreground hover:text-primary-foreground touch-manipulation sm:px-3"
        >
          Installer
        </Link>
      </nav>

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

      {mobileMenuOpen && (
        <div className="absolute left-0 right-0 top-full max-h-[min(85vh,calc(100dvh-4rem))] overflow-y-auto border-t border-primary-foreground/20 bg-primary px-3 py-3 sm:hidden">
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/50">
            Today
          </p>
          <ul className="flex flex-col gap-0.5">
            {NAV_PRIMARY.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block rounded-lg px-3 py-2.5 text-base font-semibold touch-manipulation",
                    pathActive(pathname, item.href)
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "text-primary-foreground/95 hover:bg-primary-foreground/10",
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <p className="mb-1.5 mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/50">
            Look up
          </p>
          <ul className="flex flex-col gap-0.5">
            {NAV_SECONDARY.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block rounded-lg px-3 py-2.5 text-sm font-medium touch-manipulation",
                    pathActive(pathname, item.href)
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : "text-primary-foreground/80 hover:bg-primary-foreground/10",
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <p className="mb-1.5 mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/50">
            Tools &amp; back office
          </p>
          <ul className="flex flex-col gap-0.5">
            {NAV_TOOLS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm touch-manipulation",
                    pathActive(pathname, item.href, item.exact)
                      ? "bg-primary-foreground/15 font-medium text-primary-foreground"
                      : "text-primary-foreground/75 hover:bg-primary-foreground/10",
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-primary-foreground/15 pt-3">
            <Link
              href="/m"
              className="block rounded-lg border border-primary-foreground/30 bg-primary-foreground/10 px-3 py-2.5 text-center text-sm font-medium text-primary-foreground touch-manipulation"
              onClick={() => setMobileMenuOpen(false)}
            >
              Installer view
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
