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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--foreground)" }}>
          Customers
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Add and manage customer records.
        </p>
      </div>
      <section className="card p-5">
        <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>Add customer</h2>
        <form action={createCustomer} className="mt-4 grid gap-3 sm:grid-cols-4">
          <input type="text" name="name" required placeholder="Customer name" className="field" />
          <input type="text" name="phone" placeholder="Phone" className="field" />
          <input type="email" name="email" placeholder="Email" className="field" />
          <button type="submit" className="btn-primary">Add customer</button>
        </form>
      </section>

      <section className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-[var(--muted-bg)]" style={{ borderColor: "var(--border)" }}>
                <th className="table-header py-3 pl-5 pr-4">Name</th>
                <th className="table-header py-3 pr-4">Phone</th>
                <th className="table-header py-3 pr-4">Email</th>
                <th className="table-header py-3 pr-4">Created</th>
                <th className="table-header py-3 pr-5">Action</th>
              </tr>
            </thead>
            <tbody>
              {(customers ?? []).map((customer) => (
                <tr key={customer.id} className="border-b transition hover:bg-[var(--muted-bg)]/50" style={{ borderColor: "var(--border)" }}>
                  <td className="py-3 pl-5 pr-4 font-medium">{customer.name}</td>
                  <td className="py-3 pr-4" style={{ color: "var(--muted)" }}>{customer.phone ?? "-"}</td>
                  <td className="py-3 pr-4" style={{ color: "var(--muted)" }}>{customer.email ?? "-"}</td>
                  <td className="py-3 pr-4" style={{ color: "var(--muted)" }}>
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
