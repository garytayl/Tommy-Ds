"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "work", label: "Work" },
  { key: "invoice", label: "Invoice" },
  { key: "payments", label: "Payments" },
] as const;

export function JobWorkspaceTabs({ jobId }: { jobId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("tab") || "overview";

  return (
    <div className="border-b border-border">
      <nav className="flex gap-0" aria-label="Job workspace tabs">
        {TABS.map((tab) => {
          const isActive = current === tab.key;
          const href = `${pathname}?tab=${tab.key}`;
          return (
            <Link
              key={tab.key}
              href={href}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
