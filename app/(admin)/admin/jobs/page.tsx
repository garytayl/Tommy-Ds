import Link from "next/link";
import { revalidatePath } from "next/cache";

import { JobStatusBadge } from "@/components/JobStatusBadge";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

export default async function JobsPage() {
  async function createJob(formData: FormData) {
    "use server";

    const customerId = String(formData.get("customer_id") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const address1 = String(formData.get("address_line1") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const state = String(formData.get("state") ?? "IN").trim() || "IN";
    const zip = String(formData.get("zip") ?? "").trim();

    if (!customerId || !title || !address1 || !city || !zip) return;

    const supabase = await createSupabaseServerClient();
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
      status: String(formData.get("status") ?? "lead"),
      notes: String(formData.get("notes") ?? "").trim() || null,
    });

    revalidatePath("/admin/jobs");
  }

  const supabase = await createSupabaseServerClient();
  const [jobsResult, customersResult, installersResult] = await Promise.all([
    supabase
      .from("jobs")
      .select("id,title,status,scheduled_start,customers(name),profiles(full_name)")
      .order("created_at", { ascending: false }),
    supabase.from("customers").select("id,name").order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("user_id,full_name")
      .eq("role", "installer")
      .order("full_name", { ascending: true }),
  ]);

  type JobRow = {
    id: string;
    title: string;
    status: string;
    scheduled_start: string | null;
    customers: { name: string } | { name: string }[] | null;
    profiles: { full_name: string | null } | { full_name: string | null }[] | null;
  };

  const jobs = (jobsResult.data ?? []) as JobRow[];

  return (
    <div className="space-y-6">
      <section className="card p-4">
        <h1 className="text-lg font-semibold">Jobs</h1>
        <form action={createJob} className="mt-4 grid gap-3 sm:grid-cols-2">
          <select name="customer_id" required className="field">
            <option value="">Select customer</option>
            {(customersResult.data ?? []).map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
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
          <select name="assigned_installer_id" className="field">
            <option value="">Unassigned installer</option>
            {(installersResult.data ?? []).map((installer) => (
              <option key={installer.user_id} value={installer.user_id}>
                {installer.full_name ?? installer.user_id}
              </option>
            ))}
          </select>
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

      <section className="card p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-zinc-500">
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Installer</th>
                <th className="py-2 pr-4">Scheduled</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const customer = Array.isArray(job.customers)
                  ? job.customers[0]?.name
                  : job.customers?.name;
                const installer = Array.isArray(job.profiles)
                  ? job.profiles[0]?.full_name
                  : job.profiles?.full_name;

                return (
                  <tr key={job.id} className="border-b last:border-none">
                    <td className="py-2 pr-4 font-medium">{job.title}</td>
                    <td className="py-2 pr-4">{customer ?? "-"}</td>
                    <td className="py-2 pr-4">{installer ?? "Unassigned"}</td>
                    <td className="py-2 pr-4">
                      {job.scheduled_start
                        ? new Date(job.scheduled_start).toLocaleString()
                        : "Unscheduled"}
                    </td>
                    <td className="py-2 pr-4">
                      <JobStatusBadge status={job.status} />
                    </td>
                    <td className="py-2 pr-4">
                      <Link
                        href={`/admin/jobs/${job.id}`}
                        className="text-blue-700 hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
