import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { CopyToClipboardButton } from "@/components/CopyToClipboardButton";
import { JobStatusBadge } from "@/components/JobStatusBadge";
import { SubmitButton } from "@/components/SubmitButton";
import { dollarsToCents, formatCents } from "@/lib/money";
import { getAppUrl, getStripeServerClient, isStripeConfigured } from "@/lib/stripe";
import { getInstallerOrOfficeSessionOrNull, UNAUTHORIZED_TOAST } from "@/lib/server-action-guards";
import { setToastCookie } from "@/lib/toast";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  customers:
    | { id: string; name: string; phone: string | null }
    | { id: string; name: string; phone: string | null }[]
    | null;
};

type PhotoRow = {
  id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
};

type IsolatedPaymentRow = {
  id: string;
  created_at: string;
  amount_cents: number;
  description: string;
  note: string | null;
  status: string;
  stripe_checkout_url: string | null;
};

export default async function InstallerJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [jobResult, invoiceResult, photosResult, isolatedPaymentsResult] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id,title,status,notes,address_line1,address_line2,city,state,zip,scheduled_start,scheduled_end,customers(id,name,phone)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("invoices")
      .select("id,invoice_number,balance_due_cents")
      .eq("job_id", id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("job_photos")
      .select("id,storage_path,caption,created_at")
      .eq("job_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("isolated_payments")
      .select("id,created_at,amount_cents,description,note,status,stripe_checkout_url")
      .eq("job_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const job = jobResult.data as JobRow | null;
  if (!job) notFound();

  const invoice = invoiceResult.data;
  const photos = (photosResult.data ?? []) as PhotoRow[];
  const isolatedPayments = (isolatedPaymentsResult.data ?? []) as IsolatedPaymentRow[];
  const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;
  const customerPhone = customer?.phone ?? null;
  const customerName = customer?.name ?? "Customer";
  const fullAddress = `${job.address_line1}${job.address_line2 ? `, ${job.address_line2}` : ""}, ${job.city}, ${job.state} ${job.zip}`;
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`;
  const balanceDueCents = invoice?.balance_due_cents ?? 0;
  const jobTitle = job.title;
  const stripeEnabled = isStripeConfigured();

  let photosWithUrls: (PhotoRow & { signed_url: string | null })[] = photos.map((p) => ({
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
    // signed URL failed
  }

  async function updateFieldNotes(formData: FormData) {
    "use server";
    const session = await getInstallerOrOfficeSessionOrNull();
    if (!session) {
      await setToastCookie(UNAUTHORIZED_TOAST);
      return;
    }
    const client = session.supabase;
    const notes = String(formData.get("notes") ?? "").trim();
    await client.from("jobs").update({ notes: notes || null }).eq("id", id);
    await setToastCookie("Notes saved");
    revalidatePath("/m");
    revalidatePath(`/m/jobs/${id}`);
  }

  async function uploadPhoto(formData: FormData) {
    "use server";
    const session = await getInstallerOrOfficeSessionOrNull();
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
    revalidatePath("/m");
    revalidatePath(`/m/jobs/${id}`);
  }

  async function markComplete() {
    "use server";
    const session = await getInstallerOrOfficeSessionOrNull();
    if (!session) {
      await setToastCookie(UNAUTHORIZED_TOAST);
      return;
    }
    const { supabase } = session;
    await supabase.from("jobs").update({ status: "installed" }).eq("id", id);
    await setToastCookie("Job marked complete");
    revalidatePath("/m");
    revalidatePath(`/m/jobs/${id}`);
  }

  async function createIsolatedPayment(formData: FormData) {
    "use server";

    const session = await getInstallerOrOfficeSessionOrNull();
    if (!session) {
      await setToastCookie(UNAUTHORIZED_TOAST);
      return;
    }

    if (!isStripeConfigured()) {
      await setToastCookie("Stripe is not configured. Add STRIPE_SECRET_KEY.");
      return;
    }

    const { supabase, profile } = session;
    const amountCents = dollarsToCents(String(formData.get("amount") ?? "0"));
    const descriptionInput = String(formData.get("description") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim() || null;
    const description =
      descriptionInput || `${jobTitle} — payment request`;

    if (amountCents <= 0) {
      await setToastCookie("Enter an amount greater than $0.");
      return;
    }

    const stripe = getStripeServerClient();
    const appUrl = getAppUrl();
    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${appUrl}/pay/success`,
      cancel_url: `${appUrl}/pay/cancel`,
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
        source: "installer_isolated_payment",
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
      customer_id: customer?.id ?? null,
      stripe_checkout_session_id: stripeSession.id,
      stripe_checkout_url: stripeSession.url,
      created_by: profile.user_id,
    });

    await setToastCookie("Payment link created");
    revalidatePath("/m");
    revalidatePath(`/m/jobs/${id}`);
    revalidatePath(`/jobs/${id}`);
    if (invoice?.id) revalidatePath(`/admin/invoices/${invoice.id}`);
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <Link
          href="/m"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← My jobs
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{job.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {customer?.name ?? "Unknown customer"}
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
            <div className="mt-3 flex flex-wrap gap-2">
              {customerPhone && (
                <a
                  href={`tel:${customerPhone.replace(/\D/g, "")}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-95"
                >
                  Call customer
                </a>
              )}
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                Navigate
              </a>
              <a
                href="#billing-section"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                Billing
              </a>
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
      </div>

      <div id="billing-section" className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Notes</h2>
        <form action={updateFieldNotes} className="mt-3 space-y-3">
          <textarea
            name="notes"
            defaultValue={job.notes ?? ""}
            rows={4}
            className="field w-full"
            placeholder="Add or update field notes…"
          />
          <SubmitButton variant="secondary">Save notes</SubmitButton>
        </form>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Photos</h2>
        <form action={uploadPhoto} className="mt-3 grid gap-2 sm:grid-cols-3">
          <input
            type="file"
            name="photo"
            accept="image/*"
            required
            className="field sm:col-span-2"
          />
          <input
            type="text"
            name="caption"
            placeholder="Caption"
            className="field"
          />
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
              className="rounded-xl border border-border bg-muted/20 p-3 text-sm transition hover:shadow"
            >
              <p className="font-medium text-foreground">{photo.caption ?? "Photo"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(photo.created_at).toLocaleString()}
              </p>
            </a>
          ))}
          {photosWithUrls.length === 0 && (
            <p className="text-sm text-muted-foreground">No photos yet.</p>
          )}
        </div>
      </div>

      <div id="billing" className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Billing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a payment link while on site and send it by text.
        </p>
        {!stripeEnabled && (
          <p className="mt-3 rounded-lg border border-amber-400/60 bg-amber-100/40 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-900/20 dark:text-amber-100">
            Stripe is not configured yet.
          </p>
        )}
        <form action={createIsolatedPayment} className="mt-3 grid gap-2 sm:grid-cols-3">
          <input
            type="text"
            name="description"
            placeholder={`${job.title} — payment request`}
            className="field sm:col-span-2"
          />
          <input
            type="number"
            name="amount"
            required
            min="0.50"
            step="0.01"
            placeholder="Amount ($)"
            className="field"
          />
          <input
            type="text"
            name="note"
            placeholder="Optional note"
            className="field sm:col-span-3"
          />
          <button type="submit" className="btn-primary sm:col-span-3" disabled={!stripeEnabled}>
            Create pay link
          </button>
        </form>

        <div className="mt-4 space-y-2">
          {isolatedPayments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment links yet.</p>
          ) : (
            isolatedPayments.map((payment) => {
              const payLink = payment.stripe_checkout_url ?? "";
              const smsBody = encodeURIComponent(
                `Hi ${customerName}, here is your payment link for ${formatCents(payment.amount_cents)}: ${payLink}`,
              );
              const normalizedPhone = customerPhone?.replace(/\D/g, "") ?? "";

              return (
                <div key={payment.id} className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {payment.description} — {formatCents(payment.amount_cents)}
                    </p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                      {payment.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(payment.created_at).toLocaleString()}
                  </p>
                  {payment.note ? (
                    <p className="mt-1 text-xs text-muted-foreground">{payment.note}</p>
                  ) : null}
                  {payLink ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={payLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary py-1.5 text-xs"
                      >
                        Open link
                      </a>
                      <CopyToClipboardButton value={payLink} />
                      {normalizedPhone ? (
                        <a
                          href={`sms:${normalizedPhone}?body=${smsBody}`}
                          className="btn-secondary py-1.5 text-xs"
                        >
                          Text customer
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">No checkout link available.</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {(job.status === "scheduled" || job.status === "in_progress" || job.status === "approved") && (
        <form action={markComplete}>
          <SubmitButton className="w-full py-3">Mark job complete</SubmitButton>
        </form>
      )}
    </div>
  );
}
