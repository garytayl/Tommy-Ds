import type { SupabaseClient } from "@supabase/supabase-js";

const LOCATION_ORDER: Record<string, number> = {
  door_shop: 0,
  lower_warehouse: 1,
  upper_warehouse: 2,
};

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

export type CustomerPullGroup = {
  code: string;
  name: string;
  sort: number;
  items: { material: string; qty: string; jobTitle: string; notes: string | null }[];
};

export type CustomerPullResult = {
  customerName: string | null;
  jobCount: number;
  lineCount: number;
  grouped: CustomerPullGroup[];
  error: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLikelyCustomerId(s: string | null): boolean {
  if (!s || s.length < 32) return false;
  return UUID_RE.test(s.trim());
}

/** Loads job supply lines for a customer, grouped by pull location (same rules as warehouse customer guide). */
export async function fetchCustomerPullSupplies(
  supabase: SupabaseClient,
  customerId: string,
): Promise<CustomerPullResult> {
  const empty: CustomerPullResult = {
    customerName: null,
    jobCount: 0,
    lineCount: 0,
    grouped: [],
    error: null,
  };

  const { data: cust, error: cErr } = await supabase
    .from("customers")
    .select("id,name")
    .eq("id", customerId.trim())
    .maybeSingle();
  if (cErr) return { ...empty, error: cErr.message };
  if (!cust) return { ...empty, error: "Customer not found." };

  const jobsRes = await supabase
    .from("jobs")
    .select("id,title,status")
    .eq("customer_id", customerId.trim())
    .order("created_at", { ascending: false });
  if (jobsRes.error) return { ...empty, error: jobsRes.error.message };

  const jobList = jobsRes.data ?? [];
  if (jobList.length === 0) {
    return {
      customerName: cust.name as string,
      jobCount: 0,
      lineCount: 0,
      grouped: [],
      error: null,
    };
  }

  const jobIds = jobList.map((j) => j.id);
  const jobTitleById = new Map(jobList.map((j) => [j.id as string, j.title as string]));

  const matRes = await supabase
    .from("job_materials")
    .select("id,quantity,notes,job_id,materials(id,name,unit,default_location_id),locations(id,name,code)")
    .in("job_id", jobIds)
    .order("created_at", { ascending: true });
  if (matRes.error) return { ...empty, error: matRes.error.message };

  const raw = (matRes.data ?? []) as unknown as JobMaterialRow[];
  const needLocIds = [
    ...new Set(
      raw.filter((r) => !r.locations && r.materials?.default_location_id).map((r) => r.materials!.default_location_id as string),
    ),
  ];

  let defaultLocations = new Map<string, { name: string; code: string }>();
  if (needLocIds.length > 0) {
    const locRes = await supabase.from("locations").select("id,name,code").in("id", needLocIds);
    if (locRes.error) return { ...empty, error: locRes.error.message };
    for (const loc of locRes.data ?? []) {
      defaultLocations.set(loc.id as string, { name: loc.name as string, code: loc.code as string });
    }
  }

  const map = new Map<string, CustomerPullGroup>();
  for (const row of raw) {
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

  const grouped = [...map.values()].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));

  return {
    customerName: cust.name as string,
    jobCount: jobList.length,
    lineCount: raw.length,
    grouped,
    error: null,
  };
}
