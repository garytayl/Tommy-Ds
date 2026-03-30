import { centsToDollars } from "@/lib/money";

import type { QuoteExportPayload } from "@/lib/quote-export-xml";

const CRLF = "\r\n";

function escLine(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n/g, " | ");
}

/**
 * Plain-text estimate/quote export for Ponderosa-style drop folders and tooling.
 * Tab-separated line grid; UTF-8. Windows-friendly CRLF line endings.
 */
export function buildPonderosaEstimateTxt(payload: QuoteExportPayload): string {
  const kind = payload.workflow_stage === "quote" ? "QUOTE" : "ESTIMATE";
  const c = payload.customer;
  const job = [
    payload.address_line1,
    payload.address_line2,
    [payload.city, payload.state, payload.zip].filter(Boolean).join(", "),
  ]
    .filter((x) => x != null && String(x).trim() !== "")
    .map((x) => String(x).trim());

  const lines: string[] = [];
  lines.push("TOMMYDS_PONDEROSA_EXPORT");
  lines.push(`VERSION=1`);
  lines.push(`KIND=${kind}`);
  lines.push(`QUOTE_ID=${payload.id}`);
  lines.push(`TITLE=${escLine(payload.title)}`);
  lines.push(`STATUS=${escLine(payload.status)}`);
  lines.push(`CREATED_UTC=${payload.created_at}`);
  if (payload.job_id) lines.push(`JOB_ID=${payload.job_id}`);
  lines.push("");
  lines.push("[CUSTOMER]");
  lines.push(c ? `NAME=${escLine(c.name ?? "")}` : "NAME=");
  lines.push(c ? `PHONE=${escLine(c.phone ?? "")}` : "PHONE=");
  lines.push(c ? `EMAIL=${escLine(c.email ?? "")}` : "EMAIL=");
  if (c) {
    lines.push(`BILL_ADDR1=${escLine(c.address_line1 ?? "")}`);
    lines.push(`BILL_ADDR2=${escLine(c.address_line2 ?? "")}`);
    lines.push(`BILL_CITY=${escLine(c.city ?? "")}`);
    lines.push(`BILL_STATE=${escLine(c.state ?? "")}`);
    lines.push(`BILL_ZIP=${escLine(c.zip ?? "")}`);
  }
  lines.push("");
  lines.push("[JOB_SITE]");
  for (const row of job) lines.push(escLine(row));
  lines.push("");
  lines.push("[LINE_ITEMS]");
  lines.push(["LINE", "QTY", "UNIT_USD", "EXT_USD", "DESCRIPTION"].join("\t"));
  payload.items.forEach((item, i) => {
    const unit = centsToDollars(item.unit_price_cents).toFixed(2);
    const ext = centsToDollars(item.line_total_cents).toFixed(2);
    const desc = escLine(item.description);
    lines.push([String(i + 1), String(item.qty), unit, ext, desc].join("\t"));
  });
  lines.push("");
  lines.push("[TOTALS]");
  lines.push(`SUBTOTAL_USD=${centsToDollars(payload.subtotal_cents).toFixed(2)}`);
  lines.push(`TAX_USD=${centsToDollars(payload.tax_cents).toFixed(2)}`);
  lines.push(`TOTAL_USD=${centsToDollars(payload.total_cents).toFixed(2)}`);
  if (payload.deposit_received != null) {
    lines.push(`DEPOSIT_RECEIVED=${payload.deposit_received ? "Y" : "N"}`);
  }
  lines.push("");
  lines.push("[NOTES]");
  lines.push(payload.notes != null && payload.notes.trim() !== "" ? payload.notes.replace(/\r\n/g, "\n") : "");

  return lines.join(CRLF) + CRLF;
}
