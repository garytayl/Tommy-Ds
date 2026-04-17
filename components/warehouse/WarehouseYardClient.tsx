"use client";

import { PackageSearch, MapPin, ArrowLeft, LogIn } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type YardRow = {
  id: string;
  customer_name: string;
  slot_code: string;
  note: string | null;
  created_at: string;
};

/** Devotions-inspired panels: dark field, light label, rounded-xl (see fxtranscriptor devotions-client JournalPanel). */
function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block font-sans text-sm font-light text-white/80"
    >
      {children}
    </label>
  );
}

function YardInner() {
  const searchParams = useSearchParams();
  const slotFromQr = searchParams.get("slot")?.trim() ?? "";

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  const [mode, setMode] = useState<"home" | "find" | "place">("home");

  const [findQ, setFindQ] = useState("");
  const [findResults, setFindResults] = useState<YardRow[]>([]);
  const [findLoading, setFindLoading] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);

  const [placeName, setPlaceName] = useState("");
  const [placeSlot, setPlaceSlot] = useState(slotFromQr);
  const [placeNote, setPlaceNote] = useState("");
  const [placeSaving, setPlaceSaving] = useState(false);
  const [placeMsg, setPlaceMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionEmail(session?.user?.email ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setSessionEmail(session?.user?.email ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (slotFromQr) setMode("place");
  }, [slotFromQr]);

  useEffect(() => {
    setPlaceSlot(slotFromQr);
  }, [slotFromQr]);

  const runFind = useCallback(async () => {
    const q = findQ.trim().replace(/[%_]/g, "");
    if (q.length < 2) {
      setFindResults([]);
      setFindError(null);
      return;
    }
    setFindLoading(true);
    setFindError(null);
    const pattern = `%${q}%`;
    const { data, error } = await supabase
      .from("warehouse_yard_placements")
      .select("id,customer_name,slot_code,note,created_at")
      .ilike("customer_name", pattern)
      .order("created_at", { ascending: false })
      .limit(40);
    setFindLoading(false);
    if (error) {
      setFindError(error.message);
      setFindResults([]);
      return;
    }
    setFindResults((data ?? []) as YardRow[]);
  }, [findQ, supabase]);

  useEffect(() => {
    const t = setTimeout(() => void runFind(), 320);
    return () => clearTimeout(t);
  }, [findQ, runFind]);

  async function submitPlace() {
    const name = placeName.trim();
    const slot = placeSlot.trim();
    if (!name || !slot) {
      setPlaceMsg("Enter both a name and a slot.");
      return;
    }
    if (!sessionEmail) {
      setPlaceMsg("Sign in to save a placement.");
      return;
    }
    setPlaceSaving(true);
    setPlaceMsg(null);
    const { error } = await supabase.from("warehouse_yard_placements").insert({
      customer_name: name,
      slot_code: slot,
      note: placeNote.trim() || null,
    });
    setPlaceSaving(false);
    if (error) {
      setPlaceMsg(error.message);
      return;
    }
    setPlaceMsg("Saved. Stock is logged at this slot.");
    setPlaceName("");
    setPlaceNote("");
  }

  return (
    <div className="min-h-[min(80dvh,900px)] bg-[#050508] px-4 pb-20 pt-8 md:px-10">
      <div className="mx-auto max-w-lg">
        {mode !== "home" ? (
          <button
            type="button"
            onClick={() => setMode("home")}
            className="mb-6 inline-flex items-center gap-2 font-sans text-sm text-white/60 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back
          </button>
        ) : null}

        {mode === "home" ? (
          <div className="space-y-8">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">Yard</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">Warehouse</h2>
              <p className="mt-2 font-sans text-sm font-light leading-relaxed text-white/70">
                Find where something is stored, or log where you put it. Names are labels for this yard only—not synced
                to other systems.
              </p>
            </div>

            <div className="grid gap-4">
              <button
                type="button"
                onClick={() => setMode("find")}
                className="flex w-full items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-white/20 hover:bg-white/[0.07]"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                  <PackageSearch className="h-6 w-6" aria-hidden />
                </span>
                <span>
                  <span className="block font-sans text-lg font-medium text-white">Find an item</span>
                  <span className="mt-1 block text-sm font-light text-white/65">
                    Search by customer or job name on file in the yard log.
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode("place")}
                className="flex w-full items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-white/20 hover:bg-white/[0.07]"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-200">
                  <MapPin className="h-6 w-6" aria-hidden />
                </span>
                <span>
                  <span className="block font-sans text-lg font-medium text-white">Place an item</span>
                  <span className="mt-1 block text-sm font-light text-white/65">
                    Scan a zone QR (or enter a slot code), then type who it belongs to.
                  </span>
                </span>
              </button>
            </div>
          </div>
        ) : null}

        {mode === "find" ? (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Find an item</h2>
            <div>
              <FieldLabel htmlFor="yard-find">Customer or job name</FieldLabel>
              <input
                id="yard-find"
                type="search"
                value={findQ}
                onChange={(e) => setFindQ(e.target.value)}
                placeholder="Start typing…"
                autoComplete="off"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-sans text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-white/30"
              />
            </div>
            {findLoading ? <p className="text-sm text-white/50">Searching…</p> : null}
            {findError ? (
              <p className="text-sm text-red-300" role="alert">
                {findError}
              </p>
            ) : null}
            {!findLoading && findQ.trim().length >= 2 && findResults.length === 0 && !findError ? (
              <p className="text-sm text-white/55">No matches in the yard log yet.</p>
            ) : null}
            <ul className="space-y-3">
              {findResults.map((row) => (
                <li
                  key={row.id}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 font-sans text-sm text-white/90"
                >
                  <p className="font-medium text-white">{row.customer_name}</p>
                  <p className="mt-1 text-white/70">
                    Slot: <span className="text-amber-200/95">{row.slot_code}</span>
                  </p>
                  {row.note ? <p className="mt-1 text-white/55">{row.note}</p> : null}
                  <p className="mt-2 text-[11px] text-white/40">
                    {new Date(row.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {mode === "place" ? (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Place an item</h2>
            {slotFromQr ? (
              <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95">
                Zone from QR: <span className="font-mono font-semibold">{slotFromQr}</span>
              </p>
            ) : (
              <p className="text-sm text-white/60">
                Scan a QR that points here with <span className="font-mono text-white/85">?slot=YOUR-ZONE</span>, or type
                the slot code below.
              </p>
            )}
            <div>
              <FieldLabel htmlFor="yard-slot">Slot / zone code</FieldLabel>
              <input
                id="yard-slot"
                type="text"
                value={placeSlot}
                onChange={(e) => setPlaceSlot(e.target.value)}
                placeholder="e.g. BAY-2-N"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-white/30"
              />
            </div>
            <div>
              <FieldLabel htmlFor="yard-name">Customer or job name</FieldLabel>
              <input
                id="yard-name"
                type="text"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="Who this stock is for"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-sans text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-white/30"
              />
            </div>
            <div>
              <FieldLabel htmlFor="yard-note">Note (optional)</FieldLabel>
              <textarea
                id="yard-note"
                value={placeNote}
                onChange={(e) => setPlaceNote(e.target.value)}
                placeholder="Door size, PO, anything helpful"
                rows={3}
                className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-sans text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-white/30"
              />
            </div>

            {!sessionEmail ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/80">
                <LogIn className="h-4 w-4 shrink-0 text-white/60" aria-hidden />
                <span>Sign in to save placements.</span>
                <Link
                  href="/auth/login?next=/warehouse"
                  className="font-medium text-amber-200 underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </div>
            ) : (
              <p className="text-[11px] text-white/45">Signed in as {sessionEmail}</p>
            )}

            <button
              type="button"
              onClick={() => void submitPlace()}
              disabled={placeSaving || !sessionEmail}
              className="w-full rounded-xl border border-white/15 bg-white/10 py-3 font-sans text-sm font-medium text-white transition hover:bg-white/15 disabled:opacity-40"
            >
              {placeSaving ? "Saving…" : "Save placement"}
            </button>
            {placeMsg ? (
              <p className={`text-sm ${placeMsg.startsWith("Saved") ? "text-emerald-300/95" : "text-amber-200/90"}`} role="status">
                {placeMsg}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function WarehouseYardClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40dvh] items-center justify-center bg-[#050508] font-sans text-sm text-white/50">
          Loading…
        </div>
      }
    >
      <YardInner />
    </Suspense>
  );
}
