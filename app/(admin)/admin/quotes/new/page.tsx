import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setToastCookie } from "@/lib/toast";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams?: Promise<{ customer_id?: string }>;
}) {
  const resolvedSearch = (await searchParams) ?? {};
  const preselectCustomerId = resolvedSearch.customer_id?.trim() ?? "";

  const supabase = await createSupabaseServerClientForData();
  const { data: customers } = await supabase
    .from("customers")
    .select("id,name")
    .order("name", { ascending: true });

  async function createQuote(formData: FormData) {
    "use server";

    const customerId = String(formData.get("customer_id") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const address1 = String(formData.get("address_line1") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const state = String(formData.get("state") ?? "IN").trim() || "IN";
    const zip = String(formData.get("zip") ?? "").trim();

    if (!customerId || !title || !address1 || !city || !zip) return;

    const supabase = await createSupabaseServerClientForData();
    const { data: quote } = await supabase
      .from("quotes")
      .insert({
        customer_id: customerId,
        title,
        address_line1: address1,
        address_line2: String(formData.get("address_line2") ?? "").trim() || null,
        city,
        state,
        zip,
        notes: String(formData.get("notes") ?? "").trim() || null,
        status: "draft",
      })
      .select("id")
      .single();

    if (quote) {
      await setToastCookie("Quote created");
      revalidatePath("/admin/quotes");
      redirect(`/admin/quotes/${quote.id}`);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          New quote
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a draft quote. After saving, add line items and then convert to a job when the customer approves.
        </p>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <form action={createQuote} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Customer</label>
            <select
              name="customer_id"
              required
              className="field w-full"
              defaultValue={preselectCustomerId || ""}
            >
              <option value="">Select customer</option>
              {(customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Link href="/admin/customers#add" className="mt-1 inline-block text-sm text-primary hover:underline">
              Add customer
            </Link>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Title / description</label>
            <input
              name="title"
              type="text"
              required
              placeholder="e.g. Garage door install - 123 Main St"
              className="field w-full"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Address</label>
            <input
              name="address_line1"
              type="text"
              required
              placeholder="Address line 1"
              className="field w-full"
            />
          </div>
          <input
            name="address_line2"
            type="text"
            placeholder="Address line 2"
            className="field"
          />
          <input name="city" type="text" required placeholder="City" className="field" />
          <input name="state" type="text" defaultValue="IN" className="field" />
          <input name="zip" type="text" required placeholder="Zip" className="field" />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes (optional)</label>
            <textarea
              name="notes"
              placeholder="Notes"
              rows={2}
              className="field w-full"
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="submit" className="btn-primary">
              Create quote
            </button>
            <Link href="/admin/quotes" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
