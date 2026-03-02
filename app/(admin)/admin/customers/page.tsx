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
      <section className="rounded-lg border bg-white p-4">
        <h1 className="text-lg font-semibold">Customers</h1>
        <form action={createCustomer} className="mt-4 grid gap-3 sm:grid-cols-4">
          <input
            type="text"
            name="name"
            required
            placeholder="Customer name"
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            type="text"
            name="phone"
            placeholder="Phone"
            className="rounded border px-3 py-2 text-sm"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="rounded border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Add customer
          </button>
        </form>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-zinc-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Created</th>
                <th className="py-2 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {(customers ?? []).map((customer) => (
                <tr key={customer.id} className="border-b last:border-none">
                  <td className="py-2 pr-4 font-medium">{customer.name}</td>
                  <td className="py-2 pr-4">{customer.phone ?? "-"}</td>
                  <td className="py-2 pr-4">{customer.email ?? "-"}</td>
                  <td className="py-2 pr-4">
                    {new Date(customer.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-2 pr-4">
                    <Link
                      href={`/admin/customers/${customer.id}`}
                      className="text-blue-700 hover:underline"
                    >
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
