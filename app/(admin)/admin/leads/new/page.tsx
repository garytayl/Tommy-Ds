import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setToastCookie } from "@/lib/toast";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/SubmitButton";

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

export default async function NewLeadPage() {
  async function createLead(formData: FormData) {
    "use server";
    const customerId = String(formData.get("customer_id") ?? "").trim();
    const source = String(formData.get("source") ?? "other").trim();
    const campaign = String(formData.get("campaign") ?? "").trim() || null;
    const notes = String(formData.get("notes") ?? "").trim() || null;
    if (!customerId) return;
    const supabase = await createSupabaseServerClientForData();
    const validSource = LEAD_SOURCES.includes(source as (typeof LEAD_SOURCES)[number]) ? source : "other";
    await supabase.from("leads").insert({
      customer_id: customerId,
      source: validSource,
      campaign,
      notes,
    });
    await setToastCookie("Lead created");
    revalidatePath("/admin/leads");
    redirect("/admin/leads");
  }

  const supabase = await createSupabaseServerClientForData();
  const { data: customers } = await supabase
    .from("customers")
    .select("id,name")
    .order("name", { ascending: true });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">New lead</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record a new lead. Select the customer (or add one under Customers first), then convert to a job when ready.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <form action={createLead} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Customer</label>
            <select name="customer_id" required className="field w-full">
              <option value="">Select customer</option>
              {(customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              <Link href="/admin/customers" className="link">Add a customer</Link> first if needed.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Source</label>
            <select name="source" defaultValue="other" className="field w-full">
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Campaign (optional)</label>
            <input type="text" name="campaign" placeholder="e.g. Spring 2025" className="field w-full" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes</label>
            <textarea name="notes" rows={3} className="field w-full" placeholder="How did they find us? Next steps?" />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <SubmitButton>Create lead</SubmitButton>
            <Link href="/admin/leads" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
