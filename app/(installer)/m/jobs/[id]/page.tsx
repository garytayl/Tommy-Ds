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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="rounded-lg border bg-white p-4 text-sm text-zinc-600">
        Sign in as installer.
      </div>
    );
  }

  const [jobResult, invoiceResult, photosResult] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id,title,status,notes,address_line1,address_line2,city,state,zip,scheduled_start,assigned_installer_id",
      )
      .eq("id", id)
      .eq("assigned_installer_id", user.id)
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const notes = String(formData.get("notes") ?? "").trim();
    await supabase
      .from("jobs")
      .update({ notes: notes || null })
      .eq("id", id)
      .eq("assigned_installer_id", user.id);

    revalidatePath(`/m/jobs/${id}`);
  }

  async function markComplete() {
    "use server";

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("jobs")
      .update({ status: "completed" })
      .eq("id", id)
      .eq("assigned_installer_id", user.id);

    revalidatePath(`/m/jobs/${id}`);
    revalidatePath("/m");
    revalidatePath(`/admin/jobs/${id}`);
  }

  async function uploadPhoto(formData: FormData) {
    "use server";

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: assignedJob } = await supabase
      .from("jobs")
      .select("id")
      .eq("id", id)
      .eq("assigned_installer_id", user.id)
      .maybeSingle();

    if (!assignedJob) return;

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
      uploader_id: user.id,
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
      <section className="rounded-lg border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">{job.title}</h1>
          <JobStatusBadge status={job.status} />
        </div>
        <p className="text-sm text-zinc-600">
          {job.address_line1}
          {job.address_line2 ? `, ${job.address_line2}` : ""}
          {`, ${job.city}, ${job.state} ${job.zip}`}
        </p>
        <a
          href={`https://maps.google.com/?q=${mapQuery}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-sm text-blue-700 hover:underline"
        >
          Open in Maps
        </a>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <InvoiceSummary invoice={invoice} />
        <div className="rounded-lg border bg-white p-4">
          <h3 className="text-sm font-semibold">Collect Payment</h3>
          <p className="mt-1 text-xs text-zinc-600">
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
            <p className="mt-3 text-sm text-zinc-500">No invoice available.</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold">Field Notes</h3>
        <form action={updateFieldNotes} className="mt-3 space-y-3">
          <textarea
            name="notes"
            defaultValue={job.notes ?? ""}
            rows={4}
            className="w-full rounded border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded border px-4 py-2 text-sm font-medium"
          >
            Save notes
          </button>
        </form>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold">Upload Photos</h3>
        <form action={uploadPhoto} className="mt-3 grid gap-2 sm:grid-cols-3">
          <input
            type="file"
            name="photo"
            accept="image/*"
            required
            className="sm:col-span-2 rounded border px-3 py-2 text-sm"
          />
          <input
            type="text"
            name="caption"
            placeholder="Caption (optional)"
            className="rounded border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="sm:col-span-3 rounded border px-4 py-2 text-sm font-medium"
          >
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
              className="rounded border p-3 text-sm"
            >
              <p className="font-medium">{photo.caption ?? "Job photo"}</p>
              <p className="mt-1 text-xs text-zinc-500">{photo.storage_path}</p>
            </a>
          ))}
          {photosWithUrls.length === 0 ? (
            <p className="text-sm text-zinc-500">No photos uploaded yet.</p>
          ) : null}
        </div>
      </section>

      <form action={markComplete}>
        <button
          type="submit"
          className="w-full rounded bg-black px-4 py-3 text-sm font-medium text-white"
        >
          Mark Job Complete
        </button>
      </form>
    </div>
  );
}
