import Link from "next/link";

export default function JobNotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 rounded-xl border border-border bg-card p-6 text-center">
      <h1 className="text-lg font-semibold text-foreground">Job not found</h1>
      <p className="text-sm text-muted-foreground">
        This job may have been removed or you may not have access to it. Add{" "}
        <code className="rounded bg-muted px-1">?debug=1</code> to the URL and open the job again for details.
      </p>
      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Link href="/admin/jobs" className="btn-primary">
          All jobs
        </Link>
        <Link href="/admin/schedule" className="btn-secondary">
          Schedule
        </Link>
      </div>
    </div>
  );
}
