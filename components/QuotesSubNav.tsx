"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type TabProps = { href: string; label: string; active: boolean };

function Tab({ href, label, active }: TabProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors touch-manipulation",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

export function QuotesSubNav() {
  const pathname = usePathname() ?? "";

  const isList = pathname === "/admin/quotes";
  const isNew = pathname === "/admin/quotes/new";
  const isTemplates = pathname.startsWith("/admin/quotes/templates");

  return (
    <nav
      className="mb-6 rounded-2xl border border-border bg-card/80 px-3 py-3 shadow-sm backdrop-blur-sm print:hidden sm:px-4"
      aria-label="Estimates and quotes"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Estimates &amp; quotes</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tab href="/admin/quotes" label="All" active={isList} />
          <Tab href="/admin/quotes/new" label="New estimate" active={isNew} />
          <Tab href="/admin/quotes/templates" label="Templates" active={isTemplates} />
        </div>
      </div>
    </nav>
  );
}
