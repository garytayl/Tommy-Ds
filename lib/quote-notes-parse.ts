/**
 * Parses countertop-style estimate notes: section headers (ALL CAPS or Title Case),
 * blank-line blocks, and line-by-line splits when a new section starts.
 */

export type QuoteNoteBlock =
  | { kind: "hero"; title: string; bodyLines: string[] }
  | { kind: "section"; title: string; bodyLines: string[] }
  | { kind: "plaintext"; text: string };

export type SectionKind = "hero" | "section";

/** Returns section kind + normalized display title, or null if not a known header line. */
export function classifySectionTitle(line: string): SectionKind | null {
  const t = line.trim();
  if (!t) return null;

  if (/^COUNTERTOP ESTIMATE/i.test(t)) return "hero";
  if (/^QUOTE$/i.test(t)) return "hero";

  if (/^CUSTOMER INFORMATION$/i.test(t)) return "section";
  if (/^CUSTOMER$/i.test(t)) return "section";
  if (/^PROJECT ADDRESS$/i.test(t)) return "section";
  if (/^PROJECT DETAILS$/i.test(t)) return "section";
  if (/^PRICING\b/i.test(t)) return "section";
  if (/^KEY TERMS/i.test(t)) return "section";
  if (/^SCOPE NOTES$/i.test(t)) return "section";
  if (/^DETAILS\s*&\s*NOTES$/i.test(t)) return "section";
  if (/^DETAILS\s+AND\s+NOTES$/i.test(t)) return "section";

  return null;
}

function firstLineOfBlock(block: string): string {
  return block.split("\n")[0]?.trim() ?? "";
}

/** Sub-headings that live inside a DETAILS & NOTES block (single document flow). */
function isNestedSectionInsideDetails(line: string): boolean {
  const t = line.trim();
  if (/^CUSTOMER INFORMATION$/i.test(t)) return true;
  if (/^PROJECT DETAILS$/i.test(t)) return true;
  if (/^PRICING\b/i.test(t)) return true;
  if (/^KEY TERMS/i.test(t)) return true;
  return false;
}

/**
 * Split notes into blocks: a new line that starts a known section begins a new block.
 * Exceptions: COUNTERTOP under DETAILS; subsection headers nested under DETAILS & NOTES.
 */
function splitIntoBlocks(notes: string): string[] {
  const lines = notes.split(/\n/);
  const blocks: string[] = [];
  let current: string[] = [];

  const flush = () => {
    const j = current.join("\n").trim();
    if (j) blocks.push(j);
    current = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (i > 0 && current.length > 0 && trimmed) {
      const kind = classifySectionTitle(trimmed);
      if (kind !== null) {
        const first = firstLineOfBlock(current.join("\n"));
        const isDetails =
          /^DETAILS\s*&\s*NOTES$/i.test(first) || /^DETAILS\s+AND\s+NOTES$/i.test(first);
        const isCountertopHero = /^COUNTERTOP ESTIMATE/i.test(trimmed);
        if (kind === "hero" && isDetails && isCountertopHero) {
          current.push(line);
          continue;
        }
        if (isDetails && isNestedSectionInsideDetails(trimmed)) {
          current.push(line);
          continue;
        }
        flush();
        current.push(line);
        continue;
      }
    }
    current.push(line);
  }
  flush();
  return blocks;
}

export function parseStructuredQuoteNotes(notes: string): QuoteNoteBlock[] | null {
  const rawBlocks = splitIntoBlocks(notes);
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
