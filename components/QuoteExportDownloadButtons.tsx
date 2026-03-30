"use client";

import { useCallback, useState } from "react";

function filenameFromContentDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      /* ignore */
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted) return quoted[1];
  const bare = /filename=([^;]+)/i.exec(header);
  if (bare) return bare[1].trim().replace(/^["']|["']$/g, "");
  return fallback;
}

type Props = {
  quoteId: string;
};

export function QuoteExportDownloadButtons({ quoteId }: Props) {
  const [busy, setBusy] = useState<"xml" | "txt" | null>(null);

  const download = useCallback(
    async (path: string, fallbackName: string, kind: "xml" | "txt") => {
      setBusy(kind);
      try {
        const res = await fetch(path, { credentials: "same-origin" });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(errText || `${res.status} ${res.statusText}`);
        }
        const blob = await res.blob();
        const name = filenameFromContentDisposition(res.headers.get("Content-Disposition"), fallbackName);
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = name;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
      } catch (e) {
        console.error(e);
        window.open(path, "_blank", "noopener,noreferrer");
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const base = `/admin/quotes/${quoteId}/export`;

  return (
    <>
      <button
        type="button"
        className="btn-secondary whitespace-nowrap"
        disabled={busy !== null}
        title="Design Flex Project XML (Project.xsd) for Eclipse / Ponderosa. Append ?format=tommyds for simple XML."
        onClick={() => download(base, "quote.xml", "xml")}
      >
        {busy === "xml" ? "…" : "XML"}
      </button>
      <button
        type="button"
        className="btn-secondary whitespace-nowrap"
        disabled={busy !== null}
        title="Plain-text estimate/quote (tab-separated lines) for Ponderosa or drop-folder workflows."
        onClick={() => download(`${base}?format=txt`, "quote.txt", "txt")}
      >
        {busy === "txt" ? "…" : "TXT"}
      </button>
    </>
  );
}
