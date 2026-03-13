import Link from "next/link";

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reports and summaries will appear here. Planned: jobs by status, revenue, and activity summaries.
        </p>
      </div>
      <section className="rounded-xl border border-border bg-card p-8 shadow-sm text-center">
        <p className="text-muted-foreground">Reports are not built yet.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Use <Link href="/admin/jobs" className="link">Jobs</Link> and <Link href="/admin" className="link">Today</Link> for now.
        </p>
      </section>
    </div>
  );
}
