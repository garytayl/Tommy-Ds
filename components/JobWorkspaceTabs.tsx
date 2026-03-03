"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { DevHint } from "@/components/DevHint";

const TABS = [
  { key: "overview", label: "Overview", hint: "Schedule, installer, notes. Jobs table." },
  { key: "work", label: "Work", hint: "Field notes, job photos, mark complete. job_photos + jobs.notes." },
  { key: "invoice", label: "Invoice", hint: "Line items, tax. invoices + invoice_items; recompute_invoice_totals." },
  { key: "payments", label: "Payments", hint: "Collect (Stripe Checkout), payment history. payments table." },
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
            <DevHint key={tab.key} message={tab.hint}>
              <Link
                href={href}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                }`}
              >
                {tab.label}
              </Link>
            </DevHint>
          );
        })}
      </nav>
    </div>
  );
}
