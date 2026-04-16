"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { SupabaseClient } from "@supabase/supabase-js";

function escapeIlike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
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
  const [role, setRole] = useState<string | null | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [suggestions, setSuggestions] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
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
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setRole(null);
        return;
      }
      const { data: prof } = await supabase.from("profiles").select("role").eq("user_id", user.id).maybeSingle();
      if (!cancelled) setRole(prof?.role ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (role !== "admin" && role !== "manager") return;
    if (debounced.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setSearching(true);
      const q = escapeIlike(debounced);
      const pattern = `%${q}%`;
      const { data, error } = await supabase
        .from("customers")
        .select("id,name,phone")
        .or(`name.ilike.${pattern},phone.ilike.${pattern}`)
        .order("name", { ascending: true })
        .limit(18);
      if (!cancelled) {
        setSearching(false);
        if (error) {
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

  if (role === undefined) {
    return (
      <div className="mt-2 border-t border-white/5 pt-2 text-[11px] text-muted-foreground">Loading access…</div>
    );
  }

  if (role !== "admin" && role !== "manager") {
    return null;
  }

  return (
    <div className="mt-2 border-t border-white/5 pt-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <label htmlFor="warehouse-customer-find" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Find by customer
          </label>
          <div className="relative mt-1">
            <input
              id="warehouse-customer-find"
              type="search"
              autoComplete="off"
              placeholder="Type customer name or phone…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
              }}
              className="w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent-gold/40"
            />
            {debounced.length >= 2 && suggestions.length > 0 && !selected ? (
              <ul
                className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-52 overflow-y-auto rounded-md border border-white/15 bg-[#0c0c12] py-1 shadow-xl"
                role="listbox"
              >
                {suggestions.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-white/10"
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
              <p className="mt-1 text-[11px] text-muted-foreground">Searching…</p>
            ) : null}
          </div>
        </div>
        {onFocusInventoryMap ? (
          <button
            type="button"
            className="shrink-0 rounded-md border border-white/15 bg-white/[0.06] px-3 py-2 text-xs font-medium text-foreground hover:bg-white/10"
            onClick={onFocusInventoryMap}
          >
            Inventory floor map
          </button>
        ) : null}
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
    </div>
  );
}
