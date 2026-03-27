import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { JobKindBadge } from "@/components/JobKindBadge";
import { JobStatusBadge } from "@/components/JobStatusBadge";
import { SubmitButton } from "@/components/SubmitButton";
import { getCrewDisplayName } from "@/lib/crews";
import { jobHasRecordedPayments } from "@/lib/job-destruct";
import { setToastCookie } from "@/lib/toast";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

async function deleteJobFromList(formData: FormData) {
  "use server";
  const jobId = String(formData.get("job_id") ?? "").trim();
  if (!jobId) return;
  const supabase = await createSupabaseServerClientForData();
  if (await jobHasRecordedPayments(supabase, jobId)) {
    await setToastCookie("Cannot delete: this job has recorded invoice payments");
    revalidatePath("/admin/jobs");
    return;
  }
  await supabase.from("jobs").delete().eq("id", jobId);
  revalidatePath("/admin/jobs");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/quotes");
  await setToastCookie("Job deleted");
  redirect("/admin/jobs");
}

function jobsListHref(crewId: string | undefined, kind: "installation" | "service" | null): string {
  const params = new URLSearchParams();
  if (crewId) params.set("crew_id", crewId);
  if (kind) params.set("kind", kind);
  const q = params.toString();
  return q ? `/admin/jobs?${q}` : "/admin/jobs";
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ crew_id?: string; kind?: string }>;
}) {
  const { crew_id: filterCrewId, kind: kindParam } = await searchParams;
  const kindFilter = kindParam === "service" || kindParam === "installation" ? kindParam : null;

  const supabase = await createSupabaseServerClientForData();
  let jobsQuery = supabase
    .from("jobs")
    .select("id,title,status,job_kind,scheduled_start,assigned_crew_id,customers(name),profiles(full_name),crews(name,specialty),invoices(id,invoice_number,balance_due_cents)")
    .order("created_at", { ascending: false });
  if (filterCrewId) jobsQuery = jobsQuery.eq("assigned_crew_id", filterCrewId);
  if (kindFilter) jobsQuery = jobsQuery.eq("job_kind", kindFilter);

  const [jobsResult, crewsResult] = await Promise.all([
    jobsQuery,
    supabase
      .from("crews")
      .select("id,name,specialty,crew_members(user_id,profiles(user_id,full_name))")
      .order("name", { ascending: true }),
  ]);

  const crewsRaw = crewsResult.data ?? [];
  const crews = crewsRaw.map((c: { id: string; name: string; specialty: string; crew_members?: unknown }) => ({
    id: c.id,
    name: getCrewDisplayName({ name: c.name, crew_members: c.crew_members }),
    specialty: c.specialty,
  }));

  type JobRow = {
    id: string;
    title: string;
    status: string;
    job_kind: "installation" | "service";
    scheduled_start: string | null;
    assigned_crew_id: string | null;
    customers: { name: string } | { name: string }[] | null;
    profiles: { full_name: string | null } | { full_name: string | null }[] | null;
    crews: { name: string; specialty: string } | { name: string; specialty: string }[] | null;
    invoices: { id: string; invoice_number: number; balance_due_cents: number }[] | { id: string; invoice_number: number; balance_due_cents: number } | null;
  };

  const jobs = (jobsResult.data ?? []) as JobRow[];
  const rows = jobs.map((job) => {
    const customer = Array.isArray(job.customers) ? job.customers[0]?.name : job.customers?.name;
    const jobCrew = Array.isArray(job.crews) ? job.crews[0] : job.crews;
    const crewDisplayName = job.assigned_crew_id
      ? crews.find((c) => c.id === job.assigned_crew_id)?.name ?? jobCrew?.name
      : jobCrew?.name;
    const installer = Array.isArray(job.profiles) ? job.profiles[0]?.full_name : job.profiles?.full_name;
    const rowKind: "installation" | "service" =
      job.job_kind === "service" ? "service" : "installation";
    const invoice = Array.isArray(job.invoices) ? job.invoices[0] : job.invoices;
    return {
      ...job,
      customer,
      crewDisplayName,
      installer,
      rowKind,
      invoice,
      scheduledLabel: job.scheduled_start ? new Date(job.scheduled_start).toLocaleString() : "Unscheduled",
    };
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="animate-fade-in-section schedule-delay-0 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Admin</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Jobs</h1>
          <p className="text-muted-foreground text-[15px] leading-relaxed max-w-xl">
            View and manage all jobs. Open a job to update schedule, assign crew, add an invoice and line items.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Link href="/admin/jobs/new" className="btn-primary">
            New job
          </Link>
          <Link href="/admin/schedule" className="btn-secondary">
            Schedule
          </Link>
        </div>
      </header>

      <section className="animate-card-in schedule-delay-75 form-card overflow-hidden rounded-2xl p-0 shadow-lg shadow-black/5 transition-shadow duration-300 hover:shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3 sm:px-6">
          <h2 className="text-base font-semibold text-foreground">All jobs</h2>
          <div className="w-full sm:w-auto">
            <form method="get" className="grid gap-2 sm:hidden">
              <div className="grid grid-cols-2 gap-2">
                <select name="kind" defaultValue={kindFilter ?? ""} className="field">
                  <option value="">All kinds</option>
                  <option value="installation">Installation</option>
                  <option value="service">Service</option>
                </select>
                <select name="crew_id" defaultValue={filterCrewId ?? ""} className="field">
                  <option value="">All crews</option>
                  {crews.map((crew) => (
                    <option key={crew.id} value={crew.id}>
                      {crew.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button type="submit" className="btn-secondary w-full">
                  Apply filters
                </button>
                <Link href="/admin/jobs" className="btn-secondary w-full text-center">
                  Reset
                </Link>
              </div>
            </form>

            <div className="hidden flex-col items-end gap-2 sm:flex sm:flex-row sm:items-center sm:gap-3">
              <div className="flex flex-wrap items-center justify-end gap-1">
                <span className="mr-1 text-xs font-medium text-muted-foreground">Kind</span>
                <Link
                  href={jobsListHref(filterCrewId, null)}
                  className={`rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${!kindFilter ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  All
                </Link>
                <Link
                  href={jobsListHref(filterCrewId, "installation")}
                  className={`rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${kindFilter === "installation" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  Installation
                </Link>
                <Link
                  href={jobsListHref(filterCrewId, "service")}
                  className={`rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${kindFilter === "service" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  Service
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <span className="mr-1 text-xs font-medium text-muted-foreground">Crew</span>
                <Link
                  href={jobsListHref(undefined, kindFilter)}
                  className={`rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${!filterCrewId ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  All crews
                </Link>
                {crews.map((crew) => (
                  <Link
                    key={crew.id}
                    href={jobsListHref(filterCrewId === crew.id ? undefined : crew.id, kindFilter)}
                    className={`rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${filterCrewId === crew.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                  >
                    {crew.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-3 px-4 py-3 sm:hidden">
          {rows.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              {filterCrewId
                ? "No jobs for this crew. Change filters to see more jobs."
                : "No jobs yet. Create your first job."}
            </div>
          ) : (
            rows.map((job) => (
              <article key={job.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{job.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{job.customer ?? "No customer"}</p>
                  </div>
                  <JobStatusBadge status={job.status} />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <JobKindBadge kind={job.rowKind} />
                  {job.invoice ? (
                    <Link href={`/admin/invoices/${job.invoice.id}`} className="link text-sm">
                      Invoice #{job.invoice.invoice_number}
                    </Link>
                  ) : (
                    <span className="text-sm text-muted-foreground">No invoice</span>
                  )}
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p>
                    <span className="text-foreground/80">Crew:</span> {job.crewDisplayName ?? "—"}
                  </p>
                  <p>
                    <span className="text-foreground/80">Installer:</span> {job.installer ?? "Unassigned"}
                  </p>
                  <p>
                    <span className="text-foreground/80">Scheduled:</span> {job.scheduledLabel}
                  </p>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <Link href={`/jobs/${job.id}`} className="btn-secondary w-full text-center">
                    Open job
                  </Link>
                  <form action={deleteJobFromList}>
                    <input type="hidden" name="job_id" value={job.id} />
                    <SubmitButton variant="danger" className="w-full text-xs" pendingLabel="Deleting…">
                      Delete job
                    </SubmitButton>
                  </form>
                </div>
              </article>
            ))
          )}
        </div>

        <div className="table-wrap hidden overflow-x-auto px-4 py-2 sm:block sm:px-6 sm:py-3">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="table-header py-3 pl-5 pr-4">Title</th>
                <th className="table-header py-3 pr-4">Kind</th>
                <th className="table-header py-3 pr-4">Customer</th>
                <th className="table-header py-3 pr-4">Invoice #</th>
                <th className="table-header py-3 pr-4">Crew</th>
                <th className="table-header py-3 pr-4">Installer</th>
                <th className="table-header py-3 pr-4">Scheduled</th>
                <th className="table-header py-3 pr-4">Status</th>
                <th className="table-header py-3 pr-5">Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                    {filterCrewId
                      ? "No jobs for this crew. Create a job and assign this crew, or clear the filter."
                      : "No jobs yet. "}
                    {!filterCrewId && (
                      <>
                        <Link href="/admin/jobs/new" className="link font-medium">Create a job</Link>
                        {" — add a customer first in "}
                        <Link href="/admin/customers" className="link">Customers</Link>
                        {" if needed."}
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((job) => (
                  <tr key={job.id} className="border-b border-border transition-all duration-200 hover:bg-muted/30">
                    <td className="py-3 pl-5 pr-4 font-medium text-foreground">{job.title}</td>
                    <td className="py-3 pr-4">
                      <JobKindBadge kind={job.rowKind} />
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{job.customer ?? "-"}</td>
                    <td className="py-3 pr-4 tabular-nums text-muted-foreground">
                      {job.invoice ? (
                        <Link href={`/admin/invoices/${job.invoice.id}`} className="hover:underline">
                          #{job.invoice.invoice_number}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{job.crewDisplayName ?? "—"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{job.installer ?? "Unassigned"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{job.scheduledLabel}</td>
                    <td className="py-3 pr-4">
                      <JobStatusBadge status={job.status} />
                    </td>
                    <td className="py-3 pr-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/jobs/${job.id}`} className="link">
                          Open
                        </Link>
                        <form action={deleteJobFromList} className="inline">
                          <input type="hidden" name="job_id" value={job.id} />
                          <SubmitButton variant="danger" className="text-xs" pendingLabel="Deleting…">
                            Delete
                          </SubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
