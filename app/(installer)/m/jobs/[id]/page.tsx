import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { JobStatusBadge } from "@/components/JobStatusBadge";
import { SubmitButton } from "@/components/SubmitButton";
import { formatCents } from "@/lib/money";
import { setToastCookie } from "@/lib/toast";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

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

export default async function InstallerJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClientForData();

  const [jobResult, invoiceResult, photosResult] = await Promise.all([
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
  ]);

  const job = jobResult.data as JobRow | null;
  if (!job) notFound();

  const invoice = invoiceResult.data;
  const photos = (photosResult.data ?? []) as PhotoRow[];
  const customer = Array.isArray(job.customers) ? job.customers[0] : job.customers;
  const customerPhone = customer?.phone ?? null;
  const fullAddress = `${job.address_line1}${job.address_line2 ? `, ${job.address_line2}` : ""}, ${job.city}, ${job.state} ${job.zip}`;
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`;
  const balanceDueCents = invoice?.balance_due_cents ?? 0;

  let photosWithUrls: (PhotoRow & { signed_url: string | null })[] = photos.map((p) => ({
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

  async function updateFieldNotes(formData: FormData) {
    "use server";
    const client = await createSupabaseServerClientForData();
    const notes = String(formData.get("notes") ?? "").trim();
    await client.from("jobs").update({ notes: notes || null }).eq("id", id);
    await setToastCookie("Notes saved");
    revalidatePath("/m");
    revalidatePath(`/m/jobs/${id}`);
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
    revalidatePath("/m");
    revalidatePath(`/m/jobs/${id}`);
  }

  async function markComplete() {
    "use server";
    const supabase = await createSupabaseServerClientForData();
    await supabase.from("jobs").update({ status: "installed" }).eq("id", id);
    await setToastCookie("Job marked complete");
    revalidatePath("/m");
    revalidatePath(`/m/jobs/${id}`);
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

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
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

      {(job.status === "scheduled" || job.status === "in_progress" || job.status === "approved") && (
        <form action={markComplete}>
          <SubmitButton className="w-full py-3">Mark job complete</SubmitButton>
        </form>
      )}
    </div>
  );
}
