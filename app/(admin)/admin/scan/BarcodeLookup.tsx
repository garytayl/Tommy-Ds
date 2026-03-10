"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useEffect } from "react";

type BarcodeLookupProps = { initialValue?: string };

export function BarcodeLookup({ initialValue = "" }: BarcodeLookupProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const q = (form.elements.namedItem("q") as HTMLInputElement | null)?.value?.trim();
    if (q) {
      router.push(`/admin/scan?q=${encodeURIComponent(q)}`);
    }
  }

  const q = searchParams.get("q") ?? initialValue;

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <label htmlFor="barcode-q" className="block text-sm font-medium text-foreground">
        Barcode
      </label>
      <div className="mt-2 flex gap-2">
        <input
          ref={inputRef}
          id="barcode-q"
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Scan or type barcode"
          className="field flex-1"
          autoComplete="off"
        />
        <button type="submit" className="btn-primary">
          Look up
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Use a barcode scanner or type the code. Matches lots and materials.
      </p>
    </form>
  );
}
