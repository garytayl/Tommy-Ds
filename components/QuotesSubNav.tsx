"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseQuoteId(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "admin" || parts[1] !== "quotes") return null;
  const id = parts[2];
  if (!id || id === "new" || !UUID_RE.test(id)) return null;
  return id;
}

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
  const quoteId = parseQuoteId(pathname);

  const isList = pathname === "/admin/quotes";
  const isNew = pathname.startsWith("/admin/quotes/new");
  const isPrintEdit = pathname.includes("/print/edit");
  const isPrintOnly =
    pathname.includes("/admin/quotes/") && pathname.endsWith("/print") && !pathname.includes("/print/edit");
  const isDetail =
    quoteId != null && !pathname.includes("/print");

  return (
    <nav
      className="mb-6 rounded-2xl border border-border bg-card/80 px-3 py-3 shadow-sm backdrop-blur-sm print:hidden sm:px-4"
      aria-label="Estimates and quotes"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Estimates &amp; quotes</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Create, edit, print, and convert to a job — use the tabs to move between steps.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tab href="/admin/quotes" label="All" active={isList} />
          <Tab href="/admin/quotes/new" label="New estimate" active={isNew} />
        </div>
      </div>

      {quoteId && (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">This record</p>
          <div className="flex flex-wrap items-center gap-2">
            <Tab href={`/admin/quotes/${quoteId}`} label="Quote" active={isDetail} />
            <Tab
              href={`/admin/quotes/${quoteId}/print/edit`}
              label="Prepare PDF"
              active={isPrintEdit}
            />
            <Tab href={`/admin/quotes/${quoteId}/print`} label="Preview" active={isPrintOnly} />
          </div>
        </div>
      )}
    </nav>
  );
}
