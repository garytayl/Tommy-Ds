"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setToastCookie } from "@/lib/toast";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

export async function updateCustomer(formData: FormData) {
  const id = String(formData.get("customer_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address_line1 = String(formData.get("address_line1") ?? "").trim();
  const address_line2 = String(formData.get("address_line2") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const zip = String(formData.get("zip") ?? "").trim();

  if (!id || !name) return;

  const supabase = await createSupabaseServerClientForData();
  await supabase
    .from("customers")
    .update({
      name,
      phone: phone || null,
      email: email || null,
      address_line1: address_line1 || null,
      address_line2: address_line2 || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
    })
    .eq("id", id);

  await setToastCookie("Customer saved");
  revalidatePath(`/admin/customers/${id}`);
  revalidatePath("/admin/customers");
}

export async function deleteCustomer(formData: FormData) {
  const id = String(formData.get("customer_id") ?? "").trim();
  if (!id) return;

  const supabase = await createSupabaseServerClientForData();
  const { error } = await supabase.from("customers").delete().eq("id", id);

  if (error) {
    const code = "code" in error ? String((error as { code?: string }).code) : "";
    const fk =
      code === "23503" ||
      (error.message?.toLowerCase().includes("foreign key") ?? false);
    await setToastCookie(
      fk
        ? "Cannot delete this customer while they have jobs, estimates, or other linked records."
        : (error.message || "Could not delete customer").slice(0, 220),
    );
    revalidatePath(`/admin/customers/${id}`);
    return;
  }

  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
  await setToastCookie("Customer deleted");
  redirect("/admin/customers");
}
