import Link from "next/link";
import { revalidatePath } from "next/cache";

import { CollectPaymentButton } from "@/components/CollectPaymentButton";
import { JobStatusBadge } from "@/components/JobStatusBadge";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

const JOB_STATUSES = [
  "lead",
  "scheduled",
  "in_progress",
  "completed",
  "paid",
  "canceled",
];

function toIsoOrNull(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ crew_id?: string; use_customer_id?: string }>;
}) {
  const { crew_id: filterCrewId, use_customer_id: useCustomerId } = await searchParams;

  async function createCustomerAndRedirect(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    if (!name) return;
    const supabase = await createSupabaseServerClientForData();
    const { data: newCustomer } = await supabase
      .from("customers")
      .insert({ name, phone: phone || null, email: email || null })
      .select("id")
      .single();
    if (newCustomer) {
      revalidatePath("/admin/jobs");
      revalidatePath("/admin/customers");
      const { redirect } = await import("next/navigation");
      redirect(`/admin/jobs?use_customer_id=${newCustomer.id}#create`);
    }
  }

  async function createJob(formData: FormData) {
    "use server";

    const customerId = String(formData.get("customer_id") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const address1 = String(formData.get("address_line1") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const state = String(formData.get("state") ?? "IN").trim() || "IN";
    const zip = String(formData.get("zip") ?? "").trim();

    if (!customerId || !title || !address1 || !city || !zip) return;

    const supabase = await createSupabaseServerClientForData();
    await supabase.from("jobs").insert({
      customer_id: customerId,
      title,
      address_line1: address1,
      address_line2: String(formData.get("address_line2") ?? "").trim() || null,
      city,
      state,
      zip,
      scheduled_start: toIsoOrNull(formData.get("scheduled_start")),
      scheduled_end: toIsoOrNull(formData.get("scheduled_end")),
      assigned_installer_id:
        String(formData.get("assigned_installer_id") ?? "").trim() || null,
      assigned_crew_id: String(formData.get("assigned_crew_id") ?? "").trim() || null,
      status: String(formData.get("status") ?? "lead"),
      notes: String(formData.get("notes") ?? "").trim() || null,
    });

    revalidatePath("/admin/jobs");
    revalidatePath("/admin/schedule");
    revalidatePath("/admin");
  }

  const supabase = await createSupabaseServerClientForData();
  let jobsQuery = supabase
    .from("jobs")
    .select("id,title,status,scheduled_start,customers(name),profiles(full_name),crews(name,specialty),invoices(id,invoice_number,balance_due_cents)")
    .order("created_at", { ascending: false });
  if (filterCrewId) jobsQuery = jobsQuery.eq("assigned_crew_id", filterCrewId);

  const [jobsResult, customersResult, installersResult, crewMembersResult, crewsResult] = await Promise.all([
    jobsQuery,
    supabase.from("customers").select("id,name").order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("user_id,full_name")
      .eq("role", "installer")
      .order("full_name", { ascending: true }),
    supabase
      .from("crew_members")
      .select("user_id,profiles(user_id,full_name)")
      .order("user_id"),
    supabase.from("crews").select("id,name,specialty").order("name", { ascending: true }),
  ]);

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
    customers: { name: string } | { name: string }[] | null;
    profiles: { full_name: string | null } | { full_name: string | null }[] | null;
    crews: { name: string; specialty: string } | { name: string; specialty: string }[] | null;
    invoices: { id: string; invoice_number: number; balance_due_cents: number }[] | { id: string; invoice_number: number; balance_due_cents: number } | null;
  };

  const jobs = (jobsResult.data ?? []) as JobRow[];
  const crews = crewsResult.data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Jobs
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and manage jobs, set schedule, assign crews and installers. Open a job to add an invoice and set prices.
        </p>
      </div>
      <section id="create" className="rounded-xl border border-border bg-card p-5 shadow-sm scroll-mt-4">
        <span className="block h-1 w-12 rounded-full bg-primary/80" />
        <h2 className="mt-3 text-base font-semibold text-foreground">Create job</h2>
        <p className="mt-1 text-sm text-muted-foreground">Add to schedule with date/time below. Assign a crew to organize the calendar. Then open the job to create an invoice and add line items (price).</p>
        <details className="mt-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-foreground">Quick add customer</summary>
          <form action={createCustomerAndRedirect} className="mt-3 grid gap-2 sm:grid-cols-4">
            <input type="text" name="name" required placeholder="Name" className="field" />
            <input type="text" name="phone" placeholder="Phone" className="field" />
            <input type="email" name="email" placeholder="Email" className="field" />
            <button type="submit" className="btn-secondary">Add and use for job</button>
          </form>
        </details>
        <form action={createJob} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-wrap items-center gap-2">
            <select
              name="customer_id"
              required
              className="field flex-1 min-w-0"
              defaultValue={useCustomerId ?? ""}
            >
              <option value="">Select customer</option>
              {(customersResult.data ?? []).map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            <Link
              href="/admin/customers#add"
              className="whitespace-nowrap text-sm font-medium text-primary hover:underline"
            >
              Add customer
            </Link>
          </div>
          <input
            name="title"
            type="text"
            required
            placeholder="Job title"
            className="field"
          />
          <input
            name="address_line1"
            type="text"
            required
            placeholder="Address line 1"
            className="field"
          />
          <input
            name="address_line2"
            type="text"
            placeholder="Address line 2"
            className="field"
          />
          <input
            name="city"
            type="text"
            required
            placeholder="City"
            className="field"
          />
          <input
            name="state"
            type="text"
            defaultValue="IN"
            className="field"
          />
          <input
            name="zip"
            type="text"
            required
            placeholder="Zip"
            className="field"
          />
          <select name="assigned_crew_id" className="field">
            <option value="">No crew</option>
            {crews.map((crew) => (
              <option key={crew.id} value={crew.id}>
                {crew.name} ({crew.specialty})
              </option>
            ))}
          </select>
          <div>
            <select name="assigned_installer_id" className="field w-full">
              <option value="">Unassigned installer</option>
              {installers.map((installer) => (
                <option key={installer.user_id} value={installer.user_id}>
                  {installer.full_name ?? installer.user_id}
                </option>
              ))}
            </select>
            {installers.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                No installers yet. Add users in Supabase Auth with role &quot;installer&quot;, then add them to a crew on{" "}
                <Link href="/admin/crews" className="text-primary hover:underline">Crews</Link>.
              </p>
            )}
          </div>
          <input
            name="scheduled_start"
            type="datetime-local"
            className="field"
          />
          <input
            name="scheduled_end"
            type="datetime-local"
            className="field"
          />
          <select name="status" defaultValue="lead" className="field">
            {JOB_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <textarea
            name="notes"
            placeholder="Notes"
            rows={3}
            className="field sm:col-span-2"
          />
          <button type="submit" className="btn-primary sm:col-span-2">
            Create job
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="border-b border-border bg-muted/50 px-4 py-3 sm:px-5 flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">All jobs</h2>
          <span className="text-muted-foreground">|</span>
          <Link
            href="/admin/jobs"
            className={`text-sm ${!filterCrewId ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            All crews
          </Link>
          {crews.map((crew) => (
            <Link
              key={crew.id}
              href={filterCrewId === crew.id ? "/admin/jobs" : `/admin/jobs?crew_id=${crew.id}`}
              className={`text-sm ${filterCrewId === crew.id ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {crew.name}
            </Link>
          ))}
        </div>
        <div className="table-wrap overflow-x-auto">
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
                  <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                    {filterCrewId
                      ? "No jobs for this crew. Create a job and assign this crew, or clear the filter."
                      : "No jobs in the database yet. Create one above (select a customer first—you need at least one in "}
                    {!filterCrewId && (
                      <Link href="/admin/customers" className="link">Customers</Link>
                    )}
                    {!filterCrewId && ")."}
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                const customer = Array.isArray(job.customers)
                  ? job.customers[0]?.name
                  : job.customers?.name;
                const crew = Array.isArray(job.crews) ? job.crews[0] : job.crews;
                const installer = Array.isArray(job.profiles)
                  ? job.profiles[0]?.full_name
                  : job.profiles?.full_name;

                const invoice = Array.isArray(job.invoices) ? job.invoices[0] : job.invoices;
                const hasBalanceDue = invoice && invoice.balance_due_cents > 0;
                return (
                  <tr key={job.id} className="border-b border-border transition hover:bg-muted/30">
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
                    <td className="py-3 pr-4 text-muted-foreground">{crew?.name ?? "—"}</td>
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
