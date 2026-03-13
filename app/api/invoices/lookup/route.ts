import { NextResponse } from "next/server";

import { createSupabaseServerClientForData } from "@/lib/supabase/server";

/**
 * Public invoice lookup for the "pay your invoice" page.
 * GET ?id= or ?number= — full UUID or short prefix (e.g. first 8 chars).
 * Returns minimal safe fields for display and to call checkout/create.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const idOrNumber = searchParams.get("id") ?? searchParams.get("number");
    const raw = (idOrNumber ?? "").trim();
    const input = raw.replace(/-/g, "");
    if (!input) {
      return NextResponse.json(
        { error: "Invoice number or ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClientForData();

    // Full UUID: 32 hex chars (no dashes). Re-insert dashes for DB eq().
    const isFullId = input.length >= 32 && /^[0-9a-fA-F]+$/.test(input);
    const fullUuid =
      isFullId && input.length === 32
        ? `${input.slice(0, 8)}-${input.slice(8, 12)}-${input.slice(12, 16)}-${input.slice(16, 20)}-${input.slice(20, 32)}`
        : null;

    type InvoiceRow = { id: string; job_id: string; balance_due_cents: number; status: string };
    let invoiceResult: { data: InvoiceRow | null };

    if (fullUuid) {
      invoiceResult = await supabase
        .from("invoices")
        .select("id,job_id,balance_due_cents,status")
        .eq("id", fullUuid)
        .maybeSingle();
    } else {
      // Short code: filter in memory (Supabase may not support LIKE on uuid). Fetch recent and match prefix.
      const { data: rows } = await supabase
        .from("invoices")
        .select("id,job_id,balance_due_cents,status")
        .order("created_at", { ascending: false })
        .limit(500);
      const list = (rows ?? []).filter(
        (r: InvoiceRow) => r.id.replace(/-/g, "").startsWith(input)
      );
      if (list.length === 0) {
        invoiceResult = { data: null };
      } else if (list.length > 1) {
        return NextResponse.json(
          { error: "Multiple invoices match; use more characters" },
          { status: 400 }
        );
      } else {
        invoiceResult = { data: list[0] };
      }
    }

    const invoice = invoiceResult.data;
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.balance_due_cents <= 0) {
      return NextResponse.json({
        invoiceId: invoice.id,
        balanceDueCents: 0,
        alreadyPaid: true,
        customerName: null,
      });
    }

    // Optional: customer name for display (from job -> customers)
    const { data: jobRow } = await supabase
      .from("jobs")
      .select("customers(name)")
      .eq("id", invoice.job_id)
      .single();
    const cust = (jobRow as { customers?: { name: string } | { name: string }[] } | null)?.customers;
    const customerName =
      cust == null ? null : Array.isArray(cust) ? cust[0]?.name ?? null : cust.name ?? null;

    return NextResponse.json({
      invoiceId: invoice.id,
      balanceDueCents: invoice.balance_due_cents,
      alreadyPaid: false,
      customerName,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
