import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { InvoiceSummary } from "@/components/InvoiceSummary";
import { CopyToClipboardButton } from "@/components/CopyToClipboardButton";
import { JobKindBadge, type JobKind } from "@/components/JobKindBadge";
import { JobStatusBadge } from "@/components/JobStatusBadge";
import { JobStickyActions } from "@/components/JobStickyActions";
import { PaymentTemplateAutofill } from "@/components/PaymentTemplateAutofill";
import { JobWorkspaceTabs } from "@/components/JobWorkspaceTabs";
import { SubmitButton } from "@/components/SubmitButton";
import { getCrewDisplayName } from "@/lib/crews";
import { formatCents, dollarsToCents } from "@/lib/money";
import { getAppUrl, getStripeServerClient, isStripeConfigured } from "@/lib/stripe";
import { computeTaxCents } from "@/lib/tax";
import { jobHasRecordedPayments } from "@/lib/job-destruct";
import { getOfficeSessionOrNull, UNAUTHORIZED_TOAST } from "@/lib/server-action-guards";
import { setToastCookie } from "@/lib/toast";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const JOB_STATUSES = [
  "lead",
  "consultation_scheduled",
  "measured",
  "quote_sent",
  "approved",
  "scheduled",
  "installed",
  "paid",
  "closed",
  "canceled",
];
const STATUS_LABELS: Record<string, string> = {
  lead: "Lead",
  consultation_scheduled: "Consultation scheduled",
  measured: "Measured",
  quote_sent: "Quote sent",
  approved: "Approved",
  scheduled: "Scheduled",
  installed: "Installed",
  in_progress: "In progress",
  completed: "Completed",
  paid: "Paid",
  closed: "Closed",
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

function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

type JobPhotoWithUrl = {
  id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  signed_url: string | null;
};

type IsolatedPaymentRow = {
  id: string;
  created_at: string;
  amount_cents: number;
  description: string;
  note: string | null;
  status: string;
  stripe_checkout_url: string | null;
  invoice_id: string | null;
  customers:
    | { name: string | null; email: string | null; phone: string | null }
    | { name: string | null; email: string | null; phone: string | null }[]
    | null;
};

export default async function JobWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; debug?: string }>;
}) {
  const { id } = await params;
  const searchParamsResolved = await searchParams;
  const { tab = "overview" } = searchParamsResolved;
  const showDebug = searchParamsResolved.debug === "1";

  // Use the same data client as the jobs list so list and detail always see the same rows.
  const supabase = await createSupabaseServerClient();
  const jobResult = await supabase
    .from("jobs")
    .select(
      "id,title,status,notes,job_kind,address_line1,address_line2,city,state,zip,scheduled_start,scheduled_end,assigned_installer_id,assigned_crew_id,customers(id,name,phone,email)",
    )
    .eq("id", id)
    .maybeSingle();

  const [
    invoiceResult,
    installersResult,
    photosResult,
    jobMaterialsResult,
    materialsResult,
    locationsResult,
    crewsResult,
    activitiesResult,
    jobNotesResult,
    quoteResult,
    isolatedPaymentsResult,
  ] = await Promise.all([
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
      supabase
        .from("activities")
        .select("id,type,title,description,scheduled_date,assigned_to,status,created_at")
        .eq("job_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("job_notes")
        .select("id,note_type,note,created_by,created_at")
        .eq("job_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("quotes")
        .select("id,title,status,subtotal_cents,tax_cents,total_cents")
        .eq("job_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("isolated_payments")
        .select(
          "id,created_at,amount_cents,description,note,status,stripe_checkout_url,invoice_id,customers(name,email,phone)",
        )
        .eq("job_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const invoiceId = invoiceResult.data?.id ?? null;
  const itemsResult = await (invoiceId
    ? supabase
        .from("invoice_items")
        .select("id,description,qty,unit_price_cents,line_total_cents")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: true })
    : Promise.resolve({ data: [] }));

  type JobRow = {
    id: string;
    title: string;
    status: string;
    notes: string | null;
    job_kind: JobKind;
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
      | { id: string; name: string; phone: string | null; email: string | null }
      | { id: string; name: string; phone: string | null; email: string | null }[]
      | null;
  };

  const jobRecord = jobResult.data as JobRow | null;
  const invoice = invoiceResult.data;
  const installers = installersResult.data ?? [];
  const crewsRaw = crewsResult.data ?? [];
  const activities = activitiesResult.data ?? [];
  const jobNotes = jobNotesResult.data ?? [];
  const quote = quoteResult.data;
  const crews = crewsRaw.map((c: { id: string; name: string; specialty: string; crew_members?: unknown }) => ({
    id: c.id,
    name: getCrewDisplayName({ name: c.name, crew_members: c.crew_members }),
    specialty: c.specialty,
  }));
  const photos = photosResult.data ?? [];
  const jobMaterials = jobMaterialsResult.data ?? [];
  const items = itemsResult.data ?? [];
  const allMaterials = materialsResult.data ?? [];
  const allLocations = locationsResult.data ?? [];
  const isolatedPayments = (isolatedPaymentsResult.data ?? []) as IsolatedPaymentRow[];

  if (!jobRecord) {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-xl border border-border bg-card p-6 text-center">
        <h1 className="text-lg font-semibold text-foreground">Job not found</h1>
        <p className="text-sm text-muted-foreground">
          This job may have been removed or you may not have access to it. Add{" "}
          <code className="rounded bg-muted px-1">?debug=1</code> to the URL for details.
        </p>
        {showDebug && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-left text-sm">
            <p className="font-medium text-foreground">Debug (add ?debug=1 to the URL)</p>
            <p className="mt-1 text-muted-foreground">Job ID: {id}</p>
            {jobResult.error && (
              <p className="mt-1 text-amber-700 dark:text-amber-400">
                Supabase error: {jobResult.error.message} (code: {jobResult.error.code})
              </p>
            )}
            <p className="mt-1 text-muted-foreground">
              Service role key set: {process.env.SUPABASE_SERVICE_ROLE_KEY ? "yes" : "no"}
            </p>
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link href="/admin/jobs" className="btn-primary">
            All jobs
          </Link>
          <Link href="/admin/schedule" className="btn-secondary">
            Schedule
          </Link>
          {showDebug && (
            <Link href={`/jobs/${id}?debug=1`} className="text-sm text-muted-foreground underline">
              Reload with debug
            </Link>
          )}
        </div>
      </div>
    );
  }
  const job = jobRecord;
  const jobKind: JobKind = job.job_kind === "service" ? "service" : "installation";
  const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;
  const customerPhone = customer?.phone ?? null;

  const fullAddress = `${job.address_line1}${job.address_line2 ? `, ${job.address_line2}` : ""}, ${job.city}, ${job.state} ${job.zip}`;
  const mapQuery = encodeURIComponent(fullAddress);
  const mapsUrl = `https://maps.google.com/?q=${mapQuery}`;
  const balanceDueCents = invoice?.balance_due_cents ?? 0;
  const stripeEnabled = isStripeConfigured();

  let photosWithUrls: JobPhotoWithUrl[] = photos.map((p) => ({
    ...p,
    signed_url: null,
  }));
  try {
    photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const { data } = await supabase.storage
          .from("job-photos")
          .createSignedUrl(photo.storage_path, 60 * 30);
        return { ...photo, signed_url: data?.signedUrl ?? null };
      }),
    );
  } catch {
    // signed URL failed (e.g. storage policy)
  }

  async function updateJob(formData: FormData) {
    "use server";
    const session = await getOfficeSessionOrNull();
    if (!session) {
      await setToastCookie(UNAUTHORIZED_TOAST);
      return;
    }
    const { supabase } = session;
    const kindRaw = String(formData.get("job_kind") ?? "installation").trim();
    const job_kind: JobKind = kindRaw === "service" ? "service" : "installation";
    await supabase
      .from("jobs")
      .update({
        status: String(formData.get("status") ?? "lead"),
        notes: String(formData.get("notes") ?? "").trim() || null,
        job_kind,
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
    const session = await getOfficeSessionOrNull();
    if (!session) {
      await setToastCookie(UNAUTHORIZED_TOAST);
      return;
    }
    const { supabase } = session;
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
    const session = await getOfficeSessionOrNull();
    if (!session) {
      await setToastCookie(UNAUTHORIZED_TOAST);
      return;
    }
    const { supabase } = session;
    await supabase.from("jobs").update({ status: "installed" }).eq("id", id);
    await setToastCookie("Job marked complete");
    revalidatePath(`/jobs/${id}`);
    revalidatePath("/m");
    revalidatePath("/admin/jobs");
  }

  async function updateFieldNotes(formData: FormData) {
    "use server";
    const session = await getOfficeSessionOrNull();
    if (!session) {
      await setToastCookie(UNAUTHORIZED_TOAST);
      return;
    }
    const { supabase } = session;
    const notes = String(formData.get("notes") ?? "").trim();
    await supabase.from("jobs").update({ notes: notes || null }).eq("id", id);
    await setToastCookie("Notes saved");
    revalidatePath(`/jobs/${id}`);
  }

  async function uploadPhoto(formData: FormData) {
    "use server";
    const session = await getOfficeSessionOrNull();
    if (!session) {
      await setToastCookie(UNAUTHORIZED_TOAST);
      return;
    }
    const { supabase } = session;
    const file = formData.get("photo");
    if (!(file instanceof File) || file.size === 0) return;
    const caption = String(formData.get("caption") ?? "").trim();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${id}/${file.lastModified || "upload"}-${safeName}`;
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
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
    const session = await getOfficeSessionOrNull();
    if (!session) {
      await setToastCookie(UNAUTHORIZED_TOAST);
      return;
    }
    const { supabase } = session;
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
    const session = await getOfficeSessionOrNull();
    if (!session) {
      await setToastCookie(UNAUTHORIZED_TOAST);
      return;
    }
    const { supabase } = session;
    await supabase.from("invoices").update({ tax_cents: taxCents }).eq("id", invoice.id);
    await supabase.rpc("recompute_invoice_totals", { p_invoice_id: invoice.id });
    await setToastCookie("Tax updated");
    revalidatePath(`/jobs/${id}`);
    revalidatePath(`/admin/invoices/${invoice.id}`);
  }

  async function createIsolatedPayment(formData: FormData) {
    "use server";
    const session = await getOfficeSessionOrNull();
    if (!session) {
      await setToastCookie(UNAUTHORIZED_TOAST);
      return;
    }
    if (!isStripeConfigured()) {
      await setToastCookie("Stripe is not configured. Add STRIPE_SECRET_KEY.");
      return;
    }

    const description = String(formData.get("description") ?? "").trim();
    const amountCents = dollarsToCents(String(formData.get("amount") ?? "0"));
    const note = String(formData.get("note") ?? "").trim() || null;
    const collectionMode = String(formData.get("collection_mode") ?? "link").trim();
    const collectNow = collectionMode === "collect_now";
    if (!description || amountCents <= 0) {
      await setToastCookie("Enter a description and amount greater than $0.");
      return;
    }

    const { supabase, profile } = session;
    const { data: jobForBilling } = await supabase
      .from("jobs")
      .select("customer_id,customers(email)")
      .eq("id", id)
      .maybeSingle();

    const customerEmail = firstOf(
      (jobForBilling?.customers ?? null) as
        | { email: string | null }
        | { email: string | null }[]
        | null,
    )?.email;

    const stripe = getStripeServerClient();
    const appUrl = getAppUrl();
    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${appUrl}/pay/success`,
      cancel_url: `${appUrl}/pay/cancel`,
      customer_email: customerEmail ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: description,
              description: note ?? undefined,
            },
          },
        },
      ],
      metadata: {
        source: "isolated_payment",
        invoice_id: invoice?.id ?? "",
        job_id: id,
      },
    });

    await supabase.from("isolated_payments").insert({
      amount_cents: amountCents,
      description,
      note,
      status: "open",
      invoice_id: invoice?.id ?? null,
      job_id: id,
      customer_id: jobForBilling?.customer_id ?? null,
      stripe_checkout_session_id: stripeSession.id,
      stripe_checkout_url: stripeSession.url,
      created_by: profile.user_id,
    });

    revalidatePath(`/jobs/${id}`);
    revalidatePath("/admin/billings");
    if (invoice?.id) revalidatePath(`/admin/invoices/${invoice.id}`);

    if (collectNow && stripeSession.url) {
      redirect(stripeSession.url);
    }

    await setToastCookie("Payment link created");
  }

  async function addJobMaterial(formData: FormData) {
    "use server";
    const materialId = String(formData.get("material_id") ?? "").trim();
    const qty = Number.parseFloat(String(formData.get("quantity") ?? "1"));
    const locationId = String(formData.get("location_id") ?? "").trim() || null;
    const notes = String(formData.get("notes") ?? "").trim() || null;
    if (!materialId || !Number.isFinite(qty) || qty <= 0) return;
    const session = await getOfficeSessionOrNull();
    if (!session) {
      await setToastCookie(UNAUTHORIZED_TOAST);
      return;
    }
    const { supabase } = session;
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
    const session = await getOfficeSessionOrNull();
    if (!session) {
      await setToastCookie(UNAUTHORIZED_TOAST);
      return;
    }
    const { supabase } = session;
    await supabase.from("job_materials").delete().eq("id", rowId).eq("job_id", id);
    await setToastCookie("Material removed");
    revalidatePath(`/jobs/${id}`);
  }

  async function addActivity(formData: FormData) {
    "use server";
    const type = String(formData.get("activity_type") ?? "note").trim();
    const title = String(formData.get("activity_title") ?? "").trim();
    const description = String(formData.get("activity_description") ?? "").trim() || null;
    const scheduledDate = toIsoOrNull(formData.get("activity_scheduled_date"));
    if (!type) return;
    const session = await getOfficeSessionOrNull();
    if (!session) {
      await setToastCookie(UNAUTHORIZED_TOAST);
      return;
    }
    const { supabase } = session;
    await supabase.from("activities").insert({
      job_id: id,
      type: type as "created" | "note" | "consultation" | "pre_measure" | "measure" | "design" | "quote_sent" | "follow_up" | "customer_acceptance" | "deposit_received" | "schedule_install" | "walkthrough" | "install" | "payment_received",
      title: title || null,
      description,
      scheduled_date: scheduledDate,
      assigned_to: null,
      status: "pending",
    });
    await setToastCookie("Activity added");
    revalidatePath(`/jobs/${id}`);
  }

  async function addJobNote(formData: FormData) {
    "use server";
    const noteType = String(formData.get("note_type") ?? "internal").trim();
    const note = String(formData.get("note") ?? "").trim();
    if (!note) return;
    const session = await getOfficeSessionOrNull();
    if (!session) {
      await setToastCookie(UNAUTHORIZED_TOAST);
      return;
    }
    const { supabase } = session;
    let createdBy: string | null = null;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      createdBy = user?.id ?? null;
    } catch {
      createdBy = null;
    }
    await supabase.from("job_notes").insert({
      job_id: id,
      note_type: noteType as "internal" | "customer" | "installer" | "sales",
      note,
      created_by: createdBy,
    });
    await setToastCookie("Note added");
    revalidatePath(`/jobs/${id}`);
  }

  async function revertJobToQuote() {
    "use server";
    const session = await getOfficeSessionOrNull();
    if (!session) {
      await setToastCookie(UNAUTHORIZED_TOAST);
      return;
    }
    const { supabase } = session;
    const { data: q } = await supabase.from("quotes").select("id").eq("job_id", id).maybeSingle();
    if (!q?.id) {
      await setToastCookie("This job has no linked quote");
      revalidatePath(`/jobs/${id}`);
      return;
    }
    if (await jobHasRecordedPayments(supabase, id)) {
      await setToastCookie("Cannot revert: this job has recorded invoice payments");
      revalidatePath(`/jobs/${id}`);
      return;
    }
    await supabase.from("jobs").delete().eq("id", id);
    await supabase.from("quotes").update({ status: "sent" }).eq("id", q.id);
    revalidatePath("/admin/quotes");
    revalidatePath("/admin/jobs");
    revalidatePath("/admin/schedule");
    await setToastCookie("Job removed — back to estimate / quote");
    redirect(`/admin/quotes/${q.id}`);
  }

  async function deleteJob() {
    "use server";
    const session = await getOfficeSessionOrNull();
    if (!session) {
      await setToastCookie(UNAUTHORIZED_TOAST);
      return;
    }
    const { supabase } = session;
    if (await jobHasRecordedPayments(supabase, id)) {
      await setToastCookie("Cannot delete: this job has recorded invoice payments");
      revalidatePath(`/jobs/${id}`);
      return;
    }
    await supabase.from("jobs").delete().eq("id", id);
    revalidatePath("/admin/jobs");
    revalidatePath("/admin/schedule");
    revalidatePath("/admin/quotes");
    await setToastCookie("Job deleted");
    redirect("/admin/jobs");
  }

  return (
    <div className="space-y-0 pb-24 sm:pb-0">
      {/* Job header */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap gap-3 text-sm">
              <Link href="/admin/jobs" className="link">
                ← Back to jobs
              </Link>
              <Link href="/admin/schedule" className="link">
                Schedule
              </Link>
              <Link href="/admin/invoices" className="link">
                Invoices
              </Link>
            </div>
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
              className="mt-2 inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted"
            >
              Open in Maps →
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <JobKindBadge kind={jobKind} />
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
        <JobWorkspaceTabs />
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
              <select name="job_kind" defaultValue={jobKind} className="field">
                <option value="installation">Installation</option>
                <option value="service">Service</option>
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
              <SubmitButton className="sm:col-span-2">Save</SubmitButton>
            </form>
          </div>

          {/* Quote section */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Estimate / quote</h2>
            {quote ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link href={`/admin/quotes/${quote.id}`} className="link font-medium">
                  {quote.title ?? "Open"}
                </Link>
                <span className="text-sm text-muted-foreground">
                  {quote.status} · {formatCents((quote as { subtotal_cents?: number }).subtotal_cents ?? 0)} + tax
                </span>
                <Link href={`/admin/quotes/${quote.id}/print`} target="_blank" rel="noreferrer" className="text-sm link">
                  Print
                </Link>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No estimate linked to this job. <Link href="/admin/quotes/new" className="link">Create an estimate</Link> from the customer record if needed.
              </p>
            )}
          </div>

          {/* Activity timeline */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Activity timeline</h2>
            <form action={addActivity} className="mt-3 flex flex-wrap gap-2">
              <select name="activity_type" className="field w-full sm:w-auto">
                <option value="note">Note</option>
                <option value="consultation">Consultation</option>
                <option value="pre_measure">Pre-measure</option>
                <option value="measure">Measure</option>
                <option value="design">Design</option>
                <option value="quote_sent">Quote sent</option>
                <option value="follow_up">Follow-up</option>
                <option value="customer_acceptance">Customer acceptance</option>
                <option value="deposit_received">Deposit received</option>
                <option value="schedule_install">Schedule install</option>
                <option value="walkthrough">Walkthrough</option>
                <option value="install">Install</option>
                <option value="payment_received">Payment received</option>
              </select>
              <input name="activity_title" type="text" placeholder="Title" className="field flex-1 min-w-[120px]" />
              <input name="activity_scheduled_date" type="datetime-local" className="field w-full sm:w-auto" />
              <SubmitButton variant="secondary">Add activity</SubmitButton>
            </form>
            <ul className="mt-4 space-y-2">
              {(activities as { id: string; type: string; title: string | null; description: string | null; scheduled_date: string | null; status: string; created_at: string }[]).map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                  <span className="font-medium text-foreground">{a.type.replace(/_/g, " ")}</span>
                  {a.title && <span className="text-muted-foreground">{a.title}</span>}
                  {a.scheduled_date && (
                    <span className="text-muted-foreground">
                      {new Date(a.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  )}
                  <span className="text-muted-foreground">· {a.status}</span>
                </li>
              ))}
              {activities.length === 0 && <li className="text-sm text-muted-foreground">No activities yet.</li>}
            </ul>
          </div>

          {/* Job notes */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Notes</h2>
            <form action={addJobNote} className="mt-3 flex flex-wrap gap-2">
              <select name="note_type" className="field w-full sm:w-auto">
                <option value="internal">Internal</option>
                <option value="customer">Customer</option>
                <option value="installer">Installer</option>
                <option value="sales">Sales</option>
              </select>
              <textarea name="note" placeholder="Add a note..." className="field flex-1 min-w-[200px]" rows={2} required />
              <SubmitButton variant="secondary">Add note</SubmitButton>
            </form>
            <ul className="mt-4 space-y-2">
              {(jobNotes as { id: string; note_type: string; note: string; created_at: string }[]).map((n) => (
                <li key={n.id} className="border-l-2 border-muted pl-3 text-sm">
                  <span className="font-medium text-foreground">{n.note_type}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    {new Date(n.created_at).toLocaleDateString("en-US")}: {n.note}
                  </span>
                </li>
              ))}
              {jobNotes.length === 0 && <li className="text-sm text-muted-foreground">No notes yet.</li>}
            </ul>
          </div>

          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Remove job</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {quote
                ? "Revert turns this back into an estimate only (removes the job, invoice, and schedule). Delete removes the job even if it was not created from a quote."
                : "Permanently delete this job and its invoice, photos, and activities."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {quote ? (
                <form action={revertJobToQuote}>
                  <SubmitButton variant="secondary" pendingLabel="Reverting…">
                    Revert to quote
                  </SubmitButton>
                </form>
              ) : null}
              <form action={deleteJob}>
                <SubmitButton variant="danger" pendingLabel="Deleting…">
                  Delete job
                </SubmitButton>
              </form>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Blocked if any invoice payment has been recorded. Remove payments in Supabase first if you must delete anyway.
            </p>
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
              <SubmitButton variant="secondary">Save notes</SubmitButton>
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
          {(job.status === "scheduled" || job.status === "in_progress" || job.status === "approved") && (
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
              {jobKind === "service"
                ? "Service visit: note parts from truck stock or pull from Door Shop / warehouses as needed."
                : "Installation: pull materials from Door Shop (center), Lower Warehouse, or Upper Warehouse."}
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
                <a
                  href={`/admin/invoices/${invoice.id}/preview`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary inline-flex py-2.5"
                >
                  Preview / print
                </a>
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

      {tab === "billings" && (
        <div className="mt-6 space-y-6">
          {!stripeEnabled && (
            <div className="rounded-xl border border-amber-400/60 bg-amber-100/40 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-900/20 dark:text-amber-100">
              Stripe is not configured yet. Add <code>STRIPE_SECRET_KEY</code> to
              enable pay-link creation.
            </div>
          )}

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold text-foreground">Create payment request</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create an isolated Stripe checkout request, then either send a link
              or open checkout now on this phone.
            </p>
            <form action={createIsolatedPayment} className="mt-4 grid gap-3 sm:grid-cols-3">
              <PaymentTemplateAutofill
                className="sm:col-span-3"
                descriptionInputId="job-billing-description"
                amountInputId="job-billing-amount"
                noteInputId="job-billing-note"
                paymentTypeSelectId="job-billing-payment-template"
                workTypeSelectId="job-billing-work-type"
                defaultJobKind={jobKind}
                defaultJobTitle={job.title}
                defaultBalanceDueCents={invoice?.balance_due_cents ?? null}
              />
              <input
                id="job-billing-description"
                type="text"
                name="description"
                required
                defaultValue={invoice ? `Invoice #${invoice.invoice_number} payment` : `Payment for ${job.title}`}
                placeholder="Description"
                className="field min-h-10 sm:col-span-2"
              />
              <input
                id="job-billing-amount"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                name="amount"
                required
                defaultValue={invoice ? (invoice.balance_due_cents / 100).toFixed(2) : undefined}
                placeholder="Amount (cents)"
                className="field min-h-10"
              />
              <input
                id="job-billing-note"
                type="text"
                name="note"
                placeholder="Optional internal note"
                className="field min-h-10 sm:col-span-2"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="submit"
                  name="collection_mode"
                  value="link"
                  className="btn-primary min-h-10"
                  disabled={!stripeEnabled}
                >
                  Create pay link
                </button>
                <button
                  type="submit"
                  name="collection_mode"
                  value="collect_now"
                  className="btn-secondary min-h-10"
                  disabled={!stripeEnabled}
                >
                  Open checkout now
                </button>
              </div>
            </form>
            {invoice ? (
              <p className="mt-2 text-xs text-muted-foreground">
                This payment link will be tied to invoice{" "}
                <Link href={`/admin/invoices/${invoice.id}`} className="link">
                  #{invoice.invoice_number}
                </Link>{" "}
                and will record a payment when Stripe confirms checkout.
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="border-b border-border bg-muted/50 px-4 py-3">
              <h2 className="text-base font-semibold text-foreground">Payment links</h2>
            </div>
            <div className="space-y-3 p-3 sm:hidden">
              {isolatedPayments.length === 0 ? (
                <p className="rounded-lg border border-border bg-muted/20 px-3 py-5 text-center text-sm text-muted-foreground">
                  No payment links for this job yet.
                </p>
              ) : (
                isolatedPayments.map((payment) => {
                  const paymentCustomer = firstOf(payment.customers) ?? customer;
                  const phoneRaw = paymentCustomer?.phone ?? "";
                  const phone = phoneRaw ? normalizePhone(phoneRaw) : "";
                  const email = paymentCustomer?.email?.trim() ?? "";
                  const amount = formatCents(payment.amount_cents);
                  const payLink = payment.stripe_checkout_url ?? "";
                  const smsBody = encodeURIComponent(`Payment link for ${amount}: ${payLink}`);
                  const mailSubject = encodeURIComponent(`Payment link: ${payment.description}`);
                  const mailBody = encodeURIComponent(
                    `Hi,\n\nHere is your payment link for ${amount}.\n${payLink}\n\nThank you.`,
                  );

                  return (
                    <article key={payment.id} className="rounded-lg border border-border bg-muted/20 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{payment.description}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {new Date(payment.created_at).toLocaleString()}
                          </p>
                        </div>
                        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
                          {payment.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium tabular-nums text-foreground">{amount}</p>
                      {payment.note ? (
                        <p className="mt-1 text-xs text-muted-foreground">{payment.note}</p>
                      ) : null}
                      {payLink ? (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <a
                            href={payLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary py-2 text-center text-xs"
                          >
                            Open
                          </a>
                          <CopyToClipboardButton
                            value={payLink}
                            className="w-full py-2"
                            label="Copy"
                            copiedLabel="Copied"
                          />
                          {phone ? (
                            <a
                              href={`sms:${phone}?body=${smsBody}`}
                              className="btn-secondary py-2 text-center text-xs"
                            >
                              Text
                            </a>
                          ) : null}
                          {email ? (
                            <a
                              href={`mailto:${encodeURIComponent(email)}?subject=${mailSubject}&body=${mailBody}`}
                              className="btn-secondary py-2 text-center text-xs"
                            >
                              Email
                            </a>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">No checkout link</p>
                      )}
                    </article>
                  );
                })
              )}
            </div>
            <div className="table-wrap hidden overflow-x-auto sm:block">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="table-header py-3 pl-5 pr-4">Created</th>
                    <th className="table-header py-3 pr-4">Description</th>
                    <th className="table-header py-3 pr-4">Amount</th>
                    <th className="table-header py-3 pr-4">Status</th>
                    <th className="table-header py-3 pr-5">Send</th>
                  </tr>
                </thead>
                <tbody>
                  {isolatedPayments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        No payment links for this job yet.
                      </td>
                    </tr>
                  ) : (
                    isolatedPayments.map((payment) => {
                      const paymentCustomer = firstOf(payment.customers) ?? customer;
                      const phoneRaw = paymentCustomer?.phone ?? "";
                      const phone = phoneRaw ? normalizePhone(phoneRaw) : "";
                      const email = paymentCustomer?.email?.trim() ?? "";
                      const amount = formatCents(payment.amount_cents);
                      const payLink = payment.stripe_checkout_url ?? "";
                      const smsBody = encodeURIComponent(`Payment link for ${amount}: ${payLink}`);
                      const mailSubject = encodeURIComponent(`Payment link: ${payment.description}`);
                      const mailBody = encodeURIComponent(
                        `Hi,\n\nHere is your payment link for ${amount}.\n${payLink}\n\nThank you.`,
                      );

                      return (
                        <tr key={payment.id} className="border-b border-border">
                          <td className="py-3 pl-5 pr-4 text-muted-foreground">
                            {new Date(payment.created_at).toLocaleString()}
                          </td>
                          <td className="py-3 pr-4">
                            <p className="font-medium text-foreground">{payment.description}</p>
                            {payment.note ? (
                              <p className="text-xs text-muted-foreground">{payment.note}</p>
                            ) : null}
                          </td>
                          <td className="py-3 pr-4 tabular-nums">{amount}</td>
                          <td className="py-3 pr-4">
                            <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
                              {payment.status}
                            </span>
                          </td>
                          <td className="py-3 pr-5">
                            {payLink ? (
                              <div className="flex flex-wrap gap-2">
                                <a
                                  href={payLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-secondary py-1.5 text-xs"
                                >
                                  Open
                                </a>
                                <CopyToClipboardButton value={payLink} />
                                {phone ? (
                                  <a
                                    href={`sms:${phone}?body=${smsBody}`}
                                    className="btn-secondary py-1.5 text-xs"
                                  >
                                    Text
                                  </a>
                                ) : null}
                                {email ? (
                                  <a
                                    href={`mailto:${encodeURIComponent(email)}?subject=${mailSubject}&body=${mailBody}`}
                                    className="btn-secondary py-1.5 text-xs"
                                  >
                                    Email
                                  </a>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">No checkout link</span>
                            )}
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

      <JobStickyActions
        phone={customerPhone}
        mapsUrl={mapsUrl}
        jobStatus={job.status}
        onMarkComplete={markComplete}
      />
    </div>
  );
}
