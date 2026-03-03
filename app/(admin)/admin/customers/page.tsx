import Link from "next/link";
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CustomersPage() {
  async function createCustomer(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();

    if (!name) return;

    const supabase = await createSupabaseServerClient();
    await supabase.from("customers").insert({
      name,
      phone: phone || null,
      email: email || null,
    });

    revalidatePath("/admin/customers");
  }

  const supabase = await createSupabaseServerClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id,name,phone,email,created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Customers
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add and manage customer records. Select a customer when creating a job.
        </p>
      </div>
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <span className="block h-1 w-12 rounded-full bg-primary/80" />
        <h2 className="mt-3 text-base font-semibold text-foreground">Add customer</h2>
        <form action={createCustomer} className="mt-4 grid gap-3 sm:grid-cols-4">
          <input type="text" name="name" required placeholder="Customer name" className="field" />
          <input type="text" name="phone" placeholder="Phone" className="field" />
          <input type="email" name="email" placeholder="Email" className="field" />
          <button type="submit" className="btn-primary">Add customer</button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="border-b border-border bg-muted/50 px-4 py-3 sm:px-5">
          <h2 className="text-base font-semibold text-foreground">All customers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="table-header py-3 pl-5 pr-4">Name</th>
                <th className="table-header py-3 pr-4">Phone</th>
                <th className="table-header py-3 pr-4">Email</th>
                <th className="table-header py-3 pr-4">Created</th>
                <th className="table-header py-3 pr-5">Action</th>
              </tr>
            </thead>
            <tbody>
              {(customers ?? []).map((customer) => (
                <tr key={customer.id} className="border-b border-border transition hover:bg-muted/30">
                  <td className="py-3 pl-5 pr-4 font-medium text-foreground">{customer.name}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{customer.phone ?? "-"}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{customer.email ?? "-"}</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {new Date(customer.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-5">
                    <Link href={`/admin/customers/${customer.id}`} className="link">
                      Open
                    </Link>
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
