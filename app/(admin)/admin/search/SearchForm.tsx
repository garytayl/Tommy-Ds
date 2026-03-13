"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useEffect } from "react";

type SearchFormProps = { initialValue?: string };

export function SearchForm({ initialValue = "" }: SearchFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const q = searchParams.get("q") ?? initialValue;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const value = (form.elements.namedItem("q") as HTMLInputElement | null)?.value?.trim() ?? "";
    if (value) {
      router.push(`/admin/search?q=${encodeURIComponent(value)}`);
    } else {
      router.push("/admin/search");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/20 bg-white/5 p-4 shadow-sm backdrop-blur-sm"
    >
      <label htmlFor="search-q" className="sr-only">
        Search customers, jobs, or addresses
      </label>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          id="search-q"
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Customer name, job title, address, city, zip…"
          className="w-full rounded-lg border border-white/20 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          autoComplete="off"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Search
        </button>
      </div>
    </form>
  );
}
