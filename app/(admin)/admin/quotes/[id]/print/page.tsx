import { notFound } from "next/navigation";

import { QuoteNotesDisplay, quoteNotesSectionTitle } from "@/components/QuoteNotesDisplay";
import { formatCents } from "@/lib/money";
import { workflowStageLabel } from "@/lib/quote-workflow";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

const BRAND = "#8b2942";
const BRAND_SOFT = "#f4ecef";

export default async function QuotePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClientForData();

  const [quoteResult, itemsResult] = await Promise.all([
    supabase
      .from("quotes")
      .select("id,title,address_line1,address_line2,city,state,zip,subtotal_cents,tax_cents,total_cents,notes,created_at,workflow_stage,customers(name,phone,email)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("quote_items")
      .select("description,qty,unit_price_cents,line_total_cents")
      .eq("quote_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const quote = quoteResult.data;
  const items = itemsResult.data ?? [];

  if (!quote) notFound();

  const customer = Array.isArray(quote.customers) ? quote.customers[0] : quote.customers;
  const stage = (quote as { workflow_stage?: string }).workflow_stage === "quote" ? "quote" : "estimate";
  const docLabel = workflowStageLabel(stage);
  const address2 = quote.address_line2 ? `, ${quote.address_line2}` : "";
  const address = `${quote.address_line1}${address2}, ${quote.city}, ${quote.state} ${quote.zip}`;
  const prepared = new Date(quote.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const docRef = String(quote.id).replace(/-/g, "").slice(0, 12).toUpperCase();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `@page { size: letter; margin: 0.6in; }` }} />
      <div className="min-h-screen bg-[#faf8f5] text-zinc-900 antialiased print:min-h-0 print:bg-white">
        <article className="mx-auto max-w-[48rem] px-5 py-8 print:max-w-none print:px-0 print:py-0 sm:px-8 sm:py-10">
          <header className="flex flex-col gap-6 border-b-2 pb-8 sm:flex-row sm:items-start sm:justify-between sm:pb-10" style={{ borderColor: BRAND }}>
            <div className="min-w-0 flex-1">
              <p
                className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] sm:text-[0.75rem]"
                style={{ color: BRAND }}
              >
                {docLabel}
              </p>
              <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-[1.75rem]">
                {quote.title}
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-zinc-600">
                <span className="font-semibold text-zinc-800">Prepared </span>
                {prepared}
              </p>
              <p className="mt-1.5 font-mono text-[11px] text-zinc-400">Reference {docRef}</p>
            </div>
            <div className="flex shrink-0 items-start justify-end">
              {/* eslint-disable-next-line @next/next/no-img-element -- print/PDF engines handle <img> more reliably than next/image */}
              <img
                src="/images/tommyds-logo.png"
                alt="Tommy D's Windows, Doors & More"
                className="h-16 max-w-[200px] object-contain object-right sm:h-[4.5rem] sm:max-w-[220px]"
              />
            </div>
          </header>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 sm:gap-6">
            <section
              className="rounded-xl border border-zinc-200/80 p-5 shadow-sm print:border-zinc-300 print:shadow-none"
              style={{ backgroundColor: BRAND_SOFT }}
            >
              <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500">Customer</h2>
              <p className="mt-3 text-base font-semibold text-zinc-900">{customer?.name ?? "—"}</p>
              {customer?.phone && (
                <p className="mt-1.5 text-sm text-zinc-700">
                  <span className="text-zinc-500">Phone </span>
                  {customer.phone}
                </p>
              )}
              {customer?.email && (
                <p className="mt-1 text-sm text-zinc-700">
                  <span className="text-zinc-500">Email </span>
                  {customer.email}
                </p>
              )}
            </section>
            <section className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm print:border-zinc-300 print:shadow-none">
              <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500">Project address</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-800">{address}</p>
            </section>
          </div>

          <section className="mt-10">
            <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500">Pricing</h2>
            <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 print:border-zinc-300">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-zinc-100 text-left text-zinc-700 print:bg-zinc-100">
                    <th className="px-4 py-3 text-[0.65rem] font-bold uppercase tracking-wider">Description</th>
                    <th className="w-16 px-2 py-3 text-right text-[0.65rem] font-bold uppercase tracking-wider">Qty</th>
                    <th className="w-28 px-2 py-3 text-right text-[0.65rem] font-bold uppercase tracking-wider">
                      Unit
                    </th>
                    <th className="w-28 px-4 py-3 text-right text-[0.65rem] font-bold uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-t border-zinc-100 bg-white">
                      <td className="px-4 py-3.5 align-top text-zinc-800 leading-snug">{item.description}</td>
                      <td className="px-2 py-3.5 text-right tabular-nums text-zinc-700">{item.qty}</td>
                      <td className="px-2 py-3.5 text-right tabular-nums text-zinc-700">
                        {formatCents(item.unit_price_cents)}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-zinc-900">
                        {formatCents(item.line_total_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end print:break-inside-avoid">
              <div
                className="w-full max-w-xs space-y-2 rounded-xl border border-zinc-200 border-t-4 bg-white px-6 py-4 text-sm print:border-zinc-300"
                style={{ borderTopColor: BRAND }}
              >
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal</span>
                  <span className="tabular-nums text-zinc-900">{formatCents(quote.subtotal_cents)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Sales tax</span>
                  <span className="tabular-nums text-zinc-900">{formatCents(quote.tax_cents)}</span>
                </div>
                <div
                  className="flex justify-between border-t border-zinc-200 pt-3 text-lg font-bold text-zinc-900 print:pt-3"
                  style={{ borderColor: `${BRAND}33` }}
                >
                  <span>Total</span>
                  <span className="tabular-nums">{formatCents(quote.total_cents)}</span>
                </div>
              </div>
            </div>
          </section>

          {quote.notes && (
            <section className="mt-10 print:break-inside-avoid">
              <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500">
                {quoteNotesSectionTitle(quote.notes)}
              </h2>
              <div className="mt-3">
                <QuoteNotesDisplay notes={quote.notes} variant="print" />
              </div>
            </section>
          )}

          <footer className="mt-14 border-t border-zinc-200 pt-8 text-center print:mt-12 print:pt-6">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em]" style={{ color: BRAND }}>
              Tommy D&apos;s · Windows, Doors &amp; More
            </p>
            <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-zinc-500">
              Thank you for your business. Figures are subject to final field verification. Scheduling and final
              invoicing are handled separately unless otherwise agreed.
            </p>
          </footer>
        </article>
      </div>
    </>
  );
}
