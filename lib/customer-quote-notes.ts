/**
 * Build the "CUSTOMER INFORMATION" body for estimate PDF sections from a customer row.
 */

export type CustomerForQuoteNotes = {
  name: string;
  phone?: string | null;
  email?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

/** Multiline block: name, address lines, city/state/zip line, phone, email. */
export function formatCustomerInformationForQuoteNotes(c: CustomerForQuoteNotes): string {
  const lines: string[] = [];
  const name = c.name?.trim();
  if (name) lines.push(name);

  const a1 = c.address_line1?.trim();
  const a2 = c.address_line2?.trim();
  if (a1) lines.push(a1);
  if (a2) lines.push(a2);

  const city = c.city?.trim();
  const st = c.state?.trim();
  const zip = c.zip?.trim();
  if (city || st || zip) {
    if (city && st && zip) {
      lines.push(`${city}, ${st} ${zip}`);
    } else if (city && st) {
      lines.push(`${city}, ${st}`);
    } else {
      const rest = [city, st, zip].filter(Boolean).join(" ").trim();
      if (rest) lines.push(rest);
    }
  }

  const phone = c.phone?.trim();
  if (phone) lines.push(phone);
  const email = c.email?.trim();
  if (email) lines.push(email);

  return lines.join("\n");
}
