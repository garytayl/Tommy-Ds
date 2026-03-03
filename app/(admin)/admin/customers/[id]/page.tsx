import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { JobStatusBadge } from "@/components/JobStatusBadge";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: customer }, { data: jobs }] = await Promise.all([
    supabase
      .from("customers")
      .select("id,name,phone,email,created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("jobs")
      .select("id,title,status,scheduled_start")
      .eq("customer_id", id)
      .order("scheduled_start", { ascending: true, nullsFirst: false }),
  ]);

  if (!customer) {
    notFound();
  }

  async function updateCustomer(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    if (!name) return;

    const supabase = await createSupabaseServerClient();
    await supabase
      .from("customers")
      .update({
        name,
        phone: phone || null,
        email: email || null,
      })
      .eq("id", id);

    revalidatePath(`/admin/customers/${id}`);
    revalidatePath("/admin/customers");
  }

  async function deleteCustomer() {
    "use server";
    const supabase = await createSupabaseServerClient();
    await supabase.from("customers").delete().eq("id", id);
    revalidatePath("/admin/customers");
    redirect("/admin/customers");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Customer Detail</h1>
          <Link href="/admin/customers" className="link text-sm">
            Back to customers
          </Link>
        </div>
        <form action={updateCustomer} className="grid gap-3 sm:grid-cols-3">
          <input
            type="text"
            name="name"
            required
            defaultValue={customer.name}
            className="field"
          />
          <input
            type="text"
            name="phone"
            defaultValue={customer.phone ?? ""}
            className="field"
          />
          <input
            type="email"
            name="email"
            defaultValue={customer.email ?? ""}
            className="field"
          />
          <div className="sm:col-span-3 flex items-center gap-2">
            <button type="submit" className="btn-primary">
              Save customer
            </button>
          </div>
        </form>
        <form action={deleteCustomer} className="mt-3">
          <button type="submit" className="btn-danger">
            Delete customer
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="border-b border-border bg-muted/50 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-foreground">Customer Jobs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="table-header py-3 pl-5 pr-4">Title</th>
                <th className="table-header py-3 pr-4">Scheduled</th>
                <th className="table-header py-3 pr-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {(jobs ?? []).map((job) => (
                <tr key={job.id} className="border-b border-border transition hover:bg-muted/30">
                  <td className="py-3 pl-5 pr-4">
                    <Link href={`/admin/jobs/${job.id}`} className="link font-medium">
                      {job.title}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {job.scheduled_start
                      ? new Date(job.scheduled_start).toLocaleString()
                      : "Unscheduled"}
                  </td>
                  <td className="py-3 pr-5">
                    <JobStatusBadge status={job.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
