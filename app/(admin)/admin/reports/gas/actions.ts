"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getOfficeSessionOrNull, UNAUTHORIZED_TOAST } from "@/lib/server-action-guards";
import { setToastCookie } from "@/lib/toast";

function parsePositiveNumber(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function parseNonNegativeInteger(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
}

export async function addVehicle(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const vehicleType = String(formData.get("vehicle_type") ?? "truck").trim();
  const plate = String(formData.get("plate") ?? "").trim();

  if (!name) {
    await setToastCookie("Vehicle name is required.");
    redirect("/admin/reports/gas");
  }

  if (!["truck", "van", "other"].includes(vehicleType)) {
    await setToastCookie("Vehicle type must be truck, van, or other.");
    redirect("/admin/reports/gas");
  }

  const session = await getOfficeSessionOrNull();
  if (!session) {
    await setToastCookie(UNAUTHORIZED_TOAST);
    redirect("/admin/reports/gas");
  }
  const { supabase } = session;
  const { error } = await supabase.from("vehicles").insert({
    name,
    vehicle_type: vehicleType,
    plate: plate || null,
  });

  if (error) {
    await setToastCookie(error.message || "Could not add vehicle.");
    redirect("/admin/reports/gas");
  }

  revalidatePath("/admin/reports/gas");
  revalidatePath("/admin/analytics");
  await setToastCookie("Vehicle added.");
  redirect("/admin/reports/gas");
}

export async function addGasCard(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  const provider = String(formData.get("provider") ?? "").trim();
  const cardLast4 = String(formData.get("card_last4") ?? "").trim();
  const assignedVehicleId = String(formData.get("assigned_vehicle_id") ?? "").trim();

  if (!label) {
    await setToastCookie("Card label is required.");
    redirect("/admin/reports/gas");
  }

  if (cardLast4 && !/^\d{4}$/.test(cardLast4)) {
    await setToastCookie("Card last 4 must be exactly 4 digits.");
    redirect("/admin/reports/gas");
  }

  const session = await getOfficeSessionOrNull();
  if (!session) {
    await setToastCookie(UNAUTHORIZED_TOAST);
    redirect("/admin/reports/gas");
  }
  const { supabase } = session;
  const { error } = await supabase.from("gas_cards").insert({
    label,
    provider: provider || null,
    card_last4: cardLast4 || null,
    assigned_vehicle_id: assignedVehicleId || null,
  });

  if (error) {
    await setToastCookie(error.message || "Could not add gas card.");
    redirect("/admin/reports/gas");
  }

  revalidatePath("/admin/reports/gas");
  revalidatePath("/admin/analytics");
  await setToastCookie("Gas card added.");
  redirect("/admin/reports/gas");
}

export async function logFuelPurchase(formData: FormData) {
  const vehicleId = String(formData.get("vehicle_id") ?? "").trim();
  const gasCardId = String(formData.get("gas_card_id") ?? "").trim();
  const purchasedAt = String(formData.get("purchased_at") ?? "").trim();
  const station = String(formData.get("station") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const gallons = parsePositiveNumber(formData.get("gallons"));
  const totalDollars = parsePositiveNumber(formData.get("total_dollars"));
  const odometerMiles = parseNonNegativeInteger(formData.get("odometer_miles"));

  if (!vehicleId) {
    await setToastCookie("Select a vehicle.");
    redirect("/admin/reports/gas");
  }

  if (!gallons) {
    await setToastCookie("Enter gallons greater than zero.");
    redirect("/admin/reports/gas");
  }

  if (!totalDollars) {
    await setToastCookie("Enter a valid total amount.");
    redirect("/admin/reports/gas");
  }

  const totalCents = Math.round(totalDollars * 100);
  if (totalCents <= 0) {
    await setToastCookie("Total amount must be greater than zero.");
    redirect("/admin/reports/gas");
  }

  const purchasedAtIso = purchasedAt ? new Date(purchasedAt).toISOString() : null;
  if (purchasedAt && Number.isNaN(new Date(purchasedAt).getTime())) {
    await setToastCookie("Enter a valid purchase date/time.");
    redirect("/admin/reports/gas");
  }

  const session = await getOfficeSessionOrNull();
  if (!session) {
    await setToastCookie(UNAUTHORIZED_TOAST);
    redirect("/admin/reports/gas");
  }
  const { supabase } = session;
  const { error } = await supabase.from("fuel_purchases").insert({
    vehicle_id: vehicleId,
    gas_card_id: gasCardId || null,
    purchased_at: purchasedAtIso ?? undefined,
    station: station || null,
    gallons,
    total_cents: totalCents,
    odometer_miles: odometerMiles,
    notes: notes || null,
  });

  if (error) {
    await setToastCookie(error.message || "Could not add fuel purchase.");
    redirect("/admin/reports/gas");
  }

  revalidatePath("/admin/reports/gas");
  revalidatePath("/admin/analytics");
  await setToastCookie("Fuel purchase logged.");
  redirect("/admin/reports/gas");
}
