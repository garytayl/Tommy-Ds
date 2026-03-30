import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getOfficeSessionOrNull, UNAUTHORIZED_TOAST } from "@/lib/server-action-guards";
import { setToastCookie } from "@/lib/toast";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CopyAddressFromCustomerButton } from "@/components/CopyAddressFromCustomerButton";
import { SubmitButton } from "@/components/SubmitButton";
import { getCrewDisplayName } from "@/lib/crews";

const JOB_STATUSES = [
  "lead",
  "consultation_scheduled",
  "measured",
  "quote_sent",
  "approved",
  "scheduled",
  "installed",
  "in_progress",
  "completed",
  "paid",
  "closed",
  "canceled",
] as const;

const STATUS_LABELS: Record<string, string> = {
  lead: "Lead",
  consultation_scheduled: "Consultation scheduled",
  measured: "Measured",
  quote_sent: "Quote sent",
  approved: "Approved",
  scheduled: "Scheduled",
  installed: "Installed",
  in_progress: "In progress",
  completed: "Completed",
  paid: "Paid",
  closed: "Closed",
  canceled: "Canceled",
};

function toIsoOrNull(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

type PageProps = { searchParams: Promise<{ added?: string }> };

export default async function NewJobPage({ searchParams }: PageProps) {
  const { added: addedCustomerId } = await searchParams;

  async function createJob(formData: FormData) {
    "use server";
    const customerId = String(formData.get("customer_id") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const address1 = String(formData.get("address_line1") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const state = String(formData.get("state") ?? "IN").trim() || "IN";
    const zip = String(formData.get("zip") ?? "").trim();
    if (!customerId || !title || !address1 || !city || !zip) return;

    const session = await getOfficeSessionOrNull();
    if (!session) {
      await setToastCookie(UNAUTHORIZED_TOAST);
      return;
    }
    const { supabase } = session;
    const kindRaw = String(formData.get("job_kind") ?? "installation").trim();
    const job_kind = kindRaw === "service" ? "service" : "installation";
    const { data: newJob } = await supabase
      .from("jobs")
      .insert({
        customer_id: customerId,
        title,
        address_line1: address1,
        address_line2: String(formData.get("address_line2") ?? "").trim() || null,
        city,
        state,
        zip,
        job_kind,
        scheduled_start: toIsoOrNull(formData.get("scheduled_start")),
        scheduled_end: toIsoOrNull(formData.get("scheduled_end")),
        assigned_installer_id: String(formData.get("assigned_installer_id") ?? "").trim() || null,
        assigned_crew_id: String(formData.get("assigned_crew_id") ?? "").trim() || null,
        status: String(formData.get("status") ?? "lead"),
        notes: String(formData.get("notes") ?? "").trim() || null,
      })
      .select("id")
      .single();

    if (newJob) {
      await supabase.from("activities").insert({
        job_id: newJob.id,
        type: "created",
        title: "Job created",
        status: "completed",
      });
    }

    await setToastCookie("Job created");
    revalidatePath("/admin/jobs");
    revalidatePath("/admin/schedule");
    revalidatePath("/admin");
    if (newJob) redirect(`/jobs/${newJob.id}`);
    else redirect("/admin/jobs");
  }

  async function addCustomer(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    if (!name) return;
    const session = await getOfficeSessionOrNull();
    if (!session) {
      await setToastCookie(UNAUTHORIZED_TOAST);
      return;
    }
    const { supabase } = session;
    const { data: row } = await supabase
      .from("customers")
      .insert({ name, phone: phone || null, email: email || null })
      .select("id")
      .single();
    if (!row) return;
    await setToastCookie("Customer added — select them above");
    revalidatePath("/admin/jobs/new");
    revalidatePath("/admin/customers");
    redirect(`/admin/jobs/new?added=${row.id}`);
  }

  const supabase = await createSupabaseServerClient();
  const [
    { data: customers },
    { data: installersList },
    { data: crewMembers },
    { data: crewsRaw },
  ] = await Promise.all([
    supabase.from("customers").select("id,name,address_line1,address_line2,city,state,zip").order("name", { ascending: true }),
    supabase.from("profiles").select("user_id,full_name").eq("role", "installer").order("full_name", { ascending: true }),
    supabase.from("crew_members").select("user_id,profiles(user_id,full_name)").order("user_id"),
    supabase.from("crews").select("id,name,specialty,crew_members(user_id,profiles(user_id,full_name))").order("name", { ascending: true }),
  ]);

  const crews = (crewsRaw ?? []).map((c: { id: string; name: string; specialty: string; crew_members?: unknown }) => ({
    id: c.id,
    name: getCrewDisplayName({ name: c.name, crew_members: c.crew_members }),
    specialty: c.specialty,
  }));

  const profilesFromCrew = (crewMembers ?? []).map((m: { user_id: string; profiles: unknown }) => {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return { user_id: m.user_id, full_name: (p as { full_name: string | null })?.full_name ?? null };
  });
  const installerIds = new Set((installersList ?? []).map((i: { user_id: string }) => i.user_id));
  const installers = [
    ...(installersList ?? []),
    ...profilesFromCrew.filter((c: { user_id: string }) => !installerIds.has(c.user_id)),
  ];
  const installersFinal = installers.length > 0 ? installers : (installersList ?? []);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">New job</h1>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          Create a job for a customer. Set the address, optional schedule and crew, then open the job to add an invoice and line items.
        </p>
      </header>

      <section className="form-card">
        <form action={createJob} className="grid gap-6 sm:grid-cols-2">
          <div className="form-group sm:col-span-2">
            <label htmlFor="customer_id" className="form-label">Customer</label>
            <select
              id="job-new-customer-id"
              name="customer_id"
              required
              className="field"
              defaultValue={addedCustomerId ?? ""}
            >
              <option value="">Select customer</option>
              {(customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group sm:col-span-2">
            <label htmlFor="title" className="form-label">Job title</label>
            <input id="title" name="title" type="text" required placeholder="e.g. Front door replacement" className="field" />
          </div>

          <div className="form-group sm:col-span-2">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <label htmlFor="job-new-project-address-line1" className="form-label">
                Project / job site address
              </label>
              <CopyAddressFromCustomerButton
                customers={(customers ?? []).map((c) => ({
                  id: c.id,
                  address_line1: c.address_line1 ?? null,
                  address_line2: c.address_line2 ?? null,
                  city: c.city ?? null,
                  state: c.state ?? null,
                  zip: c.zip ?? null,
                }))}
                customerSelectId="job-new-customer-id"
                targetIds={{
                  address_line1: "job-new-project-address-line1",
                  address_line2: "job-new-project-address-line2",
                  city: "job-new-project-city",
                  state: "job-new-project-state",
                  zip: "job-new-project-zip",
                }}
              />
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              Where work is performed. Can differ from the customer&apos;s billing address on their profile.
            </p>
            <input
              id="job-new-project-address-line1"
              name="address_line1"
              type="text"
              required
              placeholder="Street address"
              className="field"
            />
          </div>
          <div className="form-group sm:col-span-2">
            <input
              id="job-new-project-address-line2"
              name="address_line2"
              type="text"
              placeholder="Apt, suite, unit (optional)"
              className="field"
              aria-label="Address line 2"
            />
          </div>
          <div className="form-group">
            <label htmlFor="job-new-project-city" className="form-label">City</label>
            <input id="job-new-project-city" name="city" type="text" required placeholder="City" className="field" />
          </div>
          <div className="form-group">
            <label htmlFor="job-new-project-state" className="form-label">State</label>
            <input id="job-new-project-state" name="state" type="text" defaultValue="IN" placeholder="State" className="field" />
          </div>
          <div className="form-group sm:col-span-2">
            <label htmlFor="job-new-project-zip" className="form-label">ZIP</label>
            <input id="job-new-project-zip" name="zip" type="text" required placeholder="ZIP code" className="field" />
          </div>

          <div className="form-group">
            <label htmlFor="status" className="form-label">Status</label>
            <select id="status" name="status" defaultValue="lead" className="field">
              {JOB_STATUSES.filter((s) => s !== "canceled").map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s] ?? s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="job_kind" className="form-label">Job kind</label>
            <select id="job_kind" name="job_kind" defaultValue="installation" className="field">
              <option value="installation">Installation</option>
              <option value="service">Service</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="assigned_crew_id" className="form-label">Crew (optional)</label>
            <select id="assigned_crew_id" name="assigned_crew_id" className="field">
              <option value="">No crew</option>
              {crews.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.specialty})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="assigned_installer_id" className="form-label">Installer (optional)</label>
            <select id="assigned_installer_id" name="assigned_installer_id" className="field">
              <option value="">Unassigned</option>
              {installersFinal.map((inst: { user_id: string; full_name: string | null }) => (
                <option key={inst.user_id} value={inst.user_id}>
                  {inst.full_name ?? inst.user_id}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="scheduled_start" className="form-label">Scheduled start (optional)</label>
            <input id="scheduled_start" name="scheduled_start" type="datetime-local" className="field" />
          </div>
          <div className="form-group">
            <label htmlFor="scheduled_end" className="form-label">Scheduled end (optional)</label>
            <input id="scheduled_end" name="scheduled_end" type="datetime-local" className="field" />
          </div>

          <div className="form-group sm:col-span-2">
            <label htmlFor="notes" className="form-label">Notes (optional)</label>
            <textarea id="notes" name="notes" rows={3} className="field" placeholder="Internal notes" />
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6 sm:col-span-2">
            <SubmitButton>Create job</SubmitButton>
            <Link href="/admin/jobs" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </section>

      <section className="form-card">
        <h2 className="text-base font-semibold text-foreground">Add a new customer</h2>
        <p className="form-hint mt-1">Not in the list? Add them here, then select them above.</p>
        <form action={addCustomer} className="mt-4 grid gap-3 sm:grid-cols-4">
          <input
            type="text"
            name="name"
            required
            placeholder="Name"
            className="field sm:col-span-2"
            aria-label="New customer name"
          />
          <input type="text" name="phone" placeholder="Phone" className="field" aria-label="New customer phone" />
          <input type="email" name="email" placeholder="Email" className="field" aria-label="New customer email" />
          <button type="submit" className="btn-secondary whitespace-nowrap">
            Add customer
          </button>
        </form>
      </section>
    </div>
  );
}
