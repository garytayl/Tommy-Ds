import { buildDesignFlexProjectXml } from "@/lib/design-flex-project-xml";
import {
  buildQuoteExportXml,
  quoteExportFilename,
  type QuoteExportPayload,
} from "@/lib/quote-export-xml";
import { getOfficeSessionOrNull } from "@/lib/server-action-guards";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const format = new URL(request.url).searchParams.get("format");
  const session = await getOfficeSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { supabase } = session;
  const [quoteResult, itemsResult] = await Promise.all([
    supabase
      .from("quotes")
      .select(
        "id,title,address_line1,address_line2,city,state,zip,status,workflow_stage,subtotal_cents,tax_cents,total_cents,notes,job_id,created_at,deposit_received,customers(id,name,phone,email,address_line1,address_line2,city,state,zip)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("quote_items")
      .select("description,qty,unit_price_cents,line_total_cents,sort_order")
      .eq("quote_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const quote = quoteResult.data;
  if (!quote) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const customer = Array.isArray(quote.customers) ? quote.customers[0] : quote.customers;
  const items = itemsResult.data ?? [];

  const payload: QuoteExportPayload = {
    id: quote.id,
    title: quote.title,
    status: quote.status,
    workflow_stage: quote.workflow_stage ?? "estimate",
    created_at: quote.created_at,
    job_id: quote.job_id,
    address_line1: quote.address_line1,
    address_line2: quote.address_line2,
    city: quote.city,
    state: quote.state,
    zip: quote.zip,
    subtotal_cents: quote.subtotal_cents,
    tax_cents: quote.tax_cents,
    total_cents: quote.total_cents,
    notes: quote.notes,
    deposit_received: (quote as { deposit_received?: boolean }).deposit_received,
    customer: customer
      ? {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address_line1: customer.address_line1,
          address_line2: customer.address_line2,
          city: customer.city,
          state: customer.state,
          zip: customer.zip,
        }
      : null,
    items: items.map((i) => ({
      description: i.description,
      qty: Number(i.qty),
      unit_price_cents: i.unit_price_cents,
      line_total_cents: i.line_total_cents,
      sort_order: i.sort_order,
    })),
  };

  const xml =
    format === "tommyds" ? buildQuoteExportXml(payload) : buildDesignFlexProjectXml(payload);
  const filename = quoteExportFilename(quote.title, quote.id);

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
