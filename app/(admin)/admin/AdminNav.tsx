"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/schedule", label: "Schedule" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/quotes", label: "Estimates" },
  { href: "/admin/crews", label: "Crews" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/invoices", label: "Invoices" },
  { href: "/admin/locations", label: "Locations" },
  { href: "/admin/lots", label: "Lots" },
  { href: "/admin/materials", label: "Materials" },
  { href: "/admin/scan", label: "Scan" },
  { href: "/admin/future-features", label: "Future features" },
];

export function AdminNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <nav className="hidden items-center gap-1 sm:flex">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-2.5 py-2 text-sm font-medium transition touch-manipulation sm:px-3 ${
              pathname === item.href
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "text-primary-foreground/90 hover:text-accent-gold"
            }`}
          >
            {item.label}
          </Link>
        ))}
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
        <div className="absolute left-0 right-0 top-full border-t border-primary-foreground/20 bg-primary px-3 py-3 sm:hidden">
          <ul className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium touch-manipulation ${
                    pathname === item.href
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "text-primary-foreground/90 hover:bg-primary-foreground/10"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/m"
                className="block rounded-lg border border-primary-foreground/30 bg-primary-foreground/10 px-3 py-2.5 text-sm font-medium text-primary-foreground touch-manipulation"
                onClick={() => setMobileMenuOpen(false)}
              >
                Installer View
              </Link>
            </li>
          </ul>
        </div>
      )}
    </>
  );
}
