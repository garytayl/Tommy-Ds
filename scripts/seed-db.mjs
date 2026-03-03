#!/usr/bin/env node
/**
 * Seed the database with placeholder customers, jobs, invoices, and payments.
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in env (e.g. .env.local).
 * Run: node --env-file=.env.local scripts/seed-db.mjs
 * Or: npm run db:seed
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Use .env.local or --env-file=.env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const CUSTOMER_IDS = [
  "c1000001-0000-4000-8000-000000000001",
  "c1000001-0000-4000-8000-000000000002",
  "c1000001-0000-4000-8000-000000000003",
  "c1000001-0000-4000-8000-000000000004",
  "c1000001-0000-4000-8000-000000000005",
  "c1000001-0000-4000-8000-000000000006",
  "c1000001-0000-4000-8000-000000000007",
  "c1000001-0000-4000-8000-000000000008",
  "c1000001-0000-4000-8000-000000000009",
  "c1000001-0000-4000-8000-00000000000a",
];

const customers = [
  { id: CUSTOMER_IDS[0], name: "Anderson Home (seed)", phone: "(317) 555-1001", email: "anderson@example.com" },
  { id: CUSTOMER_IDS[1], name: "Baker Family (seed)", phone: "(317) 555-1002", email: "baker@example.com" },
  { id: CUSTOMER_IDS[2], name: "Clark Construction (seed)", phone: "(317) 555-1003", email: "clark@example.com" },
  { id: CUSTOMER_IDS[3], name: "Davis Properties (seed)", phone: "(317) 555-1004", email: "davis@example.com" },
  { id: CUSTOMER_IDS[4], name: "Evans Realty (seed)", phone: "(317) 555-1005", email: "evans@example.com" },
  { id: CUSTOMER_IDS[5], name: "Foster & Sons (seed)", phone: "(317) 555-1006", email: "foster@example.com" },
  { id: CUSTOMER_IDS[6], name: "Green Valley HOA (seed)", phone: "(317) 555-1007", email: "hoa@greenvalley.example.com" },
  { id: CUSTOMER_IDS[7], name: "Harris Residence (seed)", phone: "(317) 555-1008", email: "harris@example.com" },
  { id: CUSTOMER_IDS[8], name: "Indy Commercial LLC (seed)", phone: "(317) 555-1009", email: "indy@example.com" },
  { id: CUSTOMER_IDS[9], name: "Johnson Rental (seed)", phone: "(317) 555-1010", email: "johnson@example.com" },
];

function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out.toISOString();
}
function addHours(iso, h) {
  const d = new Date(iso);
  d.setHours(d.getHours() + h);
  return d.toISOString();
}

const now = new Date();
const jobs = [
  { id: "a2000001-0000-4000-8000-000000000001", customer_id: CUSTOMER_IDS[0], title: "Front door replacement", address_line1: "123 Oak St", address_line2: null, city: "Indianapolis", state: "IN", zip: "46201", scheduled_start: addHours(addDays(now, 2), 9), scheduled_end: addHours(addDays(now, 2), 11), status: "scheduled", notes: "Customer prefers morning slot." },
  { id: "a2000001-0000-4000-8000-000000000002", customer_id: CUSTOMER_IDS[1], title: "Garage door repair", address_line1: "456 Elm Ave", address_line2: "Unit B", city: "Indianapolis", state: "IN", zip: "46202", scheduled_start: addHours(addDays(now, 3), 10), scheduled_end: addHours(addDays(now, 3), 11), status: "scheduled", notes: null },
  { id: "a2000001-0000-4000-8000-000000000003", customer_id: CUSTOMER_IDS[2], title: "Commercial entry doors x4", address_line1: "789 Commerce Dr", address_line2: null, city: "Indianapolis", state: "IN", zip: "46203", scheduled_start: addHours(addDays(now, 5), 8), scheduled_end: addHours(addDays(now, 5), 14), status: "lead", notes: "Send quote first." },
  { id: "a2000001-0000-4000-8000-000000000004", customer_id: CUSTOMER_IDS[3], title: "Sliding patio door", address_line1: "321 Maple Ln", address_line2: null, city: "Carmel", state: "IN", zip: "46032", scheduled_start: addHours(addDays(now, -1), 9), scheduled_end: addHours(addDays(now, -1), 12), status: "completed", notes: "Left key with neighbor." },
  { id: "a2000001-0000-4000-8000-000000000005", customer_id: CUSTOMER_IDS[4], title: "Window + door package", address_line1: "555 Realtor Way", address_line2: null, city: "Fishers", state: "IN", zip: "46038", scheduled_start: addHours(addDays(now, -3), 8), scheduled_end: addHours(addDays(now, -3), 12), status: "paid", notes: null },
  { id: "a2000001-0000-4000-8000-000000000006", customer_id: CUSTOMER_IDS[0], title: "Storm door install", address_line1: "123 Oak St", address_line2: null, city: "Indianapolis", state: "IN", zip: "46201", scheduled_start: addHours(addDays(now, 7), 10), scheduled_end: addHours(addDays(now, 7), 11), status: "lead", notes: "Follow-up from front door job." },
  { id: "a2000001-0000-4000-8000-000000000007", customer_id: CUSTOMER_IDS[5], title: "Garage door opener", address_line1: "100 Main St", address_line2: null, city: "Noblesville", state: "IN", zip: "46060", scheduled_start: addHours(addDays(now, 4), 9), scheduled_end: addHours(addDays(now, 4), 11), status: "scheduled", notes: null },
  { id: "a2000001-0000-4000-8000-000000000008", customer_id: CUSTOMER_IDS[6], title: "Clubhouse double doors", address_line1: "200 HOA Blvd", address_line2: null, city: "Indianapolis", state: "IN", zip: "46204", scheduled_start: null, scheduled_end: null, status: "lead", notes: "Waiting on HOA approval." },
  { id: "a2000001-0000-4000-8000-000000000009", customer_id: CUSTOMER_IDS[7], title: "Back door + frame", address_line1: "888 Harris Rd", address_line2: null, city: "Greenwood", state: "IN", zip: "46142", scheduled_start: addHours(addDays(now, 1), 10), scheduled_end: addHours(addDays(now, 1), 12), status: "scheduled", notes: "Dog in yard, use side gate." },
  { id: "a2000001-0000-4000-8000-00000000000a", customer_id: CUSTOMER_IDS[8], title: "Office building entry", address_line1: "500 Business Park", address_line2: null, city: "Indianapolis", state: "IN", zip: "46205", scheduled_start: addHours(addDays(now, -5), 8), scheduled_end: addHours(addDays(now, -5), 16), status: "completed", notes: null },
  { id: "a2000001-0000-4000-8000-00000000000b", customer_id: CUSTOMER_IDS[9], title: "Rental unit door repair", address_line1: "777 Landlord Ln", address_line2: "Apt 2", city: "Indianapolis", state: "IN", zip: "46206", scheduled_start: addHours(addDays(now, -2), 14), scheduled_end: addHours(addDays(now, -2), 15), status: "in_progress", notes: "Tenant present." },
  { id: "a2000001-0000-4000-8000-00000000000c", customer_id: CUSTOMER_IDS[1], title: "Basement egress window", address_line1: "456 Elm Ave", address_line2: null, city: "Indianapolis", state: "IN", zip: "46202", scheduled_start: addHours(addDays(now, 6), 9), scheduled_end: null, status: "lead", notes: null },
  { id: "a2000001-0000-4000-8000-00000000000d", customer_id: CUSTOMER_IDS[3], title: "Second property - garage", address_line1: "999 Rental Pl", address_line2: null, city: "Carmel", state: "IN", zip: "46032", scheduled_start: addHours(addDays(now, -7), 10), scheduled_end: addHours(addDays(now, -7), 12), status: "paid", notes: null },
  { id: "a2000001-0000-4000-8000-00000000000e", customer_id: CUSTOMER_IDS[4], title: "New construction - 3 doors", address_line1: "100 New Build Dr", address_line2: null, city: "Fishers", state: "IN", zip: "46038", scheduled_start: addHours(addDays(now, 14), 8), scheduled_end: addHours(addDays(now, 14), 13), status: "lead", notes: "Builder will provide specs." },
  { id: "a2000001-0000-4000-8000-00000000000f", customer_id: CUSTOMER_IDS[6], title: "Pool gate latch", address_line1: "200 HOA Blvd", address_line2: "Pool area", city: "Indianapolis", state: "IN", zip: "46204", scheduled_start: addHours(addDays(now, 3), 11), scheduled_end: addHours(addDays(now, 3), 11.5), status: "scheduled", notes: "Quick fix." },
];

const invoiceIds = [
  "b3000001-0000-4000-8000-000000000001", "b3000001-0000-4000-8000-000000000002", "b3000001-0000-4000-8000-000000000003",
  "b3000001-0000-4000-8000-000000000004", "b3000001-0000-4000-8000-000000000005", "b3000001-0000-4000-8000-000000000006",
  "b3000001-0000-4000-8000-000000000007", "b3000001-0000-4000-8000-000000000008", "b3000001-0000-4000-8000-000000000009",
  "b3000001-0000-4000-8000-00000000000a", "b3000001-0000-4000-8000-00000000000b", "b3000001-0000-4000-8000-00000000000c",
  "b3000001-0000-4000-8000-00000000000d", "b3000001-0000-4000-8000-00000000000e", "b3000001-0000-4000-8000-00000000000f",
];

const jobIds = jobs.map((j) => j.id);
const invoices = jobIds.map((jid, i) => ({
  id: invoiceIds[i],
  job_id: jid,
  status: ["draft", "draft", "draft", "sent", "paid", "draft", "draft", "draft", "sent", "partially_paid", "draft", "draft", "paid", "draft", "draft"][i],
  tax_cents: [0, 0, 0, 1200, 4500, 0, 0, 0, 800, 600, 0, 0, 2200, 0, 0][i],
}));

const lineItems = [
  { invoice_id: invoiceIds[0], description: "Front door unit", qty: 1, unit_price_cents: 85000, line_total_cents: 85000 },
  { invoice_id: invoiceIds[0], description: "Installation", qty: 1, unit_price_cents: 35000, line_total_cents: 35000 },
  { invoice_id: invoiceIds[1], description: "Garage door repair labor", qty: 1, unit_price_cents: 18500, line_total_cents: 18500 },
  { invoice_id: invoiceIds[2], description: "Commercial entry door", qty: 4, unit_price_cents: 42000, line_total_cents: 168000 },
  { invoice_id: invoiceIds[2], description: "Install per door", qty: 4, unit_price_cents: 15000, line_total_cents: 60000 },
  { invoice_id: invoiceIds[3], description: "Sliding patio door", qty: 1, unit_price_cents: 120000, line_total_cents: 120000 },
  { invoice_id: invoiceIds[3], description: "Installation", qty: 1, unit_price_cents: 45000, line_total_cents: 45000 },
  { invoice_id: invoiceIds[4], description: "Window package", qty: 1, unit_price_cents: 180000, line_total_cents: 180000 },
  { invoice_id: invoiceIds[4], description: "Door package", qty: 1, unit_price_cents: 220000, line_total_cents: 220000 },
  { invoice_id: invoiceIds[4], description: "Installation", qty: 1, unit_price_cents: 55000, line_total_cents: 55000 },
  { invoice_id: invoiceIds[5], description: "Storm door", qty: 1, unit_price_cents: 32000, line_total_cents: 32000 },
  { invoice_id: invoiceIds[5], description: "Installation", qty: 1, unit_price_cents: 15000, line_total_cents: 15000 },
  { invoice_id: invoiceIds[6], description: "Garage door opener", qty: 1, unit_price_cents: 28000, line_total_cents: 28000 },
  { invoice_id: invoiceIds[6], description: "Installation", qty: 1, unit_price_cents: 12000, line_total_cents: 12000 },
  { invoice_id: invoiceIds[7], description: "Double door unit", qty: 1, unit_price_cents: 65000, line_total_cents: 65000 },
  { invoice_id: invoiceIds[8], description: "Back door + frame", qty: 1, unit_price_cents: 72000, line_total_cents: 72000 },
  { invoice_id: invoiceIds[8], description: "Installation", qty: 1, unit_price_cents: 28000, line_total_cents: 28000 },
  { invoice_id: invoiceIds[9], description: "Office entry door", qty: 1, unit_price_cents: 95000, line_total_cents: 95000 },
  { invoice_id: invoiceIds[9], description: "Installation", qty: 1, unit_price_cents: 38000, line_total_cents: 38000 },
  { invoice_id: invoiceIds[10], description: "Door repair labor", qty: 1, unit_price_cents: 12500, line_total_cents: 12500 },
  { invoice_id: invoiceIds[11], description: "Egress window", qty: 1, unit_price_cents: 48000, line_total_cents: 48000 },
  { invoice_id: invoiceIds[12], description: "Garage door panel", qty: 1, unit_price_cents: 42000, line_total_cents: 42000 },
  { invoice_id: invoiceIds[12], description: "Installation", qty: 1, unit_price_cents: 18000, line_total_cents: 18000 },
  { invoice_id: invoiceIds[13], description: "Entry door", qty: 3, unit_price_cents: 38000, line_total_cents: 114000 },
  { invoice_id: invoiceIds[13], description: "Installation", qty: 3, unit_price_cents: 14000, line_total_cents: 42000 },
  { invoice_id: invoiceIds[14], description: "Pool gate latch repair", qty: 1, unit_price_cents: 4500, line_total_cents: 4500 },
];

async function clearSeedData() {
  const { data: custs } = await supabase.from("customers").select("id").like("name", "%(seed)%");
  if (!custs?.length) return;
  const ids = custs.map((c) => c.id);
  const { data: jobRows } = await supabase.from("jobs").select("id").in("customer_id", ids);
  const jobIdsToDelete = jobRows?.map((j) => j.id) ?? [];
  if (!jobIdsToDelete.length) {
    await supabase.from("customers").delete().in("id", ids);
    return;
  }
  const { data: invRows } = await supabase.from("invoices").select("id").in("job_id", jobIdsToDelete);
  const invIds = invRows?.map((i) => i.id) ?? [];
  if (invIds.length) {
    await supabase.from("payments").delete().in("invoice_id", invIds);
    await supabase.from("invoice_items").delete().in("invoice_id", invIds);
    await supabase.from("invoices").delete().in("id", invIds);
  }
  await supabase.from("jobs").delete().in("id", jobIdsToDelete);
  await supabase.from("customers").delete().in("id", ids);
}

async function main() {
  console.log("Clearing existing seed data...");
  await clearSeedData();

  console.log("Inserting customers...");
  const { error: e1 } = await supabase.from("customers").upsert(customers, { onConflict: "id" });
  if (e1) {
    console.error("Customers:", e1.message);
    process.exit(1);
  }

  console.log("Inserting jobs...");
  const { error: e2 } = await supabase.from("jobs").upsert(jobs, { onConflict: "id" });
  if (e2) {
    console.error("Jobs:", e2.message);
    process.exit(1);
  }

  console.log("Inserting invoices...");
  const { error: e3 } = await supabase.from("invoices").upsert(invoices, { onConflict: "id" });
  if (e3) {
    console.error("Invoices:", e3.message);
    process.exit(1);
  }

  console.log("Inserting invoice line items...");
  const { error: e4 } = await supabase.from("invoice_items").insert(lineItems);
  if (e4) {
    console.error("Invoice items:", e4.message);
    process.exit(1);
  }

  console.log("Recomputing invoice totals...");
  for (const id of invoiceIds) {
    await supabase.rpc("recompute_invoice_totals", { p_invoice_id: id });
  }

  console.log("Inserting payments...");
  await supabase.from("payments").insert([
    { invoice_id: invoiceIds[4], amount_cents: 455500, provider: "stripe", status: "succeeded" },
    { invoice_id: invoiceIds[12], amount_cents: 62000, provider: "stripe", status: "succeeded" },
    { invoice_id: invoiceIds[9], amount_cents: 100000, provider: "stripe", status: "succeeded" },
  ]);

  await supabase.rpc("recompute_invoice_totals", { p_invoice_id: invoiceIds[4] });
  await supabase.rpc("recompute_invoice_totals", { p_invoice_id: invoiceIds[12] });
  await supabase.rpc("recompute_invoice_totals", { p_invoice_id: invoiceIds[9] });

  console.log("Done. Seeded", customers.length, "customers,", jobs.length, "jobs,", invoices.length, "invoices.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
