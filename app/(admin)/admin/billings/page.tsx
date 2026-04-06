import Link from "next/link";
import { revalidatePath } from "next/cache";

import { CopyToClipboardButton } from "@/components/CopyToClipboardButton";
import { PaymentTemplateAutofill } from "@/components/PaymentTemplateAutofill";
import { formatCents, dollarsToCents } from "@/lib/money";
import { getAppUrl, getStripeServerClient, isStripeConfigured } from "@/lib/stripe";
import { getOfficeSessionOrNull, UNAUTHORIZED_TOAST } from "@/lib/server-action-guards";
import { setToastCookie } from "@/lib/toast";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export default async function BillingsPage() {
  const supabase = await createSupabaseServerClient();
  const [paymentsResult, invoicesResult, jobsResult] = await Promise.all([
    supabase
      .from("isolated_payments")
      .select(
        "id,created_at,amount_cents,description,note,status,stripe_checkout_url,job_id,invoice_id,customers(name,email,phone),jobs(id,title),invoices(invoice_number)",
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("invoices")
      .select(
        "id,invoice_number,balance_due_cents,jobs(id,title,job_kind,customers(name))",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("jobs")
      .select("id,title,job_kind,customers(name)")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  type CustomerLite = { name: string | null; email: string | null; phone: string | null };
  type JobLite = {
    id: string;
    title: string | null;
    job_kind: "installation" | "service";
    customers: { name: string | null } | { name: string | null }[] | null;
  };
  type InvoiceLite = {
    id: string;
    invoice_number: number;
    balance_due_cents: number;
    jobs: JobLite | JobLite[] | null;
  };
  type PaymentRow = {
    id: string;
    created_at: string;
    amount_cents: number;
    description: string;
    note: string | null;
    status: string;
    stripe_checkout_url: string | null;
    job_id: string | null;
    invoice_id: string | null;
    customers: CustomerLite | CustomerLite[] | null;
    jobs: { id: string; title: string | null } | { id: string; title: string | null }[] | null;
    invoices: { invoice_number: number | null } | { invoice_number: number | null }[] | null;
  };

  const payments = (paymentsResult.data ?? []) as PaymentRow[];
  const invoiceOptions = (invoicesResult.data ?? []) as InvoiceLite[];
  const jobOptions = (jobsResult.data ?? []) as JobLite[];
  const stripeEnabled = isStripeConfigured();

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

    const { supabase, profile } = session;

    const amountCents = dollarsToCents(String(formData.get("amount") ?? "0"));
    const description = String(formData.get("description") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim() || null;
    const invoiceId = String(formData.get("invoice_id") ?? "").trim() || null;
    const submittedJobId = String(formData.get("job_id") ?? "").trim() || null;

    if (!description || amountCents <= 0) {
      await setToastCookie("Enter a description and amount greater than $0.");
      return;
    }

    let resolvedJobId = submittedJobId;
    let resolvedCustomerId: string | null = null;
    let customerEmail: string | null = null;

    if (invoiceId) {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("id,job_id")
        .eq("id", invoiceId)
        .maybeSingle();
      if (!invoice) {
        await setToastCookie("Selected invoice was not found.");
        return;
      }
      resolvedJobId = resolvedJobId ?? invoice.job_id ?? null;
    }

    if (resolvedJobId) {
      const { data: job } = await supabase
        .from("jobs")
        .select("id,customer_id,customers(email)")
        .eq("id", resolvedJobId)
        .maybeSingle();
      if (!job) {
        await setToastCookie("Selected job was not found.");
        return;
      }
      resolvedCustomerId = job.customer_id ?? null;
      const customer = firstOf(job.customers as { email: string | null } | { email: string | null }[] | null);
      customerEmail = customer?.email ?? null;
    }

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
        invoice_id: invoiceId ?? "",
        job_id: resolvedJobId ?? "",
      },
    });

    await supabase.from("isolated_payments").insert({
      amount_cents: amountCents,
      description,
      note,
      status: "open",
      invoice_id: invoiceId,
      job_id: resolvedJobId,
      customer_id: resolvedCustomerId,
      stripe_checkout_session_id: stripeSession.id,
      stripe_checkout_url: stripeSession.url,
      created_by: profile.user_id,
    });

    await setToastCookie("Payment link created");
    revalidatePath("/admin/billings");
    if (resolvedJobId) revalidatePath(`/jobs/${resolvedJobId}`);
    if (invoiceId) revalidatePath(`/admin/invoices/${invoiceId}`);
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Admin
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Billings</h1>
        <p className="text-sm text-muted-foreground">
          Create isolated Stripe payment links and send them to customers.
        </p>
      </header>

      {!stripeEnabled && (
        <div className="rounded-xl border border-amber-400/60 bg-amber-100/40 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-900/20 dark:text-amber-100">
          Stripe is not configured yet. Add <code>STRIPE_SECRET_KEY</code> to
          environment variables to enable payment-link creation.
        </div>
      )}

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold text-foreground">New isolated payment</h2>
        <form action={createIsolatedPayment} className="mt-4 grid gap-3 sm:grid-cols-2">
          <PaymentTemplateAutofill
            className="sm:col-span-2"
            descriptionInputId="admin-billing-description"
            amountInputId="admin-billing-amount"
            noteInputId="admin-billing-note"
            paymentTypeSelectId="admin-billing-payment-template"
            workTypeSelectId="admin-billing-work-type"
            defaultJobTitle="General payment"
            defaultBalanceDueCents={null}
            jobSelectId="admin-billing-job-id"
            invoiceSelectId="admin-billing-invoice-id"
          />
          <input
            id="admin-billing-description"
            type="text"
            name="description"
            required
            placeholder="What is this payment for?"
            className="field sm:col-span-2"
          />
          <input
            id="admin-billing-amount"
            type="number"
            name="amount"
            required
            min="0.50"
            step="0.01"
            placeholder="Amount ($)"
            className="field"
          />
          <input
            id="admin-billing-note"
            type="text"
            name="note"
            placeholder="Optional internal note"
            className="field"
          />
          <select id="admin-billing-invoice-id" name="invoice_id" className="field">
            <option value="">No invoice linked</option>
            {invoiceOptions.map((invoice) => {
              const job = firstOf(invoice.jobs);
              const customer = firstOf(job?.customers);
              return (
                <option
                  key={invoice.id}
                  value={invoice.id}
                  data-job-title={job?.title ?? ""}
                  data-job-kind={job?.job_kind ?? ""}
                  data-balance-due-cents={invoice.balance_due_cents}
                >
                  Invoice #{invoice.invoice_number} — {customer?.name ?? "Unknown customer"} —{" "}
                  {formatCents(invoice.balance_due_cents)} due
                </option>
              );
            })}
          </select>
          <select id="admin-billing-job-id" name="job_id" className="field">
            <option value="">No job linked</option>
            {jobOptions.map((job) => {
              const customer = firstOf(job.customers);
              return (
                <option
                  key={job.id}
                  value={job.id}
                  data-job-title={job.title ?? ""}
                  data-job-kind={job.job_kind}
                >
                  {job.title ?? "Untitled job"} — {customer?.name ?? "Unknown customer"}
                </option>
              );
            })}
          </select>
          <button
            type="submit"
            className="btn-primary py-3 sm:col-span-2"
            disabled={!stripeEnabled}
          >
            Create pay link
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="border-b border-border bg-muted/50 px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">Recent pay links</h2>
        </div>
        <div className="space-y-3 p-3 sm:hidden">
          {payments.length === 0 ? (
            <p className="rounded-lg border border-border bg-muted/20 px-3 py-5 text-center text-sm text-muted-foreground">
              No isolated payment links yet.
            </p>
          ) : (
            payments.map((row) => {
              const customer = firstOf(row.customers);
              const phone = customer?.phone ? normalizePhone(customer.phone) : "";
              const email = customer?.email?.trim() ?? "";
              const amount = formatCents(row.amount_cents);
              const payLink = row.stripe_checkout_url ?? "";
              const smsBody = encodeURIComponent(`Payment link for ${amount}: ${payLink}`);
              const mailSubject = encodeURIComponent(`Payment link: ${row.description}`);
              const mailBody = encodeURIComponent(
                `Hi,\n\nHere is your payment link for ${amount}.\n${payLink}\n\nThank you.`,
              );
              const linkedInvoice = firstOf(row.invoices);
              const linkedJob = firstOf(row.jobs);

              return (
                <article key={row.id} className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{row.description}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
                      {row.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium tabular-nums text-foreground">{amount}</p>
                  {row.note ? <p className="mt-1 text-xs text-muted-foreground">{row.note}</p> : null}
                  {customer?.name ? (
                    <p className="mt-1 text-xs text-muted-foreground">Customer: {customer.name}</p>
                  ) : null}
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {row.invoice_id && linkedInvoice?.invoice_number ? (
                      <p>
                        Invoice{" "}
                        <Link href={`/admin/invoices/${row.invoice_id}`} className="link">
                          #{linkedInvoice.invoice_number}
                        </Link>
                      </p>
                    ) : null}
                    {row.job_id ? (
                      <p>
                        Job{" "}
                        <Link href={`/jobs/${row.job_id}`} className="link">
                          {linkedJob?.title ?? row.job_id.slice(0, 8)}
                        </Link>
                      </p>
                    ) : null}
                    {!row.invoice_id && !row.job_id ? <p>Standalone</p> : null}
                  </div>
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
                        <a href={`sms:${phone}?body=${smsBody}`} className="btn-secondary py-2 text-center text-xs">
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
                <th className="table-header py-3 pr-4">Linked</th>
                <th className="table-header py-3 pr-5">Send</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    No isolated payment links yet.
                  </td>
                </tr>
              ) : (
                payments.map((row) => {
                  const customer = firstOf(row.customers);
                  const phone = customer?.phone ? normalizePhone(customer.phone) : "";
                  const email = customer?.email?.trim() ?? "";
                  const amount = formatCents(row.amount_cents);
                  const payLink = row.stripe_checkout_url ?? "";
                  const smsBody = encodeURIComponent(
                    `Payment link for ${amount}: ${payLink}`,
                  );
                  const mailSubject = encodeURIComponent(`Payment link: ${row.description}`);
                  const mailBody = encodeURIComponent(
                    `Hi,\n\nHere is your payment link for ${amount}.\n${payLink}\n\nThank you.`,
                  );
                  const linkedInvoice = firstOf(row.invoices);
                  const linkedJob = firstOf(row.jobs);

                  return (
                    <tr key={row.id} className="border-b border-border align-top">
                      <td className="py-3 pl-5 pr-4 text-muted-foreground">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-foreground">{row.description}</p>
                        {row.note ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">{row.note}</p>
                        ) : null}
                        {customer?.name ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Customer: {customer.name}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 tabular-nums">{amount}</td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        <div className="space-y-1">
                          {row.invoice_id && linkedInvoice?.invoice_number ? (
                            <p>
                              Invoice{" "}
                              <Link
                                href={`/admin/invoices/${row.invoice_id}`}
                                className="link"
                              >
                                #{linkedInvoice.invoice_number}
                              </Link>
                            </p>
                          ) : null}
                          {row.job_id ? (
                            <p>
                              Job{" "}
                              <Link href={`/jobs/${row.job_id}`} className="link">
                                {linkedJob?.title ?? row.job_id.slice(0, 8)}
                              </Link>
                            </p>
                          ) : null}
                          {!row.invoice_id && !row.job_id ? <p>Standalone</p> : null}
                        </div>
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
                              Open link
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
      </section>
    </div>
  );
}
