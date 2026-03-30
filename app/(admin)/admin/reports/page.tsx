import Link from "next/link";

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Dedicated reports for business operations and cost visibility.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Fleet reports</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Keep fuel costs visible across multiple trucks, van units, and gas cards.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/admin/reports/gas"
            className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40"
          >
            Open gas spending report
          </Link>
          <Link
            href="/admin/analytics"
            className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40"
          >
            View analytics summary
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Other reports</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          More report modules can be added here over time (job status, collections, crew utilization, etc.).
        </p>
      </section>
    </div>
  );
}
