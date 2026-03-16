import Link from "next/link";

import { CollectPaymentButton } from "@/components/CollectPaymentButton";
import { getCrewDisplayName } from "@/lib/crews";
import { JobStatusBadge } from "@/components/JobStatusBadge";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ crew_id?: string }>;
}) {
  const { crew_id: filterCrewId } = await searchParams;

  const supabase = await createSupabaseServerClientForData();
  let jobsQuery = supabase
    .from("jobs")
    .select("id,title,status,scheduled_start,assigned_crew_id,customers(name),profiles(full_name),crews(name,specialty),invoices(id,invoice_number,balance_due_cents)")
    .order("created_at", { ascending: false });
  if (filterCrewId) jobsQuery = jobsQuery.eq("assigned_crew_id", filterCrewId);

  const [jobsResult, installersResult, crewMembersResult, crewsResult] = await Promise.all([
    jobsQuery,
    supabase
      .from("profiles")
      .select("user_id,full_name")
      .eq("role", "installer")
      .order("full_name", { ascending: true }),
    supabase
      .from("crew_members")
      .select("user_id,profiles(user_id,full_name)")
      .order("user_id"),
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

  const installersList = (installersResult.data ?? []) as { user_id: string; full_name: string | null }[];
  const crewMembers = (crewMembersResult.data ?? []) as { user_id: string; profiles: { user_id: string; full_name: string | null } | { user_id: string; full_name: string | null }[] | null }[];
  const crewMemberProfiles = crewMembers.map((m) => {
    const p = m.profiles;
    const prof = Array.isArray(p) ? p[0] : p;
    return { user_id: m.user_id, full_name: prof?.full_name ?? null };
  });
  const installerIds = new Set(installersList.map((i) => i.user_id));
  const mergedInstallers = [
    ...installersList,
    ...crewMemberProfiles.filter((c) => !installerIds.has(c.user_id)),
  ];
  const installers = mergedInstallers.length > 0 ? mergedInstallers : installersList;

  type JobRow = {
    id: string;
    title: string;
    status: string;
    scheduled_start: string | null;
    assigned_crew_id: string | null;
    customers: { name: string } | { name: string }[] | null;
    profiles: { full_name: string | null } | { full_name: string | null }[] | null;
    crews: { name: string; specialty: string } | { name: string; specialty: string }[] | null;
    invoices: { id: string; invoice_number: number; balance_due_cents: number }[] | { id: string; invoice_number: number; balance_due_cents: number } | null;
  };

  const jobs = (jobsResult.data ?? []) as JobRow[];

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
          <div className="flex flex-wrap items-center gap-1">
            <Link
              href="/admin/jobs"
              className={`rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${!filterCrewId ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              All crews
            </Link>
            {crews.map((crew) => (
              <Link
                key={crew.id}
                href={filterCrewId === crew.id ? "/admin/jobs" : `/admin/jobs?crew_id=${crew.id}`}
                className={`rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${filterCrewId === crew.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                {crew.name}
              </Link>
            ))}
          </div>
        </div>
        <div className="table-wrap overflow-x-auto px-4 py-2 sm:px-6 sm:py-3">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="table-header py-3 pl-5 pr-4">Title</th>
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
                  <td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
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
                jobs.map((job) => {
                const customer = Array.isArray(job.customers)
                  ? job.customers[0]?.name
                  : job.customers?.name;
                const jobCrew = Array.isArray(job.crews) ? job.crews[0] : job.crews;
                const crewDisplayName = job.assigned_crew_id
                  ? crews.find((c) => c.id === job.assigned_crew_id)?.name ?? jobCrew?.name
                  : jobCrew?.name;
                const installer = Array.isArray(job.profiles)
                  ? job.profiles[0]?.full_name
                  : job.profiles?.full_name;

                const invoice = Array.isArray(job.invoices) ? job.invoices[0] : job.invoices;
                const hasBalanceDue = invoice && invoice.balance_due_cents > 0;
                return (
                  <tr key={job.id} className="border-b border-border transition-all duration-200 hover:bg-muted/30">
                    <td className="py-3 pl-5 pr-4 font-medium text-foreground">{job.title}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{customer ?? "-"}</td>
                    <td className="py-3 pr-4 tabular-nums text-muted-foreground">
                      {invoice ? (
                        <Link href={`/admin/invoices/${invoice.id}`} className="hover:underline">
                          #{invoice.invoice_number}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{crewDisplayName ?? "—"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{installer ?? "Unassigned"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {job.scheduled_start
                        ? new Date(job.scheduled_start).toLocaleString()
                        : "Unscheduled"}
                    </td>
                    <td className="py-3 pr-4">
                      <JobStatusBadge status={job.status} />
                    </td>
                    <td className="py-3 pr-5 flex flex-wrap items-center gap-2">
                      <Link href={`/jobs/${job.id}`} className="link">
                        Open
                      </Link>
                      {hasBalanceDue && (
                        <CollectPaymentButton
                          invoiceId={invoice!.id}
                          disabled={false}
                          compact
                        />
                      )}
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
