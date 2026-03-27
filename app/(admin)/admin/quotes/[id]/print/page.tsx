import { notFound } from "next/navigation";

import { formatCents } from "@/lib/money";
import { workflowStageLabel } from "@/lib/quote-workflow";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

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

  return (
    <div className="min-h-screen bg-white p-8 text-black print:p-6">
      <div className="mx-auto max-w-2xl">
        <header className="border-b border-gray-300 pb-4">
          <h1 className="text-2xl font-bold">{docLabel}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {quote.title}
          </p>
          <p className="mt-2 text-sm">
            Date: {new Date(quote.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-6 text-sm">
          <div>
            <h2 className="font-semibold text-gray-700">Customer</h2>
            <p className="mt-1 font-medium">{customer?.name ?? "-"}</p>
            {customer?.phone && <p>{customer.phone}</p>}
            {customer?.email && <p>{customer.email}</p>}
          </div>
          <div>
            <h2 className="font-semibold text-gray-700">Job address</h2>
            <p className="mt-1">{address}</p>
          </div>
        </section>

        <section className="mt-8">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="py-2 text-left font-semibold">Description</th>
                <th className="py-2 text-right font-semibold w-20">Qty</th>
                <th className="py-2 text-right font-semibold w-24">Unit price</th>
                <th className="py-2 text-right font-semibold w-24">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="py-2">{item.description}</td>
                  <td className="py-2 text-right tabular-nums">{item.qty}</td>
                  <td className="py-2 text-right tabular-nums">{formatCents(item.unit_price_cents)}</td>
                  <td className="py-2 text-right tabular-nums font-medium">{formatCents(item.line_total_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex justify-end">
            <div className="text-right text-sm">
              <p>Subtotal: {formatCents(quote.subtotal_cents)}</p>
              <p>Tax: {formatCents(quote.tax_cents)}</p>
              <p className="mt-2 text-lg font-bold">Total: {formatCents(quote.total_cents)}</p>
            </div>
          </div>
        </section>

        {quote.notes && (
          <section className="mt-8 border-t border-gray-200 pt-4 text-sm text-gray-600">
            <h2 className="font-semibold text-gray-700">Notes</h2>
            <p className="mt-1 whitespace-pre-wrap">{quote.notes}</p>
          </section>
        )}

        <footer className="mt-12 border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
          Thank you for your business. This is an estimate; actual job may be scheduled and invoiced separately.
        </footer>
      </div>
    </div>
  );
}
