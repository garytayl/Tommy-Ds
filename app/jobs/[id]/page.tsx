import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { CollectPaymentButton } from "@/components/CollectPaymentButton";
import { InvoiceSummary } from "@/components/InvoiceSummary";
import { JobMapDynamic } from "@/components/JobMapDynamic";
import { JobStatusBadge } from "@/components/JobStatusBadge";
import { JobStickyActions } from "@/components/JobStickyActions";
import { JobWorkspaceTabs } from "@/components/JobWorkspaceTabs";
import { getCrewDisplayName } from "@/lib/crews";
import { formatCents, dollarsToCents } from "@/lib/money";
import { computeTaxCents } from "@/lib/tax";
import { setToastCookie } from "@/lib/toast";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const JOB_STATUSES = ["lead", "scheduled", "in_progress", "completed", "paid", "canceled"];
const STATUS_LABELS: Record<string, string> = {
  lead: "Lead",
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  paid: "Paid",
  canceled: "Canceled",
};

function toIsoOrNull(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toLocalInputDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const tzOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - tzOffset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

type JobPhotoWithUrl = {
  id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  signed_url: string | null;
};

export default async function JobWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "overview" } = await searchParams;
  const supabase = await createSupabaseServerClientForData();

  const [
    jobResult,
    invoiceResult,
    installersResult,
    photosResult,
    jobMaterialsResult,
    materialsResult,
    locationsResult,
    crewsResult,
  ] = await Promise.all([
      supabase
        .from("jobs")
        .select(
          "id,title,status,notes,address_line1,address_line2,city,state,zip,scheduled_start,scheduled_end,assigned_installer_id,assigned_crew_id,customers(id,name,phone)",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("invoices")
        .select(
          "id,invoice_number,job_id,status,subtotal_cents,tax_cents,total_cents,deposit_paid_cents,balance_due_cents",
        )
        .eq("job_id", id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("user_id,full_name")
        .eq("role", "installer")
        .order("full_name", { ascending: true }),
      supabase
        .from("job_photos")
        .select("id,storage_path,caption,created_at")
        .eq("job_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("job_materials")
        .select("id,material_id,quantity,location_id,notes,materials(id,name,unit),locations(id,name,code)")
        .eq("job_id", id)
        .order("created_at", { ascending: true }),
      supabase.from("materials").select("id,name,unit").order("name", { ascending: true }),
      supabase.from("locations").select("id,name,code").order("code", { ascending: true }),
      supabase
        .from("crews")
        .select("id,name,specialty,crew_members(user_id,profiles(user_id,full_name))")
        .order("name", { ascending: true }),
    ]);

  const invoiceId = invoiceResult.data?.id ?? null;
  const [paymentsResult, itemsResult] = await Promise.all([
    invoiceId
      ? supabase
          .from("payments")
          .select("id,amount_cents,status,provider,created_at")
          .eq("invoice_id", invoiceId)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    invoiceId
      ? supabase
          .from("invoice_items")
          .select("id,description,qty,unit_price_cents,line_total_cents")
          .eq("invoice_id", invoiceId)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  type JobRow = {
    id: string;
    title: string;
    status: string;
    notes: string | null;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    zip: string;
    scheduled_start: string | null;
    scheduled_end: string | null;
    assigned_installer_id: string | null;
    assigned_crew_id: string | null;
    customers:
      | { id: string; name: string; phone: string | null }
      | { id: string; name: string; phone: string | null }[]
      | null;
  };

  const jobRecord = jobResult.data as JobRow | null;
  const invoice = invoiceResult.data;
  const installers = installersResult.data ?? [];
  const crewsRaw = crewsResult.data ?? [];
  const crews = crewsRaw.map((c: { id: string; name: string; specialty: string; crew_members?: unknown }) => ({
    id: c.id,
    name: getCrewDisplayName({ name: c.name, crew_members: c.crew_members }),
    specialty: c.specialty,
  }));
  const photos = photosResult.data ?? [];
  const jobMaterials = jobMaterialsResult.data ?? [];
  const payments = paymentsResult.data ?? [];
  const items = itemsResult.data ?? [];
  const allMaterials = materialsResult.data ?? [];
  const allLocations = locationsResult.data ?? [];

  if (!jobRecord) notFound();
  const job = jobRecord;
  const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;
  const customerPhone = customer?.phone ?? null;

  const fullAddress = `${job.address_line1}${job.address_line2 ? `, ${job.address_line2}` : ""}, ${job.city}, ${job.state} ${job.zip}`;
  const mapQuery = encodeURIComponent(fullAddress);
  const mapsUrl = `https://maps.google.com/?q=${mapQuery}`;
  const balanceDueCents = invoice?.balance_due_cents ?? 0;

  let photosWithUrls: JobPhotoWithUrl[] = photos.map((p) => ({
    ...p,
    signed_url: null,
  }));
  try {
    const serviceClient = createSupabaseServiceClient();
    photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const { data } = await serviceClient.storage
          .from("job-photos")
          .createSignedUrl(photo.storage_path, 60 * 30);
        return { ...photo, signed_url: data?.signedUrl ?? null };
      }),
    );
  } catch {
    // no service role
  }

  async function updateJob(formData: FormData) {
    "use server";
    const supabase = await createSupabaseServerClientForData();
    await supabase
      .from("jobs")
      .update({
        status: String(formData.get("status") ?? "lead"),
        notes: String(formData.get("notes") ?? "").trim() || null,
        scheduled_start: toIsoOrNull(formData.get("scheduled_start")),
        scheduled_end: toIsoOrNull(formData.get("scheduled_end")),
        assigned_installer_id:
          String(formData.get("assigned_installer_id") ?? "").trim() || null,
        assigned_crew_id:
          String(formData.get("assigned_crew_id") ?? "").trim() || null,
      })
      .eq("id", id);
    revalidatePath(`/jobs/${id}`);
    revalidatePath("/admin/jobs");
    revalidatePath("/admin/schedule");
  }

  async function createInvoice() {
    "use server";
    const supabase = await createSupabaseServerClientForData();
    await supabase.from("invoices").insert({
      job_id: id,
      status: "draft",
      tax_cents: 0,
    });
    await setToastCookie("Invoice created");
    revalidatePath(`/jobs/${id}`);
    revalidatePath("/admin/jobs");
  }

  async function markComplete() {
    "use server";
    const supabase = await createSupabaseServerClientForData();
    await supabase.from("jobs").update({ status: "completed" }).eq("id", id);
    await setToastCookie("Job marked complete");
    revalidatePath(`/jobs/${id}`);
    revalidatePath("/m");
    revalidatePath("/admin/jobs");
  }

  async function updateFieldNotes(formData: FormData) {
    "use server";
    const supabase = await createSupabaseServerClientForData();
    const notes = String(formData.get("notes") ?? "").trim();
    await supabase.from("jobs").update({ notes: notes || null }).eq("id", id);
    await setToastCookie("Notes saved");
    revalidatePath(`/jobs/${id}`);
  }

  async function uploadPhoto(formData: FormData) {
    "use server";
    const supabase = await createSupabaseServerClientForData();
    const file = formData.get("photo");
    if (!(file instanceof File) || file.size === 0) return;
    const caption = String(formData.get("caption") ?? "").trim();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${id}/${file.lastModified || "upload"}-${safeName}`;
    const arrayBuffer = await file.arrayBuffer();
    const serviceClient = createSupabaseServiceClient();
    const { error: uploadError } = await serviceClient.storage
      .from("job-photos")
      .upload(storagePath, Buffer.from(arrayBuffer), {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
    if (uploadError) return;
    await supabase.from("job_photos").insert({
      job_id: id,
      uploader_id: null,
      storage_path: storagePath,
      caption: caption || null,
    });
    await setToastCookie("Photo uploaded");
    revalidatePath(`/jobs/${id}`);
  }

  async function addInvoiceItem(formData: FormData) {
    "use server";
    if (!invoice) return;
    const description = String(formData.get("description") ?? "").trim();
    const qty = Number.parseFloat(String(formData.get("qty") ?? "1"));
    const unitPriceCents = dollarsToCents(String(formData.get("unit_price") ?? "0"));
    if (!description || !Number.isFinite(qty) || qty <= 0 || unitPriceCents <= 0) return;
    const lineTotalCents = Math.round(qty * unitPriceCents);
    const supabase = await createSupabaseServerClientForData();
    await supabase.from("invoice_items").insert({
      invoice_id: invoice.id,
      description,
      qty,
      unit_price_cents: unitPriceCents,
      line_total_cents: lineTotalCents,
    });
    // Auto-apply Indiana default tax after line items change (staff can override in tax field)
    const { data: inv } = await supabase.from("invoices").select("subtotal_cents").eq("id", invoice.id).single();
    if (inv?.subtotal_cents != null) {
      const taxCents = computeTaxCents(inv.subtotal_cents);
      await supabase.from("invoices").update({ tax_cents: taxCents }).eq("id", invoice.id);
      await supabase.rpc("recompute_invoice_totals", { p_invoice_id: invoice.id });
    }
    await setToastCookie("Line item added");
    revalidatePath(`/jobs/${id}`);
    revalidatePath(`/admin/invoices/${invoice.id}`);
  }

  async function updateTax(formData: FormData) {
    "use server";
    if (!invoice) return;
    const taxCents = dollarsToCents(String(formData.get("tax") ?? "0"));
    const supabase = await createSupabaseServerClientForData();
    await supabase.from("invoices").update({ tax_cents: taxCents }).eq("id", invoice.id);
    await supabase.rpc("recompute_invoice_totals", { p_invoice_id: invoice.id });
    await setToastCookie("Tax updated");
    revalidatePath(`/jobs/${id}`);
    revalidatePath(`/admin/invoices/${invoice.id}`);
  }

  async function addJobMaterial(formData: FormData) {
    "use server";
    const materialId = String(formData.get("material_id") ?? "").trim();
    const qty = Number.parseFloat(String(formData.get("quantity") ?? "1"));
    const locationId = String(formData.get("location_id") ?? "").trim() || null;
    const notes = String(formData.get("notes") ?? "").trim() || null;
    if (!materialId || !Number.isFinite(qty) || qty <= 0) return;
    const supabase = await createSupabaseServerClientForData();
    await supabase.from("job_materials").insert({
      job_id: id,
      material_id: materialId,
      quantity: qty,
      location_id: locationId || null,
      notes,
    });
    await setToastCookie("Material added");
    revalidatePath(`/jobs/${id}`);
  }

  async function removeJobMaterial(formData: FormData) {
    "use server";
    const rowId = String(formData.get("job_material_id") ?? "").trim();
    if (!rowId) return;
    const supabase = await createSupabaseServerClientForData();
    await supabase.from("job_materials").delete().eq("id", rowId).eq("job_id", id);
    await setToastCookie("Material removed");
    revalidatePath(`/jobs/${id}`);
  }

  return (
    <div className="space-y-0 pb-24 sm:pb-0">
      {/* Job header */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{job.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {customer?.id ? (
                <Link href={`/admin/customers/${customer.id}`} className="link">
                  {customer.name}
                </Link>
              ) : (
                "Unknown customer"
              )}
              {customerPhone ? (
                <>
                  {" · "}
                  <a href={`tel:${customerPhone.replace(/\D/g, "")}`} className="link">
                    {customerPhone}
                  </a>
                </>
              ) : null}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {job.address_line1}
              {job.address_line2 ? `, ${job.address_line2}` : ""}
              {`, ${job.city}, ${job.state} ${job.zip}`}
            </p>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm font-medium text-primary"
            >
              Open in Maps →
            </a>
            <div className="mt-4">
              <JobMapDynamic address={fullAddress} title={job.title} height={240} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <JobStatusBadge status={job.status} />
            {balanceDueCents > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                {formatCents(balanceDueCents)} due
              </span>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {JOB_STATUSES.filter((s) => s !== "canceled").map((s) => (
            <span
              key={s}
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                job.status === s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {STATUS_LABELS[s] ?? s}
            </span>
          ))}
        </div>
      </div>

      <Suspense fallback={<div className="h-10 border-b border-border" />}>
        <JobWorkspaceTabs jobId={id} />
      </Suspense>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Schedule & assign</h2>
            <form action={updateJob} className="mt-4 grid gap-3 sm:grid-cols-2">
              <select name="status" defaultValue={job.status} className="field">
                {JOB_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s] ?? s}
                  </option>
                ))}
              </select>
              <select
                name="assigned_crew_id"
                defaultValue={job.assigned_crew_id ?? ""}
                className="field"
              >
                <option value="">No crew</option>
                {crews.map((c: { id: string; name: string; specialty: string }) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.specialty})
                  </option>
                ))}
              </select>
              <select
                name="assigned_installer_id"
                defaultValue={job.assigned_installer_id ?? ""}
                className="field"
              >
                <option value="">Unassigned</option>
                {installers.map((inst) => (
                  <option key={inst.user_id} value={inst.user_id}>
                    {inst.full_name ?? inst.user_id}
                  </option>
                ))}
              </select>
              <input
                name="scheduled_start"
                type="datetime-local"
                defaultValue={toLocalInputDate(job.scheduled_start)}
                className="field"
              />
              <input
                name="scheduled_end"
                type="datetime-local"
                defaultValue={toLocalInputDate(job.scheduled_end)}
                className="field"
              />
              <textarea
                name="notes"
                defaultValue={job.notes ?? ""}
                className="field sm:col-span-2"
                rows={4}
                placeholder="Notes"
              />
              <button type="submit" className="btn-primary sm:col-span-2">
                Save
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === "work" && (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Field notes</h2>
            <form action={updateFieldNotes} className="mt-3 space-y-3">
              <textarea
                name="notes"
                defaultValue={job.notes ?? ""}
                rows={4}
                className="field w-full"
              />
              <button type="submit" className="btn-secondary">
                Save notes
              </button>
            </form>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Photos</h2>
            <form action={uploadPhoto} className="mt-3 grid gap-2 sm:grid-cols-3">
              <input type="file" name="photo" accept="image/*" required className="field sm:col-span-2" />
              <input type="text" name="caption" placeholder="Caption" className="field" />
              <button type="submit" className="btn-secondary sm:col-span-3">
                Upload photo
              </button>
            </form>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {photosWithUrls.map((photo) => (
                <a
                  key={photo.id}
                  href={photo.signed_url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-border bg-card p-3 text-sm shadow-sm transition hover:shadow"
                >
                  <p className="font-medium text-foreground">{photo.caption ?? "Photo"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{photo.storage_path}</p>
                </a>
              ))}
              {photosWithUrls.length === 0 && (
                <p className="text-sm text-muted-foreground">No photos yet.</p>
              )}
            </div>
          </div>
          {(job.status === "scheduled" || job.status === "in_progress") && (
            <form action={markComplete}>
              <button type="submit" className="btn-primary w-full py-3">
                Mark job complete
              </button>
            </form>
          )}
        </div>
      )}

      {tab === "supplies" && (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Supplies & parts for this job</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pull from Door Shop (center), Lower Warehouse, or Upper Warehouse.
            </p>
            <form action={addJobMaterial} className="mt-4 grid gap-3 sm:grid-cols-4">
              <select name="material_id" required className="field sm:col-span-2">
                <option value="">Select material…</option>
                {allMaterials.map((m: { id: string; name: string; unit: string }) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.unit})
                  </option>
                ))}
              </select>
              <input
                name="quantity"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue="1"
                className="field"
                placeholder="Qty"
              />
              <select name="location_id" className="field">
                <option value="">Any location</option>
                {allLocations.map((loc: { id: string; name: string; code: string }) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
              <input
                name="notes"
                type="text"
                placeholder="Notes (optional)"
                className="field sm:col-span-2"
              />
              <button type="submit" className="btn-primary">
                Add supply
              </button>
            </form>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="border-b border-border bg-muted/50 px-4 py-3 sm:px-5">
              <h2 className="text-base font-semibold text-foreground">On this job</h2>
            </div>
            <div className="table-wrap overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="table-header py-3 pl-5 pr-4">Material</th>
                    <th className="table-header py-3 pr-4">Qty</th>
                    <th className="table-header py-3 pr-4">Pull from</th>
                    <th className="table-header py-3 pr-4">Notes</th>
                    <th className="table-header py-3 pr-5">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {jobMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        No supplies added yet. Add materials above.
                      </td>
                    </tr>
                  ) : (
                    jobMaterials.map((row) => {
                      const mat = Array.isArray(row.materials) ? row.materials[0] : row.materials;
                      const loc = Array.isArray(row.locations) ? row.locations[0] : row.locations;
                      return (
                        <tr key={row.id} className="border-b border-border">
                          <td className="py-3 pl-5 pr-4 font-medium text-foreground">
                            {mat?.name ?? "—"}
                          </td>
                          <td className="py-3 pr-4 tabular-nums">{row.quantity}</td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {loc?.name ?? "—"}
                          </td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {row.notes ?? "—"}
                          </td>
                          <td className="py-3 pr-5">
                            <form action={removeJobMaterial} className="inline">
                              <input type="hidden" name="job_material_id" value={row.id} />
                              <button type="submit" className="link text-destructive">
                                Remove
                              </button>
                            </form>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "invoice" && (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">
              {invoice ? `Invoice #${invoice.invoice_number}` : "Invoice"}
            </h2>
            <InvoiceSummary invoice={invoice} />
            {invoice ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/admin/invoices/${invoice.id}`}
                  className="btn-primary inline-flex py-2.5"
                >
                  Open invoice #{invoice.invoice_number} (line items & tax)
                </Link>
              </div>
            ) : (
              <form action={createInvoice} className="mt-4">
                <button type="submit" className="btn-primary">
                  Create invoice
                </button>
              </form>
            )}
          </div>
          {invoice && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-base font-semibold text-foreground">Add line item</h2>
              <form action={addInvoiceItem} className="mt-3 grid gap-2 sm:grid-cols-4">
                <input
                  name="description"
                  type="text"
                  required
                  placeholder="Description"
                  className="field sm:col-span-2"
                />
                <input name="qty" type="number" min="0.01" step="0.01" defaultValue="1" className="field" />
                <input
                  name="unit_price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="Unit price ($)"
                  className="field"
                />
                <button type="submit" className="btn-primary sm:col-span-4">
                  Add item
                </button>
              </form>
              <form action={updateTax} className="mt-4 flex items-end gap-2">
                <div className="grow">
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Tax ($)</label>
                  <p className="mb-1 text-xs text-muted-foreground">Auto 7% (Indiana) when you add line items; override if needed.</p>
                  <input
                    type="number"
                    name="tax"
                    min="0"
                    step="0.01"
                    defaultValue={(invoice.tax_cents / 100).toFixed(2)}
                    className="field w-full"
                  />
                </div>
                <button type="submit" className="btn-primary">Save tax</button>
              </form>
              <div className="table-wrap mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="table-header py-3 pl-5 pr-4">Description</th>
                      <th className="table-header py-3 pr-4">Qty</th>
                      <th className="table-header py-3 pr-4">Unit</th>
                      <th className="table-header py-3 pr-5">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-border">
                        <td className="py-3 pl-5 pr-4">{item.description}</td>
                        <td className="py-3 pr-4 tabular-nums">{item.qty}</td>
                        <td className="py-3 pr-4 tabular-nums">{formatCents(item.unit_price_cents)}</td>
                        <td className="py-3 pr-5 tabular-nums">{formatCents(item.line_total_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "payments" && (
        <div className="mt-6 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Collect payment</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Send customer to Stripe hosted checkout.
            </p>
            {invoice ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <CollectPaymentButton
                  invoiceId={invoice.id}
                  disabled={invoice.balance_due_cents <= 0}
                />
                {invoice.deposit_paid_cents > 0 && (
                  <Link
                    href={`/receipt/${invoice.id}`}
                    className="inline-flex items-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    View receipt
                  </Link>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Create an invoice first.</p>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="border-b border-border bg-muted/50 px-4 py-3">
              <h2 className="text-base font-semibold text-foreground">Payment history</h2>
            </div>
            <div className="table-wrap overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="table-header py-3 pl-5 pr-4">Date</th>
                    <th className="table-header py-3 pr-4">Amount</th>
                    <th className="table-header py-3 pr-5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-muted-foreground">
                        No payments yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="border-b border-border">
                        <td className="py-3 pl-5 pr-4 text-muted-foreground">
                          {new Date(p.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 pr-4 tabular-nums">{formatCents(p.amount_cents)}</td>
                        <td className="py-3 pr-5">{p.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <JobStickyActions
        phone={customerPhone}
        mapsUrl={mapsUrl}
        balanceDueCents={balanceDueCents}
        invoiceId={invoice?.id ?? null}
        jobStatus={job.status}
        onMarkComplete={markComplete}
      />
    </div>
  );
}
