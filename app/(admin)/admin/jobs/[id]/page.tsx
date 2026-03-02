import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { InvoiceSummary } from "@/components/InvoiceSummary";
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

function toLocalInputDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const tzOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - tzOffset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [jobResult, invoiceResult, installersResult] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id,title,status,notes,address_line1,address_line2,city,state,zip,scheduled_start,scheduled_end,assigned_installer_id,customers(id,name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("invoices")
      .select(
        "id,job_id,status,subtotal_cents,tax_cents,total_cents,deposit_paid_cents,balance_due_cents",
      )
      .eq("job_id", id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
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
    notes: string | null;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    zip: string;
    scheduled_start: string | null;
    scheduled_end: string | null;
    assigned_installer_id: string | null;
    customers: { id: string; name: string } | { id: string; name: string }[] | null;
  };

  const jobRecord = jobResult.data as JobRow | null;
  const invoice = invoiceResult.data;
  const installers = installersResult.data ?? [];

  if (!jobRecord) {
    notFound();
  }
  const job = jobRecord;
  const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;

  async function updateJob(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();
    await supabase
      .from("jobs")
      .update({
        status: String(formData.get("status") ?? "lead"),
        notes: String(formData.get("notes") ?? "").trim() || null,
        scheduled_start: toIsoOrNull(formData.get("scheduled_start")),
        scheduled_end: toIsoOrNull(formData.get("scheduled_end")),
        assigned_installer_id:
          String(formData.get("assigned_installer_id") ?? "").trim() || null,
      })
      .eq("id", id);

    revalidatePath(`/admin/jobs/${id}`);
    revalidatePath("/admin/jobs");
  }

  async function createInvoice() {
    "use server";

    const supabase = await createSupabaseServerClient();
    await supabase.from("invoices").insert({
      job_id: id,
      status: "draft",
      tax_cents: 0,
    });
    revalidatePath(`/admin/jobs/${id}`);
    revalidatePath("/admin/jobs");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <section className="space-y-6">
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold">{job.title}</h1>
              <p className="text-sm text-zinc-600">
                Customer:{" "}
                <Link
                  href={customer?.id ? `/admin/customers/${customer.id}` : "/admin/customers"}
                  className="text-blue-700 hover:underline"
                >
                  {customer?.name ?? "Unknown customer"}
                </Link>
              </p>
            </div>
            <JobStatusBadge status={job.status} />
          </div>

          <p className="text-sm text-zinc-700">
            {job.address_line1}
            {job.address_line2 ? `, ${job.address_line2}` : ""}
            {`, ${job.city}, ${job.state} ${job.zip}`}
          </p>

          <form action={updateJob} className="mt-4 grid gap-3 sm:grid-cols-2">
            <select
              name="status"
              defaultValue={job.status}
              className="rounded border px-3 py-2 text-sm"
            >
              {JOB_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              name="assigned_installer_id"
              defaultValue={job.assigned_installer_id ?? ""}
              className="rounded border px-3 py-2 text-sm"
            >
              <option value="">Unassigned installer</option>
              {installers.map((installer) => (
                <option key={installer.user_id} value={installer.user_id}>
                  {installer.full_name ?? installer.user_id}
                </option>
              ))}
            </select>

            <input
              name="scheduled_start"
              type="datetime-local"
              defaultValue={toLocalInputDate(job.scheduled_start)}
              className="rounded border px-3 py-2 text-sm"
            />
            <input
              name="scheduled_end"
              type="datetime-local"
              defaultValue={toLocalInputDate(job.scheduled_end)}
              className="rounded border px-3 py-2 text-sm"
            />

            <textarea
              name="notes"
              defaultValue={job.notes ?? ""}
              className="sm:col-span-2 rounded border px-3 py-2 text-sm"
              rows={4}
            />

            <button
              type="submit"
              className="sm:col-span-2 rounded bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Save job
            </button>
          </form>
        </div>
      </section>

      <section className="space-y-4">
        <InvoiceSummary invoice={invoice} />
        {invoice ? (
          <Link
            href={`/admin/invoices/${invoice.id}`}
            className="block rounded bg-black px-4 py-2 text-center text-sm font-medium text-white"
          >
            Open invoice
          </Link>
        ) : (
          <form action={createInvoice}>
            <button
              type="submit"
              className="w-full rounded bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Create invoice
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
