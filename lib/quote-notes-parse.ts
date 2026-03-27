/**
 * Parses countertop-style estimate notes with ALL-CAPS section headers and blank-line blocks.
 * Used to render quote detail with structured layout; unknown shapes fall back to plain text.
 */

export type QuoteNoteBlock =
  | { kind: "hero"; title: string; bodyLines: string[] }
  | { kind: "section"; title: string; bodyLines: string[] }
  | { kind: "plaintext"; text: string };

function classifySectionTitle(line: string): "hero" | "section" | null {
  const t = line.trim();
  if (/^COUNTERTOP ESTIMATE/i.test(t)) return "hero";
  if (/^CUSTOMER INFORMATION$/i.test(t)) return "section";
  if (/^PROJECT DETAILS$/i.test(t)) return "section";
  if (/^PRICING\b/i.test(t)) return "section";
  if (/^KEY TERMS/i.test(t)) return "section";
  if (/^SCOPE NOTES$/i.test(t)) return "section";
  return null;
}

export function parseStructuredQuoteNotes(notes: string): QuoteNoteBlock[] | null {
  const rawBlocks = notes
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (rawBlocks.length === 0) return null;

  const out: QuoteNoteBlock[] = [];

  for (const raw of rawBlocks) {
    const lines = raw.split("\n").map((l) => l.trimEnd());
    const first = lines[0]?.trim() ?? "";
    const kind = classifySectionTitle(first);
    if (kind === "hero") {
      out.push({ kind: "hero", title: first, bodyLines: lines.slice(1) });
    } else if (kind === "section") {
      out.push({ kind: "section", title: first, bodyLines: lines.slice(1) });
    } else {
      out.push({ kind: "plaintext", text: raw });
    }
  }

  const hasStructure = out.some((b) => b.kind === "hero" || b.kind === "section");
  if (!hasStructure) return null;
  return out;
}
