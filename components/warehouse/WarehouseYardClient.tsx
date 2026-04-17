"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, LayoutGrid, Loader2, MapPin, PackageSearch, ArrowLeft, LogIn, Sparkles, History } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { YardRow } from "@/components/warehouse/warehouse-yard-types";
import { WarehouseYardBoot } from "@/components/warehouse/WarehouseYardBoot";
import { WarehouseYardInventory } from "@/components/warehouse/WarehouseYardInventory";
import { humanizeDbError, runPostgrestWithRetry } from "@/lib/supabase-retry";
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

/** Focus ring and light glow while typing (focus captured from nested inputs). */
function AnimatedFieldShell({
  children,
  className,
  accent = "amber",
}: {
  children: React.ReactNode;
  className?: string;
  accent?: "amber" | "sky";
}) {
  const [focused, setFocused] = useState(false);
  const reduce = useReducedMotion();
  const ringFocus =
    accent === "sky"
      ? "ring-2 ring-sky-400/40 shadow-[0_0_28px_rgba(56,189,248,0.12)]"
      : "ring-2 ring-amber-400/45 shadow-[0_0_32px_rgba(245,166,35,0.14)]";
  return (
    <motion.div
      className={cn("rounded-xl", className)}
      animate={reduce ? {} : focused ? { scale: 1.008 } : { scale: 1 }}
      transition={{ type: "spring", stiffness: 460, damping: 28 }}
    >
      <div
        className={cn(
          "rounded-xl bg-white/[0.05] transition-shadow duration-200",
          focused ? ringFocus : "ring-1 ring-inset ring-white/10",
        )}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={() => setFocused(false)}
      >
        {children}
      </div>
    </motion.div>
  );
}

function PlacementStepBar({
  slotOk,
  nameOk,
  canSave,
  reduceMotion,
}: {
  slotOk: boolean;
  nameOk: boolean;
  canSave: boolean;
  reduceMotion: boolean | null;
}) {
  const steps = [
    { id: "slot", label: "Slot", ok: slotOk },
    { id: "name", label: "Who", ok: nameOk },
    { id: "go", label: "Ready", ok: canSave },
  ];
  return (
    <div className="flex gap-2 sm:gap-3" aria-hidden>
      {steps.map((s, i) => (
        <div key={s.id} className="flex min-w-0 flex-1 flex-col gap-1.5">
          <motion.div
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-full border px-2 py-1.5 text-[10px] font-mono uppercase tracking-[0.12em] sm:px-3",
              s.ok
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100/95"
                : "border-white/10 bg-white/[0.03] text-white/40",
            )}
            animate={reduceMotion ? {} : s.ok ? { scale: [1, 1.035, 1] } : { scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {s.ok ? (
              <motion.span
                initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="text-emerald-300/95"
              >
                ✓
              </motion.span>
            ) : (
              <span className="tabular-nums text-white/35">{i + 1}</span>
            )}
            <span className="truncate">{s.label}</span>
          </motion.div>
          <div className="h-0.5 overflow-hidden rounded-full bg-white/[0.08]">
            <motion.div
              className={cn("h-full rounded-full", s.ok ? "bg-emerald-400/80" : "bg-amber-400/20")}
              initial={false}
              animate={{ width: s.ok ? "100%" : "0%" }}
              transition={{ duration: reduceMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      ))}
    </div>
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

const placeFieldReveal = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const placeFormStagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.055, delayChildren: 0.04 },
  },
};

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
  reduceMotion,
}: {
  rows: YardRow[];
  loading: boolean;
  currentSlot: string;
  reduceMotion: boolean | null;
}) {
  if (!currentSlot.trim()) return null;
  const label = currentSlot.trim().toUpperCase();
  return (
    <motion.div
      layout
      className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-4"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <motion.div animate={reduceMotion ? {} : { opacity: [0.55, 1, 0.55] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
          <History className="h-3.5 w-3.5 text-amber-200/70" aria-hidden />
        </motion.div>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">At</span>
        <motion.span
          key={label}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 24 }}
          className="font-mono text-sm font-bold tracking-wide text-amber-100/95"
        >
          {label}
        </motion.span>
      </div>
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2"
          >
            <p className="text-xs text-white/45">Pulling prior logs…</p>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 flex-1 rounded-full bg-amber-400/35"
                  animate={reduceMotion ? {} : { opacity: [0.35, 1, 0.35], scaleY: [0.6, 1, 0.6] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.14, ease: "easeInOut" }}
                />
              ))}
            </div>
          </motion.div>
        ) : rows.length === 0 ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs leading-relaxed text-white/50"
          >
            No prior entries for this slot yet—first placement here.
          </motion.p>
        ) : (
          <motion.ul
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-h-48 space-y-2 overflow-y-auto text-sm [-webkit-overflow-scrolling:touch]"
          >
            {rows.map((row, i) => (
              <motion.li
                key={row.id}
                initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: reduceMotion ? 0 : Math.min(i * 0.05, 0.35), duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="border-b border-white/5 pb-2 last:border-0 last:pb-0"
              >
                <p className="font-medium text-white/90">{row.customer_name}</p>
                {row.note ? <p className="mt-0.5 text-xs text-white/45">{row.note}</p> : null}
                <p className="mt-1 text-[10px] text-white/35">{formatWhen(row.created_at)}</p>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.div>
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

  const [bootDone, setBootDone] = useState(false);
  const findReqRef = useRef(0);
  const slotHistSeqRef = useRef(0);
  const otherSlotsSeqRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const maxTimer = globalThis.setTimeout(() => {
      if (!cancelled) setBootDone(true);
    }, 1800);
    void runPostgrestWithRetry(() =>
      supabase.from("warehouse_yard_placements").select("id").limit(1),
    ).then(() => {
      if (cancelled) return;
      globalThis.clearTimeout(maxTimer);
      setBootDone(true);
    });
    return () => {
      cancelled = true;
      globalThis.clearTimeout(maxTimer);
    };
  }, [supabase]);

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
    const [{ data: recent, error: e1 }, { data: sample, error: e2 }] = await Promise.all([
      runPostgrestWithRetry(() =>
        supabase
          .from("warehouse_yard_placements")
          .select("id,customer_name,slot_code,note,created_at")
          .order("created_at", { ascending: false })
          .limit(8),
      ),
      runPostgrestWithRetry(() => supabase.from("warehouse_yard_placements").select("slot_code").limit(800)),
    ]);
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
    const myReq = ++findReqRef.current;
    const raw = findQ.trim().replace(/[%_]/g, "");
    if (raw.length < 2) {
      setFindResults([]);
      setFindError(null);
      setFindLoading(false);
      return;
    }
    setFindLoading(true);
    setFindError(null);
    const pattern = `%${raw}%`;
    const sel = "id,customer_name,slot_code,note,created_at";
    const [byName, bySlot] = await Promise.all([
      runPostgrestWithRetry(() =>
        supabase
          .from("warehouse_yard_placements")
          .select(sel)
          .ilike("customer_name", pattern)
          .order("created_at", { ascending: false })
          .limit(40),
      ),
      runPostgrestWithRetry(() =>
        supabase
          .from("warehouse_yard_placements")
          .select(sel)
          .ilike("slot_code", pattern)
          .order("created_at", { ascending: false })
          .limit(40),
      ),
    ]);
    if (myReq !== findReqRef.current) return;
    setFindLoading(false);
    const err = byName.error ?? bySlot.error;
    if (err) {
      setFindError(humanizeDbError(err.message));
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
    const seq = ++slotHistSeqRef.current;
    const t = setTimeout(() => {
      void (async () => {
        const safeSlot = slot.replace(/[%_]/g, "");
        setSlotHistoryLoading(true);
        const { data, error } = await runPostgrestWithRetry(() =>
          supabase
            .from("warehouse_yard_placements")
            .select("id,customer_name,slot_code,note,created_at")
            .ilike("slot_code", safeSlot)
            .order("created_at", { ascending: false })
            .limit(12),
        );
        if (cancelled || seq !== slotHistSeqRef.current) return;
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
    const seq = ++otherSlotsSeqRef.current;
    const t = setTimeout(() => {
      void (async () => {
        const pattern = `%${name.replace(/%/g, "")}%`;
        const { data } = await runPostgrestWithRetry(() =>
          supabase
            .from("warehouse_yard_placements")
            .select("slot_code,customer_name")
            .ilike("customer_name", pattern)
            .order("created_at", { ascending: false })
            .limit(40),
        );
        if (cancelled || seq !== otherSlotsSeqRef.current) return;
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
    const { error } = await runPostgrestWithRetry(() =>
      supabase.from("warehouse_yard_placements").insert({
        customer_name: name,
        slot_code: slot,
        note: placeNote.trim() || null,
      }),
    );
    setPlaceSaving(false);
    if (error) {
      setPlaceMsg(humanizeDbError(error.message));
      return;
    }
    setPlaceMsg("Saved. Stock is logged at this slot.");
    setPlaceName("");
    setPlaceNote("");
    void loadHomePulse();
    const norm = slot.toUpperCase();
    const { data: hist } = await runPostgrestWithRetry(() =>
      supabase
        .from("warehouse_yard_placements")
        .select("id,customer_name,slot_code,note,created_at")
        .ilike("slot_code", slot)
        .order("created_at", { ascending: false })
        .limit(12),
    );
    if (hist) {
      setSlotHistory((hist as YardRow[]).filter((r) => r.slot_code.trim().toUpperCase() === norm));
    }
  }

  const placeSuccess = Boolean(placeMsg?.startsWith("Saved"));
  const reduceMotion = useReducedMotion();
  const placeSlotOk = placeSlot.trim().length >= 2;
  const placeNameOk = placeName.trim().length > 0;
  const placeReady = Boolean(sessionEmail && placeSlotOk && placeNameOk);

  return (
    <>
      <AnimatePresence>{!bootDone ? <WarehouseYardBoot key="yard-boot" /> : null}</AnimatePresence>
      <div className="flex min-h-0 flex-1 flex-col bg-[#050508] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-4 sm:px-8 sm:pt-6 md:px-12">
        <div
          className={cn(
            "mx-auto flex w-full flex-1 flex-col",
            mode === "inventory" ? "max-w-6xl" : "max-w-2xl",
          )}
        >
          <AnimatePresence initial={false}>
            {mode !== "home" ? (
              <motion.button
                key="back"
                type="button"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => setMode("home")}
                className="mb-6 inline-flex items-center gap-2 font-sans text-sm text-white/60 transition hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back
              </motion.button>
            ) : null}
          </AnimatePresence>

          <AnimatePresence mode="wait" initial={false}>
            {mode === "home" ? (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="flex min-h-0 flex-1 flex-col justify-center gap-8 py-4 md:gap-10 md:py-8"
              >
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">Yard</p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Warehouse yard</h1>
                  <p className="mt-3 max-w-xl font-sans text-base font-light leading-relaxed text-white/70 sm:text-[1.05rem]">
                    Find stock, open the <span className="text-white/85">full inventory map</span>, or log a placement with a
                    zone QR or typed code. Yard labels only—not synced to other systems.
                  </p>
                </div>

                <div className="grid max-w-xl gap-4">
                  <motion.button
                    type="button"
                    onClick={() => setMode("find")}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
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
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => setMode("place")}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
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
                  </motion.button>

                  <motion.button
                    type="button"
                    onClick={() => setMode("inventory")}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
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
                  </motion.button>
                </div>

                <YardHomePulse
                  recent={pulseRecent}
                  busy={pulseBusy}
                  loading={pulseLoading}
                  onJumpToSlot={jumpToSlotFind}
                />
              </motion.div>
            ) : null}

            {mode === "find" ? (
              <motion.div
                key="find"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-4 [-webkit-overflow-scrolling:touch]"
              >
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
                <AnimatePresence mode="wait">
                  {findLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-sm text-white/55"
                    >
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-200/90" aria-hidden />
                      Searching the yard log…
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                {findError ? (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200/95"
                    role="alert"
                  >
                    {findError}
                  </motion.p>
                ) : null}
                {!findLoading && findQ.trim().length >= 2 && findResults.length === 0 && !findError ? (
                  <p className="text-sm text-white/55">No matches in the yard log yet.</p>
                ) : null}
                <ul className="space-y-3">
                  {findResults.map((row, i) => (
                    <motion.li
                      key={row.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.04, 0.35), duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
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
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ) : null}

            {mode === "inventory" ? (
              <motion.div
                key="inventory"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="min-h-0 flex-1"
              >
                <WarehouseYardInventory onChooseSlot={(slot) => jumpToSlotFind(slot)} />
              </motion.div>
            ) : null}

            {mode === "place" ? (
              <motion.div
                key="place"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="min-h-0 flex-1 overflow-y-auto pb-4 [-webkit-overflow-scrolling:touch]"
              >
                <motion.div
                  variants={placeFormStagger}
                  initial="hidden"
                  animate="show"
                  className="space-y-6"
                >
                  <motion.div variants={placeFieldReveal}>
                    <h2 className="text-xl font-semibold text-white">Place an item</h2>
                    <p className="mt-1 text-xs font-light text-white/45">Fields unlock the log as you go—watch the strip fill in.</p>
                  </motion.div>

                  <motion.div variants={placeFieldReveal}>
                    <PlacementStepBar
                      slotOk={placeSlotOk}
                      nameOk={placeNameOk}
                      canSave={placeReady}
                      reduceMotion={reduceMotion}
                    />
                  </motion.div>

                  {slotFromQr ? (
                    <motion.p
                      variants={placeFieldReveal}
                      className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95"
                    >
                      Slot from QR or link: <span className="font-mono font-semibold">{slotFromQr}</span>
                    </motion.p>
                  ) : (
                    <motion.p variants={placeFieldReveal} className="text-sm text-white/60">
                      Scan a <span className="text-white/80">zone QR</span> on the rack, or type the slot (e.g.{" "}
                      <span className="font-mono text-white/85">C2</span>).
                    </motion.p>
                  )}

                  <motion.div variants={placeFieldReveal}>
                    <div className="mb-1 flex items-end justify-between gap-2">
                      <FieldLabel htmlFor="yard-slot">Slot / zone code</FieldLabel>
                      {placeSlot.trim() ? (
                        <motion.span
                          key={placeSlot.trim().toUpperCase()}
                          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber-200/75"
                        >
                          {placeSlot.trim().toUpperCase()}
                        </motion.span>
                      ) : null}
                    </div>
                    <AnimatedFieldShell>
                      <input
                        id="yard-slot"
                        type="text"
                        value={placeSlot}
                        onChange={(e) => setPlaceSlot(e.target.value)}
                        placeholder="e.g. A10"
                        autoComplete="off"
                        className="w-full rounded-xl border-0 bg-transparent px-4 py-3 font-mono text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-0"
                      />
                    </AnimatedFieldShell>
                  </motion.div>

                  <motion.div variants={placeFieldReveal}>
                    <SlotTimeline
                      rows={slotHistory}
                      loading={slotHistoryLoading}
                      currentSlot={placeSlot}
                      reduceMotion={reduceMotion}
                    />
                  </motion.div>

                  <motion.div variants={placeFieldReveal}>
                    <FieldLabel htmlFor="yard-name">Customer or job name</FieldLabel>
                    <AnimatedFieldShell accent="sky">
                      <input
                        id="yard-name"
                        type="text"
                        value={placeName}
                        onChange={(e) => setPlaceName(e.target.value)}
                        placeholder="Who this stock is for"
                        autoComplete="off"
                        className="w-full rounded-xl border-0 bg-transparent px-4 py-3 font-sans text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-0"
                      />
                    </AnimatedFieldShell>
                    <AnimatePresence>
                      {otherSlots.length > 0 ? (
                        <motion.div
                          key="other-slots"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                          className="mt-3 overflow-hidden rounded-xl border border-sky-500/20 bg-sky-500/[0.07] px-3 py-2.5"
                        >
                          <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-sky-200/70">Also on record</p>
                          <p className="mt-2 text-xs leading-relaxed text-sky-100/90">
                            Same name at{" "}
                            {otherSlots.map((s, i) => (
                              <span key={s}>
                                {i > 0 ? ", " : ""}
                                <motion.button
                                  type="button"
                                  className="font-mono font-semibold text-sky-200 underline-offset-2 hover:underline"
                                  onClick={() => {
                                    setPlaceSlot(s);
                                    setPlaceMsg(`Slot set to ${s}.`);
                                  }}
                                  whileHover={{ scale: 1.04 }}
                                  whileTap={{ scale: 0.97 }}
                                >
                                  {s}
                                </motion.button>
                              </span>
                            ))}
                            <span className="text-sky-200/70"> — tap to switch.</span>
                          </p>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </motion.div>

                  <motion.div variants={placeFieldReveal}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <FieldLabel htmlFor="yard-note">Note (optional)</FieldLabel>
                      <motion.span
                        key={placeNote.length}
                        className={cn(
                          "font-mono text-[10px] tabular-nums",
                          placeNote.length > 0 ? "text-amber-200/80" : "text-white/35",
                        )}
                        initial={reduceMotion ? false : { scale: 1.2, opacity: 0.7 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 22 }}
                      >
                        {placeNote.length}
                      </motion.span>
                    </div>
                    <AnimatedFieldShell>
                      <textarea
                        id="yard-note"
                        value={placeNote}
                        onChange={(e) => setPlaceNote(e.target.value)}
                        placeholder="Door size, PO, anything helpful"
                        rows={3}
                        className="w-full resize-y rounded-xl border-0 bg-transparent px-4 py-3 font-sans text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-0"
                      />
                    </AnimatedFieldShell>
                  </motion.div>

                  {!sessionEmail ? (
                    <motion.div variants={placeFieldReveal} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white/80">
                      <LogIn className="h-4 w-4 shrink-0 text-white/60" aria-hidden />
                      <span>Sign in to save placements.</span>
                      <Link
                        href="/auth/login?next=/warehouse"
                        className="font-medium text-amber-200 underline-offset-4 hover:underline"
                      >
                        Sign in
                      </Link>
                    </motion.div>
                  ) : (
                    <motion.p variants={placeFieldReveal} className="text-[11px] text-white/45">
                      Signed in as {sessionEmail}
                    </motion.p>
                  )}

                  <motion.div variants={placeFieldReveal}>
                    <motion.button
                      type="button"
                      onClick={() => void submitPlace()}
                      disabled={placeSaving || !sessionEmail}
                      whileHover={placeSaving || !sessionEmail ? undefined : { scale: 1.015 }}
                      whileTap={placeSaving || !sessionEmail ? undefined : { scale: 0.98 }}
                      className={cn(
                        "relative w-full overflow-hidden rounded-xl border py-3 font-sans text-sm font-medium text-white transition disabled:opacity-40",
                        placeReady && !placeSaving
                          ? "border-emerald-400/35 bg-gradient-to-r from-emerald-600/25 via-white/10 to-amber-500/20 shadow-[0_0_32px_rgba(16,185,129,0.12)]"
                          : "border-white/15 bg-white/10 hover:bg-white/15",
                      )}
                    >
                      {placeSaving ? (
                        <span className="inline-flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          Saving…
                        </span>
                      ) : (
                        "Save placement"
                      )}
                      {placeSaving && !reduceMotion ? (
                        <motion.span
                          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                          initial={{ x: "-100%" }}
                          animate={{ x: "100%" }}
                          transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
                          aria-hidden
                        />
                      ) : null}
                    </motion.button>
                  </motion.div>

                  <AnimatePresence mode="wait">
                    {placeMsg ? (
                      <motion.div
                        key={placeMsg}
                        role="status"
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={
                          placeSuccess
                            ? { opacity: 1, y: 0, scale: 1 }
                            : { opacity: 1, y: 0, scale: 1, x: reduceMotion ? 0 : [0, -5, 5, -3, 0] }
                        }
                        exit={{ opacity: 0, y: -4 }}
                        transition={
                          placeSuccess
                            ? { type: "spring", stiffness: 420, damping: 28 }
                            : { duration: 0.42, ease: [0.22, 1, 0.36, 1] }
                        }
                        className={cn(
                          "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
                          placeSuccess
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100/95"
                            : "border-amber-500/25 bg-amber-500/10 text-amber-100/95",
                        )}
                      >
                        {placeSuccess ? (
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300/95" aria-hidden />
                        ) : null}
                        <p className={cn("leading-snug", placeSuccess ? "text-emerald-100/95" : "text-amber-100/90")}>
                          {placeMsg}
                        </p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

export function WarehouseYardClient({ initialSlot }: { initialSlot?: string | null }) {
  return <YardInner initialSlot={initialSlot} />;
}
