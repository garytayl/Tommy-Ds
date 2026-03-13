import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setToastCookie } from "@/lib/toast";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

const LEAD_SOURCES = [
  "google_ads",
  "facebook_ads",
  "referral",
  "organic",
  "repeat_customer",
  "yard_sign",
  "walk_in",
  "other",
] as const;

const SOURCE_LABELS: Record<string, string> = {
  google_ads: "Google Ads",
  facebook_ads: "Facebook Ads",
  referral: "Referral",
  organic: "Organic",
  repeat_customer: "Repeat customer",
  yard_sign: "Yard sign",
  walk_in: "Walk-in",
  other: "Other",
};

export default async function LeadsPage() {
  async function convertLeadToJob(formData: FormData) {
    "use server";
    const leadId = String(formData.get("lead_id") ?? "").trim();
    if (!leadId) return;
    const supabase = await createSupabaseServerClientForData();
    const { data: lead } = await supabase
      .from("leads")
      .select("id,customer_id,customers(id,name)")
      .eq("id", leadId)
      .single();
    if (!lead || !lead.customer_id) return;
    const customer = Array.isArray(lead.customers) ? lead.customers[0] : lead.customers;
    const cust = customer as { id: string; name: string } | null;
    const { data: job } = await supabase
      .from("jobs")
      .insert({
        customer_id: lead.customer_id,
        title: `${cust?.name ?? "Customer"} - Lead`,
        address_line1: "TBD",
        city: "TBD",
        state: "IN",
        zip: "00000",
        status: "lead",
      })
      .select("id")
      .single();
    if (!job) return;
    await supabase.from("leads").update({ converted_job_id: job.id }).eq("id", leadId);
    await setToastCookie("Lead converted to job");
    revalidatePath("/admin/leads");
    revalidatePath("/admin/jobs");
    redirect(`/jobs/${job.id}`);
  }

  const supabase = await createSupabaseServerClientForData();
  const { data: leads } = await supabase
    .from("leads")
    .select("id,source,campaign,notes,created_at,converted_job_id,converted_quote_id,customers(id,name,phone,email)")
    .order("created_at", { ascending: false });

  type LeadRow = {
    id: string;
    source: string;
    campaign: string | null;
    notes: string | null;
    created_at: string;
    converted_job_id: string | null;
    converted_quote_id: string | null;
    customers: { id: string; name: string; phone: string | null; email: string | null } | { id: string; name: string; phone: string | null; email: string | null }[] | null;
  };

  const rows = (leads ?? []) as LeadRow[];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Early-stage contacts. Convert a lead to a job when they are ready to schedule.
          </p>
        </div>
        <Link href="/admin/leads/new" className="btn-primary">
          New lead
        </Link>
      </div>

      <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="border-b border-border bg-muted/50 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-foreground">All leads</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                <th className="p-3 font-medium">Customer</th>
                <th className="p-3 font-medium">Source</th>
                <th className="p-3 font-medium">Notes</th>
                <th className="p-3 font-medium">Created</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((lead) => {
                const customer = Array.isArray(lead.customers) ? lead.customers[0] : lead.customers;
                const converted = !!lead.converted_job_id;
                return (
                  <tr key={lead.id} className="border-b border-border last:border-0">
                    <td className="p-3">
                      {customer?.id ? (
                        <Link href={`/admin/customers/${customer.id}`} className="link font-medium">
                          {customer.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {customer?.phone && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{customer.phone}</p>
                      )}
                    </td>
                    <td className="p-3">
                      {SOURCE_LABELS[lead.source] ?? lead.source}
                      {lead.campaign && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{lead.campaign}</p>
                      )}
                    </td>
                    <td className="p-3 max-w-[200px] truncate text-muted-foreground" title={lead.notes ?? undefined}>
                      {lead.notes ?? "—"}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(lead.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="p-3">
                      {converted ? (
                        <Link href={`/jobs/${lead.converted_job_id}`} className="link text-sm">
                          Converted → Job
                        </Link>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">Open</span>
                      )}
                    </td>
                    <td className="p-3">
                      {!converted && (
                        <form action={convertLeadToJob}>
                          <input type="hidden" name="lead_id" value={lead.id} />
                          <button type="submit" className="text-sm font-medium text-primary hover:underline">
                            Convert to job
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">No leads yet. Create one to track new contacts.</p>
        )}
      </section>
    </div>
  );
}
