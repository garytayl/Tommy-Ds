"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { SupabaseClient, User } from "@supabase/supabase-js";

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** PostgREST expects quoted values for ilike patterns (see admin search). */
function quotedFilterValue(s: string): string {
  return `"${s.replace(/"/g, '""')}"`;
}

const LOCATION_ORDER: Record<string, number> = {
  door_shop: 0,
  lower_warehouse: 1,
  upper_warehouse: 2,
};

type JobRow = { id: string; title: string; status: string };
type MaterialRow = {
  id: string;
  name: string;
  unit: string;
  default_location_id: string | null;
};
type JobMaterialRow = {
  id: string;
  quantity: number | string | null;
  notes: string | null;
  job_id: string;
  materials: MaterialRow | null;
  locations: { id: string; name: string; code: string } | null;
};

type Props = {
  supabase: SupabaseClient;
  onFocusInventoryMap?: () => void;
};

export function WarehouseCustomerGuide({ supabase, onFocusInventoryMap }: Props) {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [suggestions, setSuggestions] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [lines, setLines] = useState<JobMaterialRow[]>([]);
  const [defaultLocations, setDefaultLocations] = useState<Map<string, { name: string; code: string }>>(new Map());
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 280);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    async function syncAuth() {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setUser(u ?? null);
      if (!u) {
        setRole(null);
        setAuthReady(true);
        return;
      }
      const { data: prof } = await supabase.from("profiles").select("role").eq("user_id", u.id).maybeSingle();
      if (cancelled) return;
      setRole(prof?.role ?? null);
      setAuthReady(true);
    }
    void syncAuth();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void syncAuth();
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (role !== "admin" && role !== "manager") return;
    if (debounced.length < 2) {
      setSuggestions([]);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setSearching(true);
      setSearchError(null);
      const pattern = `%${escapeIlike(debounced)}%`;
      const q = quotedFilterValue(pattern);
      const { data, error } = await supabase
        .from("customers")
        .select("id,name,phone")
        .or(`name.ilike.${q},phone.ilike.${q}`)
        .order("name", { ascending: true })
        .limit(18);
      if (!cancelled) {
        setSearching(false);
        if (error) {
          setSearchError(error.message);
          setSuggestions([]);
          return;
        }
        setSuggestions((data ?? []) as { id: string; name: string; phone: string | null }[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, role, supabase]);

  const loadCustomerDetail = useCallback(
    async (customerId: string) => {
      setLoadError(null);
      setLoadingDetail(true);
      setJobs([]);
      setLines([]);
      setDefaultLocations(new Map());
      const jobsRes = await supabase
        .from("jobs")
        .select("id,title,status")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (jobsRes.error) {
        setLoadError(jobsRes.error.message);
        setLoadingDetail(false);
        return;
      }
      const jobList = (jobsRes.data ?? []) as JobRow[];
      setJobs(jobList);
      if (jobList.length === 0) {
        setLoadingDetail(false);
        return;
      }
      const jobIds = jobList.map((j) => j.id);
      const matRes = await supabase
        .from("job_materials")
        .select("id,quantity,notes,job_id,materials(id,name,unit,default_location_id),locations(id,name,code)")
        .in("job_id", jobIds)
        .order("created_at", { ascending: true });
      if (matRes.error) {
        setLoadError(matRes.error.message);
        setLoadingDetail(false);
        return;
      }
      const raw = (matRes.data ?? []) as unknown as JobMaterialRow[];
      setLines(raw);
      const needLocIds = [
        ...new Set(
          raw
            .filter((r) => !r.locations && r.materials?.default_location_id)
            .map((r) => r.materials!.default_location_id as string),
        ),
      ];
      if (needLocIds.length === 0) {
        setDefaultLocations(new Map());
      } else {
        const locRes = await supabase.from("locations").select("id,name,code").in("id", needLocIds);
        if (locRes.error) {
          setLoadError(locRes.error.message);
          setLoadingDetail(false);
          return;
        }
        const m = new Map<string, { name: string; code: string }>();
        for (const loc of locRes.data ?? []) {
          m.set(loc.id as string, {
            name: loc.name as string,
            code: loc.code as string,
          });
        }
        setDefaultLocations(m);
      }
      setLoadingDetail(false);
    },
    [supabase],
  );

  const jobTitleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const j of jobs) m.set(j.id, j.title);
    return m;
  }, [jobs]);

  const grouped = useMemo(() => {
    type G = {
      code: string;
      name: string;
      sort: number;
      items: { material: string; qty: string; jobTitle: string; notes: string | null }[];
    };
    const map = new Map<string, G>();

    for (const row of lines) {
      const mat = row.materials;
      const explicit = row.locations;
      const defId = mat?.default_location_id ?? null;
      const fromDefault = defId ? defaultLocations.get(defId) : undefined;
      const locName = explicit?.name ?? fromDefault?.name ?? "Location not set";
      const code = explicit?.code ?? fromDefault?.code ?? "unknown";
      const sort = LOCATION_ORDER[code] ?? 99;
      const materialName = mat?.name ?? "Unknown material";
      const unit = mat?.unit ?? "each";
      const qtyNum = row.quantity != null ? Number(row.quantity) : NaN;
      const qty =
        Number.isFinite(qtyNum) && !Number.isInteger(qtyNum)
          ? String(qtyNum)
          : Number.isFinite(qtyNum)
            ? String(Math.round(qtyNum))
            : String(row.quantity ?? "");
      const qtyLabel = qty ? `${qty} ${unit}`.trim() : unit;

      if (!map.has(code)) {
        map.set(code, { code, name: locName, sort, items: [] });
      }
      map.get(code)!.items.push({
        material: materialName,
        qty: qtyLabel,
        jobTitle: jobTitleById.get(row.job_id) ?? "Job",
        notes: row.notes,
      });
    }

    return [...map.values()].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  }, [lines, jobTitleById, defaultLocations]);

  const canSearchCustomers = role === "admin" || role === "manager";

  return (
    <section
      className="relative z-[40] overflow-visible border-b border-accent-gold/25 bg-gradient-to-b from-accent-gold/[0.07] to-transparent px-3 py-3 md:px-4"
      aria-labelledby="warehouse-customer-guide-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="warehouse-customer-guide-title" className="text-sm font-semibold tracking-tight text-foreground">
            Find customer stock
          </h2>
          <p className="mt-0.5 max-w-xl text-[11px] leading-snug text-muted-foreground">
            Type a customer name or phone, pick them from the list, then use the pull locations below to walk the
            warehouse.
          </p>
        </div>
        {onFocusInventoryMap ? (
          <button
            type="button"
            className="shrink-0 rounded-md border border-white/15 bg-white/[0.08] px-3 py-2 text-xs font-medium text-foreground hover:bg-white/12"
            onClick={onFocusInventoryMap}
          >
            Open inventory floor map
          </button>
        ) : null}
      </div>

      {!authReady ? (
        <p className="mt-3 text-xs text-muted-foreground">Checking your account…</p>
      ) : !user ? (
        <p className="mt-3 text-sm text-foreground/95">
          <Link href="/auth/login?next=/warehouse" className="font-semibold text-accent-gold underline-offset-4 hover:underline">
            Sign in
          </Link>{" "}
          with an admin or manager account. Then search for a customer here to see where their job supplies pull from.
        </p>
      ) : !canSearchCustomers ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Customer search is limited to admin and manager accounts (your role:{" "}
          <span className="font-mono text-foreground/90">{role ?? "none"}</span>). Ask the office to find pull locations
          or switch to an office login.
        </p>
      ) : (
        <>
          <div className="mt-3">
            <label htmlFor="warehouse-customer-find" className="sr-only">
              Search customer by name or phone
            </label>
            <div className="relative">
              <input
                id="warehouse-customer-find"
                type="search"
                autoComplete="off"
                placeholder="Start typing customer name or phone…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                }}
                className="w-full rounded-md border border-white/20 bg-black/50 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-gold/50"
              />
              {debounced.length >= 2 && suggestions.length > 0 && !selected ? (
                <ul
                  className="absolute left-0 right-0 top-full z-[80] mt-1 max-h-60 overflow-y-auto rounded-md border border-white/15 bg-[#0c0c12] py-1 shadow-2xl"
                  role="listbox"
                >
                  {suggestions.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2.5 text-left text-sm hover:bg-white/10"
                        onClick={() => {
                          setSelected({ id: c.id, name: c.name });
                          setQuery(c.name);
                          setSuggestions([]);
                          void loadCustomerDetail(c.id);
                        }}
                      >
                        <span className="font-medium text-foreground">{c.name}</span>
                        {c.phone ? (
                          <span className="ml-2 text-xs text-muted-foreground">{c.phone}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {searching ? (
                <p className="mt-2 text-[11px] text-muted-foreground">Searching…</p>
              ) : null}
              {searchError ? (
                <p className="mt-2 text-xs text-destructive-foreground" role="alert">
                  {searchError}
                </p>
              ) : null}
              {debounced.length >= 2 && !searching && !searchError && canSearchCustomers && suggestions.length === 0 && !selected ? (
                <p className="mt-2 text-[11px] text-muted-foreground">No matching customers.</p>
              ) : null}
            </div>
          </div>

          {selected ? (
        <div className="mt-3 rounded-lg border border-white/10 bg-black/35 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{selected.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {jobs.length} job{jobs.length === 1 ? "" : "s"}
              {lines.length > 0 ? ` · ${lines.length} supply line${lines.length === 1 ? "" : "s"}` : ""}
            </p>
          </div>
          {loadError ? (
            <p className="mt-2 text-sm text-destructive-foreground" role="alert">
              {loadError}
            </p>
          ) : null}
          {loadingDetail ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading job supplies…</p>
          ) : null}
          {!loadingDetail && !loadError && jobs.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No jobs for this customer yet.</p>
          ) : null}
          {!loadingDetail && !loadError && jobs.length > 0 && lines.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No supplies listed on jobs yet. Add lines on each job&apos;s Supplies tab with a pull location.
            </p>
          ) : null}

          {!loadingDetail && grouped.length > 0 ? (
            <ol className="mt-3 space-y-3">
              {grouped.map((g) => (
                <li key={g.code}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent-gold/90">
                    {g.name}
                    <span className="ml-2 font-normal text-muted-foreground">({g.code})</span>
                  </p>
                  <ul className="mt-1.5 space-y-2 border-l border-white/10 pl-3">
                    {g.items.map((item, idx) => (
                      <li key={`${g.code}-${idx}-${item.material}`} className="text-sm text-foreground/95">
                        <span className="font-medium">{item.material}</span>
                        <span className="text-muted-foreground"> — {item.qty}</span>
                        <div className="text-[11px] text-muted-foreground">
                          Job: {item.jobTitle}
                          {item.notes?.trim() ? ` · ${item.notes.trim()}` : ""}
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          ) : null}

          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Locations come from each job supply line (or the material default). Use the inventory map and lot labels on
            the floor to match bays; the map markers describe windows and doors staged for jobs.
          </p>
        </div>
          ) : null}
        </>
      )}
    </section>
  );
}
