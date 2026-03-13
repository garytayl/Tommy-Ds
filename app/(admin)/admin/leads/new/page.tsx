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
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">New lead</h1>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          Record a new lead. Select the customer (or add one under Customers first), then convert to a job when ready.
        </p>
      </header>

      <section className="form-card">
        <form action={createLead} className="grid gap-6 sm:grid-cols-2">
          <div className="form-group sm:col-span-2">
            <label htmlFor="customer_id" className="form-label">Customer</label>
            <select id="customer_id" name="customer_id" required className="field">
              <option value="">Select customer</option>
              {(customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="form-hint">
              <Link href="/admin/customers" className="link">Add a customer</Link> first if needed.
            </p>
          </div>
          <div className="form-group">
            <label htmlFor="source" className="form-label">Source</label>
            <select id="source" name="source" defaultValue="other" className="field">
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="campaign" className="form-label">Campaign (optional)</label>
            <input id="campaign" type="text" name="campaign" placeholder="e.g. Spring 2025" className="field" />
          </div>
          <div className="form-group sm:col-span-2">
            <label htmlFor="notes" className="form-label">Notes</label>
            <textarea id="notes" name="notes" rows={4} className="field" placeholder="How did they find us? Next steps?" />
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6 sm:col-span-2">
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
