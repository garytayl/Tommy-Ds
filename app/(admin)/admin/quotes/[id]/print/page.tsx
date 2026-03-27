import { notFound } from "next/navigation";

import { QuoteNotesDisplay, quoteNotesSectionTitle } from "@/components/QuoteNotesDisplay";
import { mergeQuoteForPrint, parsePrintOverrides, stripRedundantSectionsForPrint } from "@/lib/quote-print-overrides";
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
      .select(
        "id,title,address_line1,address_line2,city,state,zip,subtotal_cents,tax_cents,total_cents,notes,created_at,workflow_stage,print_overrides,customers(name,phone,email)",
      )
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
  const overrides = parsePrintOverrides((quote as { print_overrides?: unknown }).print_overrides);

  const merged = mergeQuoteForPrint({
    quote: {
      title: quote.title,
      address_line1: quote.address_line1,
      address_line2: quote.address_line2,
      city: quote.city,
      state: quote.state,
      zip: quote.zip,
      subtotal_cents: quote.subtotal_cents,
      tax_cents: quote.tax_cents,
      total_cents: quote.total_cents,
      notes: quote.notes,
      created_at: quote.created_at,
    },
    customer: customer
      ? { name: customer.name, phone: customer.phone, email: customer.email }
      : null,
    items: items.map((i) => ({
      description: i.description,
      qty: Number(i.qty),
      unit_price_cents: i.unit_price_cents,
      line_total_cents: i.line_total_cents,
    })),
    docLabelFromStage: workflowStageLabel(stage),
    overrides,
  });

  const docRef = String(quote.id).replace(/-/g, "").slice(0, 12).toUpperCase();
  const notesForPrint = stripRedundantSectionsForPrint(merged.notes);

  const footerBody = (
    <>
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em]" style={{ color: BRAND }}>
        Tommy D&apos;s · Windows, Doors &amp; More
      </p>
      <p className="mx-auto mt-2 max-w-md text-xs leading-snug text-zinc-500 print:mt-2">
        Thank you for your business. Figures are subject to final field verification. Scheduling and final
        invoicing are handled separately unless otherwise agreed.
      </p>
    </>
  );

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page { size: letter; margin: 0.425in; }
            @media print {
              .quote-print-notes-block { break-inside: auto; }
              .quote-print-site-footer {
                margin-top: 0.55rem;
                padding-top: 0.55rem;
                break-inside: avoid;
                page-break-inside: avoid;
              }
            }
          `,
        }}
      />
      <div className="min-h-screen bg-[#faf8f5] text-zinc-900 antialiased print:min-h-0 print:bg-white">
        <article className="mx-auto max-w-[48rem] px-5 py-8 print:max-w-none print:px-0 print:py-0 sm:px-8 sm:py-10">
          <div className="quote-print-page1 flex flex-col gap-8 print:gap-8">
          <header
            className="flex flex-col gap-6 border-b-2 pb-8 print:gap-4 print:pb-5 sm:flex-row sm:items-start sm:justify-between sm:pb-10"
            style={{ borderColor: BRAND }}
          >
            <div className="min-w-0 flex-1">
              <p
                className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] sm:text-[0.75rem]"
                style={{ color: BRAND }}
              >
                {merged.docLabel}
              </p>
              <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-zinc-900 print:mt-3.5 print:text-xl sm:text-[1.75rem]">
                {merged.title}
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-zinc-600 print:mt-3 print:text-xs">
                <span className="font-semibold text-zinc-800">Prepared </span>
                {merged.preparedDateText}
              </p>
              <p className="mt-1.5 font-mono text-[11px] text-zinc-400 print:mt-2">Reference {docRef}</p>
            </div>
            <div className="flex shrink-0 items-start justify-end">
              {/* eslint-disable-next-line @next/next/no-img-element -- print/PDF engines handle <img> more reliably than next/image */}
              <img
                src="/images/tommyds-logo.png"
                alt="Tommy D's Windows, Doors & More"
                className="h-16 max-w-[200px] object-contain object-right print:h-12 print:max-w-[180px] sm:h-[4.5rem] sm:max-w-[220px]"
              />
            </div>
          </header>

          <div className="grid gap-5 print:gap-5 sm:grid-cols-2 sm:gap-6">
            <section
              className="rounded-xl border border-zinc-200/80 p-5 shadow-sm print:border-zinc-300 print:p-5 print:shadow-none"
              style={{ backgroundColor: BRAND_SOFT }}
            >
              <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500 print:mb-1">
                Customer
              </h2>
              <p className="mt-3 text-base font-semibold text-zinc-900 print:mt-4">{merged.customerName}</p>
              {merged.customerPhone && (
                <p className="mt-1.5 text-sm text-zinc-700 print:mt-2">
                  <span className="text-zinc-500">Phone </span>
                  {merged.customerPhone}
                </p>
              )}
              {merged.customerEmail && (
                <p className="mt-1 text-sm text-zinc-700 print:mt-2">
                  <span className="text-zinc-500">Email </span>
                  {merged.customerEmail}
                </p>
              )}
            </section>
            <section className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm print:border-zinc-300 print:p-5 print:shadow-none">
              <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500 print:mb-1">
                Project address
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-800 print:mt-4">{merged.projectAddress}</p>
            </section>
          </div>

          {!merged.hideLineItems && (
            <section className="flex flex-col gap-4 print:gap-4">
              <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500 print:mb-0.5">
                Pricing
              </h2>
              <div className="flex flex-col gap-3 print:gap-3">
              <div className="overflow-hidden rounded-xl border border-zinc-200 print:border-zinc-300">
                <table className="w-full border-collapse text-sm print:text-xs">
                  <thead>
                    <tr className="bg-zinc-100 text-left text-zinc-700 print:bg-zinc-100">
                      <th className="px-4 py-3 text-[0.65rem] font-bold uppercase tracking-wider print:px-3 print:py-2.5">
                        Description
                      </th>
                      <th className="w-16 px-2 py-3 text-right text-[0.65rem] font-bold uppercase tracking-wider print:py-2.5">
                        Qty
                      </th>
                      <th className="w-28 px-2 py-3 text-right text-[0.65rem] font-bold uppercase tracking-wider print:py-2.5">
                        Unit
                      </th>
                      <th className="w-28 px-4 py-3 text-right text-[0.65rem] font-bold uppercase tracking-wider print:px-3 print:py-2.5">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {merged.items.map((item, i) => (
                      <tr key={i} className="border-t border-zinc-100 bg-white">
                        <td className="px-4 py-3.5 align-top leading-snug text-zinc-800 print:px-3 print:py-[9px]">
                          {item.description}
                        </td>
                        <td className="px-2 py-3.5 text-right tabular-nums text-zinc-700 print:py-[9px]">{item.qty}</td>
                        <td className="px-2 py-3.5 text-right tabular-nums text-zinc-700 print:py-[9px]">
                          {formatCents(item.unit_price_cents)}
                        </td>
                        <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-zinc-900 print:px-3 print:py-[9px]">
                          {formatCents(item.line_total_cents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end print:break-inside-avoid">
                <div
                  className="w-full max-w-xs space-y-2 rounded-xl border border-zinc-200 border-t-4 bg-white px-6 py-4 text-sm print:border-zinc-300 print:px-5 print:py-3.5"
                  style={{ borderTopColor: BRAND }}
                >
                  <div className="flex justify-between text-zinc-600">
                    <span>Subtotal</span>
                    <span className="tabular-nums text-zinc-900">{formatCents(merged.subtotal_cents)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600">
                    <span>Sales tax</span>
                    <span className="tabular-nums text-zinc-900">{formatCents(merged.tax_cents)}</span>
                  </div>
                  <div
                    className="flex justify-between border-t border-zinc-200 pt-3 text-lg font-bold text-zinc-900 print:pt-3"
                    style={{ borderColor: `${BRAND}33` }}
                  >
                    <span>Total</span>
                    <span className="tabular-nums">{formatCents(merged.total_cents)}</span>
                  </div>
                </div>
              </div>
              </div>
            </section>
          )}

          {merged.footerNote && (
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-center text-sm text-zinc-700 print:py-3.5 print:break-inside-avoid">
              {merged.footerNote}
            </p>
          )}
          </div>

          {notesForPrint && (
            <section className="quote-print-notes-block mt-10 print:mt-0 print:break-before-page print:pt-2 print:break-inside-auto">
              <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-zinc-500 print:mb-0.5">
                {quoteNotesSectionTitle(notesForPrint)}
              </h2>
              <div className="mt-3 print:mt-2.5">
                <QuoteNotesDisplay notes={notesForPrint} variant="print" />
              </div>
              <footer className="quote-print-site-footer mt-6 border-t border-zinc-200 pt-4 text-center print:mt-3.5">
                {footerBody}
              </footer>
            </section>
          )}

          {!notesForPrint && (
            <footer className="mt-14 border-t border-zinc-200 pt-8 text-center print:mt-12 print:pt-5 print:break-inside-avoid">
              {footerBody}
            </footer>
          )}
        </article>
      </div>
    </>
  );
}
