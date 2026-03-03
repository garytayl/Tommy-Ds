import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { CollectPaymentButton } from "@/components/CollectPaymentButton";
import { InvoiceSummary } from "@/components/InvoiceSummary";
import { JobStatusBadge } from "@/components/JobStatusBadge";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type JobPhotoWithUrl = {
  id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  signed_url: string | null;
};

export default async function InstallerJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [jobResult, invoiceResult, photosResult] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id,title,status,notes,address_line1,address_line2,city,state,zip,scheduled_start,assigned_installer_id",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("invoices")
      .select(
        "id,job_id,status,subtotal_cents,tax_cents,total_cents,deposit_paid_cents,balance_due_cents",
      )
      .eq("job_id", id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("job_photos")
      .select("id,storage_path,caption,created_at")
      .eq("job_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const job = jobResult.data;
  const invoice = invoiceResult.data;
  const photos = photosResult.data ?? [];

  if (!job) {
    notFound();
  }

  async function updateFieldNotes(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();
    const notes = String(formData.get("notes") ?? "").trim();
    await supabase
      .from("jobs")
      .update({ notes: notes || null })
      .eq("id", id);

    revalidatePath(`/m/jobs/${id}`);
  }

  async function markComplete() {
    "use server";

    const supabase = await createSupabaseServerClient();
    await supabase
      .from("jobs")
      .update({ status: "completed" })
      .eq("id", id);

    revalidatePath(`/m/jobs/${id}`);
    revalidatePath("/m");
    revalidatePath(`/admin/jobs/${id}`);
  }

  async function uploadPhoto(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();
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

    if (uploadError) {
      return;
    }

    await supabase.from("job_photos").insert({
      job_id: id,
      uploader_id: null,
      storage_path: storagePath,
      caption: caption || null,
    });

    revalidatePath(`/m/jobs/${id}`);
  }

  let photosWithUrls: JobPhotoWithUrl[] = photos.map((photo) => ({
    ...photo,
    signed_url: null,
  }));

  try {
    const serviceClient = createSupabaseServiceClient();
    photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        const { data } = await serviceClient.storage
          .from("job-photos")
          .createSignedUrl(photo.storage_path, 60 * 30);
        return {
          ...photo,
          signed_url: data?.signedUrl ?? null,
        };
      }),
    );
  } catch {
    // Keep page functional even if service role env vars are missing.
  }

  const mapQuery = encodeURIComponent(
    `${job.address_line1}, ${job.city}, ${job.state} ${job.zip}`,
  );

  return (
    <div className="space-y-6">
      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold" style={{ color: "var(--foreground)" }}>{job.title}</h1>
          <JobStatusBadge status={job.status} />
        </div>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {job.address_line1}
          {job.address_line2 ? `, ${job.address_line2}` : ""}
          {`, ${job.city}, ${job.state} ${job.zip}`}
        </p>
        <a
          href={`https://maps.google.com/?q=${mapQuery}`}
          target="_blank"
          rel="noreferrer"
          className="link mt-2 inline-block text-sm"
        >
          Open in Maps
        </a>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <InvoiceSummary invoice={invoice} />
        <div className="card p-5">
          <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Collect Payment</h3>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            Sends customer to Stripe hosted checkout.
          </p>
          {invoice ? (
            <div className="mt-3">
              <CollectPaymentButton
                invoiceId={invoice.id}
                disabled={invoice.balance_due_cents <= 0}
              />
            </div>
          ) : (
            <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>No invoice available.</p>
          )}
        </div>
      </section>

      <section className="card p-5">
        <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Field Notes</h3>
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
      </section>

      <section className="card p-5">
        <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Upload Photos</h3>
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
            placeholder="Caption (optional)"
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
              className="rounded-xl border bg-white p-3 text-sm shadow-sm transition hover:shadow"
              style={{ borderColor: "var(--border)" }}
            >
              <p className="font-medium" style={{ color: "var(--foreground)" }}>{photo.caption ?? "Job photo"}</p>
              <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{photo.storage_path}</p>
            </a>
          ))}
          {photosWithUrls.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>No photos uploaded yet.</p>
          ) : null}
        </div>
      </section>

      <form action={markComplete}>
        <button type="submit" className="btn-primary w-full py-3 text-base">
          Mark Job Complete
        </button>
      </form>
    </div>
  );
}
