import { centsToDollars } from "@/lib/money";

export type QuoteExportCustomer = {
  id?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

export type QuoteExportLine = {
  description: string;
  qty: number;
  unit_price_cents: number;
  line_total_cents: number;
  sort_order?: number | null;
};

export type QuoteExportPayload = {
  id: string;
  title: string;
  status: string;
  workflow_stage: string;
  created_at: string;
  job_id: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  notes: string | null;
  deposit_received?: boolean | null;
  customer: QuoteExportCustomer | null;
  items: QuoteExportLine[];
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function el(name: string, value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return `  <${name}/>`;
  }
  const s = typeof value === "number" ? String(value) : escapeXml(value);
  return `  <${name}>${s}</${name}>`;
}

/**
 * UTF-8 XML for third-party import (e.g. Ponderosa / Eclipse tooling).
 * Schema is app-defined; adjust element names if your importer expects a fixed format.
 */
export function buildQuoteExportXml(payload: QuoteExportPayload): string {
  const c = payload.customer;
  const lines = payload.items.map((item, index) => {
    const unit = centsToDollars(item.unit_price_cents);
    const line = centsToDollars(item.line_total_cents);
    return [
      "    <LineItem>",
      `      <LineNumber>${index + 1}</LineNumber>`,
      el("Description", item.description),
      el("Quantity", item.qty),
      el("UnitPriceCents", item.unit_price_cents),
      el("UnitPrice", unit.toFixed(2)),
      el("LineTotalCents", item.line_total_cents),
      el("LineTotal", line.toFixed(2)),
      item.sort_order != null ? el("SortOrder", item.sort_order) : "      <SortOrder/>",
      "    </LineItem>",
    ].join("\n");
  });

  const notesBlock =
    payload.notes != null && payload.notes.trim() !== ""
      ? `  <Notes><![CDATA[${payload.notes.replace(/]]>/g, "]]]]><![CDATA[>")}]]></Notes>`
      : "  <Notes/>";

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<TommyDsQuoteExport version="1" source="Tommy-Ds">`,
    `  <Quote>`,
    el("Id", payload.id),
    el("Title", payload.title),
    el("Status", payload.status),
    el("WorkflowStage", payload.workflow_stage),
    el("CreatedAt", payload.created_at),
    payload.job_id != null ? el("JobId", payload.job_id) : "  <JobId/>",
    el("SubtotalCents", payload.subtotal_cents),
    el("TaxCents", payload.tax_cents),
    el("TotalCents", payload.total_cents),
    el("Subtotal", centsToDollars(payload.subtotal_cents).toFixed(2)),
    el("Tax", centsToDollars(payload.tax_cents).toFixed(2)),
    el("Total", centsToDollars(payload.total_cents).toFixed(2)),
    payload.deposit_received != null ? el("DepositReceived", payload.deposit_received ? "true" : "false") : "  <DepositReceived/>",
    `  </Quote>`,
    `  <JobSite>`,
    el("AddressLine1", payload.address_line1),
    el("AddressLine2", payload.address_line2),
    el("City", payload.city),
    el("State", payload.state),
    el("Zip", payload.zip),
    `  </JobSite>`,
    `  <Customer>`,
    c ? el("Id", c.id ?? null) : "    <Id/>",
    c ? el("Name", c.name) : "    <Name/>",
    c ? el("Phone", c.phone) : "    <Phone/>",
    c ? el("Email", c.email) : "    <Email/>",
    `    <BillingAddress>`,
    c ? el("AddressLine1", c.address_line1) : "      <AddressLine1/>",
    c ? el("AddressLine2", c.address_line2) : "      <AddressLine2/>",
    c ? el("City", c.city) : "      <City/>",
    c ? el("State", c.state) : "      <State/>",
    c ? el("Zip", c.zip) : "      <Zip/>",
    `    </BillingAddress>`,
    `  </Customer>`,
    `  <LineItems>`,
    lines.join("\n"),
    `  </LineItems>`,
    notesBlock,
    `</TommyDsQuoteExport>`,
  ].join("\n");
}

/** Shared stem for download filenames (quote / estimate exports). */
export function quoteExportBaseName(title: string, id: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const shortId = id.replace(/-/g, "").slice(0, 8);
  return slug ? `quote-${slug}-${shortId}` : `quote-${shortId}`;
}

export function quoteExportFilename(title: string, id: string): string {
  return `${quoteExportBaseName(title, id)}.xml`;
}

export function quoteExportTxtFilename(title: string, id: string): string {
  return `${quoteExportBaseName(title, id)}.txt`;
}
