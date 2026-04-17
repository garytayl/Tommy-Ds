"use client";

import { LayoutGrid, PackageSearch, MapPin, ArrowLeft, LogIn, Sparkles, History } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { YardRow } from "@/components/warehouse/warehouse-yard-types";
import { WarehouseYardInventory } from "@/components/warehouse/WarehouseYardInventory";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Devotions-inspired panels: dark field, light label, rounded-xl */
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

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function YardHomePulse({
  recent,
  busy,
  loading,
  onJumpToSlot,
}: {
  recent: YardRow[];
  busy: { slot: string; count: number }[];
  loading: boolean;
  onJumpToSlot: (slot: string) => void;
}) {
  if (loading && recent.length === 0 && busy.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-white/45">
        Loading yard activity…
      </div>
    );
  }
  if (recent.length === 0 && busy.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/50">
        No placements logged yet. When the team starts placing stock, recent activity and busy slots will show here.
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-4">
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-200/80">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Latest
        </div>
        <ul className="space-y-2">
          {recent.slice(0, 6).map((row) => (
            <li key={row.id} className="flex items-start justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-white/90">{row.customer_name}</span>
              <button
                type="button"
                onClick={() => onJumpToSlot(row.slot_code)}
                className="shrink-0 font-mono text-xs font-semibold text-amber-200/95 underline-offset-2 hover:underline"
              >
                {row.slot_code}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-amber-500/10 to-transparent p-4">
        <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-200/75">
          <History className="h-3.5 w-3.5" aria-hidden />
          Busiest slots
        </div>
        <p className="mb-2 text-[11px] leading-relaxed text-white/45">By number of log entries (all time, capped sample).</p>
        <ul className="space-y-2">
          {busy.map(({ slot, count }) => (
            <li key={slot} className="flex items-center justify-between gap-2 text-sm">
              <button
                type="button"
                onClick={() => onJumpToSlot(slot)}
                className="font-mono font-semibold text-white/90 underline-offset-2 hover:underline"
              >
                {slot}
              </button>
              <span className="text-xs tabular-nums text-white/45">{count} logs</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SlotTimeline({
  rows,
  loading,
  currentSlot,
}: {
  rows: YardRow[];
  loading: boolean;
  currentSlot: string;
}) {
  if (!currentSlot.trim()) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
        <History className="h-3.5 w-3.5" aria-hidden />
        At {currentSlot.trim().toUpperCase()}
      </div>
      {loading ? (
        <p className="text-xs text-white/45">Loading history…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-white/50">No prior entries for this slot yet—first placement here.</p>
      ) : (
        <ul className="max-h-48 space-y-2 overflow-y-auto text-sm [-webkit-overflow-scrolling:touch]">
          {rows.map((row) => (
            <li key={row.id} className="border-b border-white/5 pb-2 last:border-0 last:pb-0">
              <p className="font-medium text-white/90">{row.customer_name}</p>
              {row.note ? <p className="mt-0.5 text-xs text-white/45">{row.note}</p> : null}
              <p className="mt-1 text-[10px] text-white/35">{formatWhen(row.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function YardInner({ initialSlot }: { initialSlot?: string | null }) {
  const slotFromQr = initialSlot?.trim() ?? "";

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  const [mode, setMode] = useState<"home" | "find" | "place" | "inventory">("home");

  const [findQ, setFindQ] = useState("");
  const [findResults, setFindResults] = useState<YardRow[]>([]);
  const [findLoading, setFindLoading] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);

  const [placeName, setPlaceName] = useState("");
  const [placeSlot, setPlaceSlot] = useState(slotFromQr);
  const [placeNote, setPlaceNote] = useState("");
  const [placeSaving, setPlaceSaving] = useState(false);
  const [placeMsg, setPlaceMsg] = useState<string | null>(null);

  const [slotHistory, setSlotHistory] = useState<YardRow[]>([]);
  const [slotHistoryLoading, setSlotHistoryLoading] = useState(false);

  const [otherSlots, setOtherSlots] = useState<string[]>([]);

  const [pulseRecent, setPulseRecent] = useState<YardRow[]>([]);
  const [pulseBusy, setPulseBusy] = useState<{ slot: string; count: number }[]>([]);
  const [pulseLoading, setPulseLoading] = useState(false);

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

  const loadHomePulse = useCallback(async () => {
    setPulseLoading(true);
    const recentQ = supabase
      .from("warehouse_yard_placements")
      .select("id,customer_name,slot_code,note,created_at")
      .order("created_at", { ascending: false })
      .limit(8);
    const sampleQ = supabase.from("warehouse_yard_placements").select("slot_code").limit(800);
    const [{ data: recent, error: e1 }, { data: sample, error: e2 }] = await Promise.all([recentQ, sampleQ]);
    setPulseLoading(false);
    if (!e1 && recent) setPulseRecent(recent as YardRow[]);
    if (e2 || !sample) {
      setPulseBusy([]);
      return;
    }
    const counts: Record<string, number> = {};
    for (const r of sample) {
      const k = String((r as { slot_code: string }).slot_code).trim().toUpperCase();
      if (!k) continue;
      counts[k] = (counts[k] ?? 0) + 1;
    }
    const busy = Object.entries(counts)
      .map(([slot, count]) => ({ slot, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    setPulseBusy(busy);
  }, [supabase]);

  useEffect(() => {
    if (mode !== "home") return;
    void loadHomePulse();
  }, [mode, loadHomePulse]);

  const jumpToSlotFind = useCallback((slot: string) => {
    setFindQ(slot);
    setMode("find");
  }, []);

  const findSearchHint = useMemo(() => {
    const q = findQ.trim();
    if (q.length < 2) {
      return {
        text: "Type at least 2 characters. We search customer/job names and slot codes together.",
        accent: "muted" as const,
      };
    }
    const onlySlotChars = /^[ABCabc]\d{0,2}$/.test(q);
    const looksLikeNameFirst = /^[a-z]/i.test(q) && !/^[ABC]\d/i.test(q);
    if (onlySlotChars) {
      return {
        text: "Rack-style input — matching slot codes and any name that contains this text.",
        accent: "amber" as const,
      };
    }
    if (looksLikeNameFirst) {
      return {
        text: "Name-style input — matching names and slot codes that contain this text.",
        accent: "sky" as const,
      };
    }
    return {
      text: "Searching both fields: whoever the stock is for and where it sits.",
      accent: "neutral" as const,
    };
  }, [findQ]);

  const runFind = useCallback(async () => {
    const raw = findQ.trim().replace(/[%_]/g, "");
    if (raw.length < 2) {
      setFindResults([]);
      setFindError(null);
      return;
    }
    setFindLoading(true);
    setFindError(null);
    const pattern = `%${raw}%`;
    const sel = "id,customer_name,slot_code,note,created_at";
    const [byName, bySlot] = await Promise.all([
      supabase.from("warehouse_yard_placements").select(sel).ilike("customer_name", pattern).order("created_at", { ascending: false }).limit(40),
      supabase.from("warehouse_yard_placements").select(sel).ilike("slot_code", pattern).order("created_at", { ascending: false }).limit(40),
    ]);
    setFindLoading(false);
    const err = byName.error ?? bySlot.error;
    if (err) {
      setFindError(err.message);
      setFindResults([]);
      return;
    }
    const merged = new Map<string, YardRow>();
    for (const row of [...(byName.data ?? []), ...(bySlot.data ?? [])]) {
      merged.set((row as YardRow).id, row as YardRow);
    }
    const list = Array.from(merged.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    setFindResults(list.slice(0, 40));
  }, [findQ, supabase]);

  useEffect(() => {
    const t = setTimeout(() => void runFind(), 320);
    return () => clearTimeout(t);
  }, [findQ, runFind]);

  useEffect(() => {
    const slot = placeSlot.trim();
    if (mode !== "place" || slot.length < 2) {
      setSlotHistory([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      void (async () => {
        const safeSlot = slot.replace(/[%_]/g, "");
        setSlotHistoryLoading(true);
        const { data, error } = await supabase
          .from("warehouse_yard_placements")
          .select("id,customer_name,slot_code,note,created_at")
          .ilike("slot_code", safeSlot)
          .order("created_at", { ascending: false })
          .limit(12);
        if (cancelled) return;
        setSlotHistoryLoading(false);
        if (error) {
          setSlotHistory([]);
          return;
        }
        const rows = (data ?? []) as YardRow[];
        const norm = safeSlot.toUpperCase();
        setSlotHistory(rows.filter((r) => r.slot_code.trim().toUpperCase() === norm));
      })();
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [placeSlot, mode, supabase]);

  useEffect(() => {
    const name = placeName.trim();
    if (mode !== "place" || name.length < 2) {
      setOtherSlots([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      void (async () => {
        const pattern = `%${name.replace(/%/g, "")}%`;
        const { data } = await supabase
          .from("warehouse_yard_placements")
          .select("slot_code,customer_name")
          .ilike("customer_name", pattern)
          .order("created_at", { ascending: false })
          .limit(40);
        if (cancelled) return;
        const here = placeSlot.trim().toUpperCase();
        const seen = new Set<string>();
        const out: string[] = [];
        for (const r of data ?? []) {
          const s = String((r as { slot_code: string }).slot_code).trim().toUpperCase();
          if (!s || s === here) continue;
          if (seen.has(s)) continue;
          seen.add(s);
          out.push(s);
          if (out.length >= 5) break;
        }
        setOtherSlots(out);
      })();
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [placeName, placeSlot, mode, supabase]);

  async function submitPlace() {
    const name = placeName.trim();
    const slot = placeSlot.trim();
    if (!name || !slot) {
      setPlaceMsg("Enter both a name and a slot.");
      return;
    }
    if (!sessionEmail) {
      setPlaceMsg("Sign in to save placements.");
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
    void loadHomePulse();
    const norm = slot.toUpperCase();
    const { data: hist } = await supabase
      .from("warehouse_yard_placements")
      .select("id,customer_name,slot_code,note,created_at")
      .ilike("slot_code", slot)
      .order("created_at", { ascending: false })
      .limit(12);
    if (hist) {
      setSlotHistory((hist as YardRow[]).filter((r) => r.slot_code.trim().toUpperCase() === norm));
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#050508] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-4 sm:px-8 sm:pt-6 md:px-12">
      <div
        className={cn(
          "mx-auto flex w-full flex-1 flex-col",
          mode === "inventory" ? "max-w-6xl" : "max-w-2xl",
        )}
      >
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
          <div className="flex flex-1 flex-col justify-center gap-8 py-4 md:gap-10 md:py-8">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">Yard</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Warehouse yard</h1>
              <p className="mt-3 max-w-xl font-sans text-base font-light leading-relaxed text-white/70 sm:text-[1.05rem]">
                Find stock, open the <span className="text-white/85">full inventory map</span>, or log a placement with a
                zone QR or typed code. Yard labels only—not synced to other systems.
              </p>
            </div>

            <div className="grid max-w-xl gap-4">
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
                    Search the log by customer/job name or by rack slot (e.g. A4).
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
                    Scan a zone QR or type the slot, then enter who it belongs to.
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode("inventory")}
                className="flex w-full items-start gap-4 rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.12] to-transparent p-5 text-left transition hover:border-violet-400/35 hover:from-violet-500/[0.18]"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/25 text-violet-100">
                  <LayoutGrid className="h-6 w-6" aria-hidden />
                </span>
                <span>
                  <span className="block font-sans text-lg font-medium text-white">Full inventory map</span>
                  <span className="mt-1 block text-sm font-light text-white/65">
                    Sleek atlas of all 26 rack cells—who is where, plus a live activity tape.
                  </span>
                </span>
              </button>
            </div>

            <YardHomePulse
              recent={pulseRecent}
              busy={pulseBusy}
              loading={pulseLoading}
              onJumpToSlot={jumpToSlotFind}
            />
          </div>
        ) : null}

        {mode === "find" ? (
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-4 [-webkit-overflow-scrolling:touch]">
            <h2 className="text-xl font-semibold text-white">Find an item</h2>

            <div>
              <FieldLabel htmlFor="yard-find">Search</FieldLabel>
              <input
                id="yard-find"
                type="search"
                value={findQ}
                onChange={(e) => setFindQ(e.target.value)}
                placeholder="Name, job, or slot (e.g. Johnson, B4, A10)…"
                autoComplete="off"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-sans text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-white/30"
              />
              <p
                className={cn(
                  "mt-2 text-xs leading-relaxed transition-colors",
                  findSearchHint.accent === "muted" && "text-white/40",
                  findSearchHint.accent === "amber" && "text-amber-200/80",
                  findSearchHint.accent === "sky" && "text-sky-200/85",
                  findSearchHint.accent === "neutral" && "text-white/50",
                )}
              >
                {findSearchHint.text}
              </p>
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
                    Slot:{" "}
                    <button
                      type="button"
                      onClick={() => jumpToSlotFind(row.slot_code)}
                      className="font-mono font-semibold text-amber-200/95 underline-offset-2 hover:underline"
                    >
                      {row.slot_code}
                    </button>
                  </p>
                  {row.note ? <p className="mt-1 text-white/55">{row.note}</p> : null}
                  <p className="mt-2 text-[11px] text-white/40">{new Date(row.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {mode === "inventory" ? (
          <WarehouseYardInventory onChooseSlot={(slot) => jumpToSlotFind(slot)} />
        ) : null}

        {mode === "place" ? (
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-4 [-webkit-overflow-scrolling:touch]">
            <h2 className="text-xl font-semibold text-white">Place an item</h2>
            {slotFromQr ? (
              <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95">
                Slot from QR or link: <span className="font-mono font-semibold">{slotFromQr}</span>
              </p>
            ) : (
              <p className="text-sm text-white/60">
                Scan a <span className="text-white/80">zone QR</span> on the rack, or type the slot (e.g.{" "}
                <span className="font-mono text-white/85">C2</span>).
              </p>
            )}

            <div>
              <FieldLabel htmlFor="yard-slot">Slot / zone code</FieldLabel>
              <input
                id="yard-slot"
                type="text"
                value={placeSlot}
                onChange={(e) => setPlaceSlot(e.target.value)}
                placeholder="e.g. A10"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-white/30"
              />
            </div>

            <SlotTimeline
              rows={slotHistory}
              loading={slotHistoryLoading}
              currentSlot={placeSlot}
            />

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
              {otherSlots.length > 0 ? (
                <p className="mt-2 text-xs leading-relaxed text-sky-200/85">
                  Same name also appears at{" "}
                  {otherSlots.map((s, i) => (
                    <span key={s}>
                      {i > 0 ? ", " : ""}
                      <button
                        type="button"
                        className="font-mono font-semibold underline-offset-2 hover:underline"
                        onClick={() => {
                          setPlaceSlot(s);
                          setPlaceMsg(`Slot set to ${s}.`);
                        }}
                      >
                        {s}
                      </button>
                    </span>
                  ))}
                  —tap to switch slot.
                </p>
              ) : null}
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
              <p
                className={`text-sm ${placeMsg.startsWith("Saved") ? "text-emerald-300/95" : "text-amber-200/90"}`}
                role="status"
              >
                {placeMsg}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function WarehouseYardClient({ initialSlot }: { initialSlot?: string | null }) {
  return <YardInner initialSlot={initialSlot} />;
}
