import Link from "next/link";

import { createSupabaseServerClientForData } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type JobRow = {
  id: string;
  status: string | null;
  job_kind: "installation" | "service" | null;
  scheduled_start: string | null;
  created_at: string | null;
  assigned_crew_id: string | null;
};

type InvoiceRow = {
  id: string;
  status: string | null;
  total_cents: number | null;
  balance_due_cents: number | null;
  created_at: string | null;
};

type QuoteRow = {
  id: string;
  status: string | null;
  workflow_stage: string | null;
  total_cents: number | null;
  deposit_received: boolean | null;
  created_at: string | null;
  job_id: string | null;
};

type PaymentRow = {
  id: string;
  amount_cents: number | null;
  status: string | null;
  provider: string | null;
  created_at: string | null;
};

type CustomerRow = {
  id: string;
  created_at: string | null;
  city: string | null;
  state: string | null;
};

type LeadRow = {
  id: string;
  source: string | null;
  created_at: string | null;
  converted_job_id: string | null;
};

type CrewRow = {
  id: string;
  name: string | null;
};

type ScheduleEventRow = {
  id: string;
  starts_at: string | null;
};

type MaterialRow = {
  id: string;
};

type LotRow = {
  id: string;
};

type InventoryRow = {
  id: string;
  quantity: number | null;
};

type VehicleRow = {
  id: string;
  name: string | null;
  vehicle_type: "truck" | "van" | "other" | null;
  is_active: boolean | null;
};

type GasCardRow = {
  id: string;
  label: string | null;
  provider: string | null;
  card_last4: string | null;
  assigned_vehicle_id: string | null;
  is_active: boolean | null;
};

type FuelPurchaseRow = {
  id: string;
  purchased_at: string | null;
  vehicle_id: string | null;
  gas_card_id: string | null;
  gallons: number | null;
  total_cents: number | null;
};

type ChartDatum = {
  label: string;
  value: number;
  sublabel?: string;
};

type MonthBucket = {
  key: string;
  label: string;
  invoiced: number;
  collected: number;
  jobs: number;
  quotes: number;
  leads: number;
  customers: number;
  fuelCents: number;
};

function asArray<T>(data: T[] | null | undefined): T[] {
  return Array.isArray(data) ? data : [];
}

function safeDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function percentage(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short" });
}

function makeMonthBuckets(months = 12): MonthBucket[] {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const buckets: MonthBucket[] = [];

  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - i, 1));
    buckets.push({
      key: monthKey(d),
      label: monthLabel(d),
      invoiced: 0,
      collected: 0,
      jobs: 0,
      quotes: 0,
      leads: 0,
      customers: 0,
      fuelCents: 0,
    });
  }

  return buckets;
}

function statusLabel(status: string | null): string {
  if (!status) return "unknown";
  return status.replaceAll("_", " ");
}

function isMissingRelationError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "42P01") return true;
  return /does not exist/i.test(error.message ?? "");
}

function HorizontalBars({
  title,
  subtitle,
  data,
  formatter = (value: number) => value.toLocaleString("en-US"),
}: {
  title: string;
  subtitle?: string;
  data: ChartDatum[];
  formatter?: (value: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}

      <div className="mt-4 space-y-3">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          data.map((item) => {
            const width = `${Math.max(4, (item.value / max) * 100)}%`;
            return (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="text-muted-foreground">{formatter(item.value)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted/70">
                  <div
                    className="h-2 rounded-full bg-primary transition-[width] duration-500"
                    style={{ width }}
                  />
                </div>
                {item.sublabel ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">{item.sublabel}</p>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function MonthlyRevenueChart({ data }: { data: MonthBucket[] }) {
  const max = Math.max(
    1,
    ...data.flatMap((m) => [m.invoiced, m.collected]),
  );

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Revenue trend (last 12 months)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Invoiced vs collected cashflow.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
            Invoiced
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            Collected
          </span>
        </div>
      </div>

      <div className="mt-5 flex h-56 items-end gap-2">
        {data.map((month) => {
          const invoicedHeight = `${(month.invoiced / max) * 100}%`;
          const collectedHeight = `${(month.collected / max) * 100}%`;
          return (
            <div key={month.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-44 w-full items-end justify-center gap-1 rounded-lg bg-muted/20 px-1">
                <div
                  className="w-3 rounded-t bg-primary/85"
                  style={{ height: invoicedHeight }}
                  title={`${month.label} invoiced: ${formatMoney(month.invoiced)}`}
                />
                <div
                  className="w-3 rounded-t bg-emerald-500/85"
                  style={{ height: collectedHeight }}
                  title={`${month.label} collected: ${formatMoney(month.collected)}`}
                />
              </div>
              <span className="text-[11px] text-muted-foreground">{month.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function WeeklyHeatStrip({ jobs, events }: { jobs: number[]; events: number[] }) {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const combined = jobs.map((count, idx) => count + events[idx]);
  const max = Math.max(1, ...combined);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold text-foreground">Schedule density by weekday</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Jobs + schedule events mapped to calendar rhythm.
      </p>

      <div className="mt-4 grid grid-cols-7 gap-2">
        {labels.map((label, idx) => {
          const intensity = Math.max(0.12, combined[idx] / max);
          return (
            <div key={label} className="space-y-1 text-center">
              <div
                className="mx-auto h-16 w-full rounded-lg border border-border bg-primary"
                style={{ opacity: intensity }}
                title={`${label}: ${combined[idx]} scheduled items (${jobs[idx]} jobs, ${events[idx]} events)`}
              />
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function InsightCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

export default async function AnalyticsPage() {
  const supabase = await createSupabaseServerClientForData();

  const [
    jobsResult,
    invoicesResult,
    quotesResult,
    paymentsResult,
    customersResult,
    leadsResult,
    crewsResult,
    scheduleEventsResult,
    materialsResult,
    lotsResult,
    inventoryResult,
    vehiclesResult,
    gasCardsResult,
    fuelPurchasesResult,
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select("id,status,job_kind,scheduled_start,created_at,assigned_crew_id"),
    supabase
      .from("invoices")
      .select("id,status,total_cents,balance_due_cents,created_at"),
    supabase
      .from("quotes")
      .select("id,status,workflow_stage,total_cents,deposit_received,created_at,job_id"),
    supabase
      .from("payments")
      .select("id,amount_cents,status,provider,created_at"),
    supabase.from("customers").select("id,created_at,city,state"),
    supabase.from("leads").select("id,source,created_at,converted_job_id"),
    supabase.from("crews").select("id,name"),
    supabase.from("schedule_events").select("id,starts_at"),
    supabase.from("materials").select("id"),
    supabase.from("lots").select("id"),
    supabase.from("inventory").select("id,quantity"),
    supabase.from("vehicles").select("id,name,vehicle_type,is_active"),
    supabase.from("gas_cards").select("id,label,provider,card_last4,assigned_vehicle_id,is_active"),
    supabase.from("fuel_purchases").select("id,purchased_at,vehicle_id,gas_card_id,gallons,total_cents"),
  ]);

  const jobs = asArray(jobsResult.data as JobRow[] | null);
  const invoices = asArray(invoicesResult.data as InvoiceRow[] | null);
  const quotes = asArray(quotesResult.data as QuoteRow[] | null);
  const payments = asArray(paymentsResult.data as PaymentRow[] | null);
  const customers = asArray(customersResult.data as CustomerRow[] | null);
  const leads = asArray(leadsResult.data as LeadRow[] | null);
  const crews = asArray(crewsResult.data as CrewRow[] | null);
  const scheduleEvents = asArray(scheduleEventsResult.data as ScheduleEventRow[] | null);
  const materials = asArray(materialsResult.data as MaterialRow[] | null);
  const lots = asArray(lotsResult.data as LotRow[] | null);
  const inventory = asArray(inventoryResult.data as InventoryRow[] | null);
  const fuelTablesMissing = [
    vehiclesResult.error,
    gasCardsResult.error,
    fuelPurchasesResult.error,
  ].some((error) => isMissingRelationError(error));
  const vehicles = fuelTablesMissing
    ? []
    : asArray(vehiclesResult.data as VehicleRow[] | null);
  const gasCards = fuelTablesMissing
    ? []
    : asArray(gasCardsResult.data as GasCardRow[] | null);
  const fuelPurchases = fuelTablesMissing
    ? []
    : asArray(fuelPurchasesResult.data as FuelPurchaseRow[] | null);

  const fuelQueryErrors = [
    { name: "vehicles", error: vehiclesResult.error },
    { name: "gas_cards", error: gasCardsResult.error },
    { name: "fuel_purchases", error: fuelPurchasesResult.error },
  ]
    .filter((item) => Boolean(item.error) && !isMissingRelationError(item.error))
    .map((item) => `${item.name}: ${item.error?.message ?? "Unknown query error"}`);

  const queryErrors = [
    { name: "jobs", error: jobsResult.error },
    { name: "invoices", error: invoicesResult.error },
    { name: "quotes", error: quotesResult.error },
    { name: "payments", error: paymentsResult.error },
    { name: "customers", error: customersResult.error },
    { name: "leads", error: leadsResult.error },
    { name: "crews", error: crewsResult.error },
    { name: "schedule_events", error: scheduleEventsResult.error },
    { name: "materials", error: materialsResult.error },
    { name: "lots", error: lotsResult.error },
    { name: "inventory", error: inventoryResult.error },
    ...fuelQueryErrors.map((message) => ({ name: "fuel", error: { message } })),
  ]
    .filter((item) => Boolean(item.error))
    .map((item) => `${item.name}: ${item.error?.message ?? "Unknown query error"}`);

  const jobsByStatusMap = new Map<string, number>();
  const jobsByKindMap = new Map<string, number>();
  const crewById = new Map<string, string>();
  const weekdayJobCounts = new Array(7).fill(0);

  for (const crew of crews) {
    crewById.set(crew.id, crew.name?.trim() || "Unnamed crew");
  }

  for (const job of jobs) {
    const status = statusLabel(job.status);
    jobsByStatusMap.set(status, (jobsByStatusMap.get(status) ?? 0) + 1);

    const kind = job.job_kind ?? "unknown";
    jobsByKindMap.set(kind, (jobsByKindMap.get(kind) ?? 0) + 1);

    const scheduled = safeDate(job.scheduled_start);
    if (scheduled) {
      weekdayJobCounts[scheduled.getDay()] += 1;
    }
  }

  const completedStatuses = new Set(["installed", "completed", "closed", "paid"]);
  const completedJobs = jobs.filter((j) => completedStatuses.has(j.status ?? ""));
  const unscheduledJobs = jobs.filter((j) => !j.scheduled_start);

  const totalInvoicedCents = invoices.reduce((sum, inv) => sum + toNumber(inv.total_cents), 0);
  const totalOutstandingCents = invoices.reduce(
    (sum, inv) => sum + Math.max(0, toNumber(inv.balance_due_cents)),
    0,
  );
  const paidPayments = payments.filter((p) => p.status === "succeeded");
  const collectedCents = paidPayments.reduce((sum, p) => sum + toNumber(p.amount_cents), 0);

  const avgInvoiceCents =
    invoices.length > 0
      ? Math.round(totalInvoicedCents / invoices.length)
      : 0;

  const invoiceStatusChart = [...new Set(invoices.map((i) => statusLabel(i.status)))]
    .map((label) => ({
      label,
      value: invoices.filter((i) => statusLabel(i.status) === label).length,
    }))
    .sort((a, b) => b.value - a.value);

  const quoteAccepted = quotes.filter((q) => q.status === "accepted").length;
  const quoteConverted = quotes.filter((q) => Boolean(q.job_id)).length;
  const depositsCaptured = quotes.filter((q) => q.deposit_received).length;
  const quotePipelineValueCents = quotes
    .filter((q) => q.status === "draft" || q.status === "sent")
    .reduce((sum, q) => sum + toNumber(q.total_cents), 0);

  const leadsConverted = leads.filter((l) => Boolean(l.converted_job_id)).length;
  const leadSourceMap = new Map<string, number>();
  for (const lead of leads) {
    const source = statusLabel(lead.source ?? "other");
    leadSourceMap.set(source, (leadSourceMap.get(source) ?? 0) + 1);
  }

  const leadSourceChart = Array.from(leadSourceMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const crewLoadMap = new Map<string, number>();
  for (const job of jobs) {
    const name = job.assigned_crew_id
      ? (crewById.get(job.assigned_crew_id) ?? "Unknown crew")
      : "Unassigned";
    crewLoadMap.set(name, (crewLoadMap.get(name) ?? 0) + 1);
  }

  const crewLoadChart = Array.from(crewLoadMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  const weekdayEventCounts = new Array(7).fill(0);
  for (const event of scheduleEvents) {
    const starts = safeDate(event.starts_at);
    if (starts) {
      weekdayEventCounts[starts.getDay()] += 1;
    }
  }

  const months = makeMonthBuckets(12);
  const monthMap = new Map(months.map((m) => [m.key, m]));
  const firstMonth = months[0]?.key ?? "";

  function addToMonth(dateValue: string | null, updater: (bucket: MonthBucket) => void) {
    const d = safeDate(dateValue);
    if (!d) return;
    const key = monthKey(d);
    if (key < firstMonth) return;
    const bucket = monthMap.get(key);
    if (!bucket) return;
    updater(bucket);
  }

  for (const invoice of invoices) {
    addToMonth(invoice.created_at, (bucket) => {
      bucket.invoiced += toNumber(invoice.total_cents);
    });
  }

  for (const payment of paidPayments) {
    addToMonth(payment.created_at, (bucket) => {
      bucket.collected += toNumber(payment.amount_cents);
    });
  }

  for (const job of jobs) {
    addToMonth(job.created_at, (bucket) => {
      bucket.jobs += 1;
    });
  }

  for (const quote of quotes) {
    addToMonth(quote.created_at, (bucket) => {
      bucket.quotes += 1;
    });
  }

  for (const lead of leads) {
    addToMonth(lead.created_at, (bucket) => {
      bucket.leads += 1;
    });
  }

  for (const customer of customers) {
    addToMonth(customer.created_at, (bucket) => {
      bucket.customers += 1;
    });
  }

  for (const fuelPurchase of fuelPurchases) {
    addToMonth(fuelPurchase.purchased_at, (bucket) => {
      bucket.fuelCents += toNumber(fuelPurchase.total_cents);
    });
  }

  const monthVolumeMax = Math.max(
    1,
    ...months.flatMap((m) => [m.jobs, m.quotes, m.leads, m.customers]),
  );

  const topCities = Array.from(
    customers.reduce((acc, customer) => {
      const city = customer.city?.trim();
      if (!city) return acc;
      acc.set(city, (acc.get(city) ?? 0) + 1);
      return acc;
    }, new Map<string, number>()),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const inventoryQuantity = inventory.reduce((sum, row) => sum + toNumber(row.quantity), 0);
  const activeVehicles = vehicles.filter((vehicle) => vehicle.is_active !== false);
  const activeGasCards = gasCards.filter((card) => card.is_active !== false);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const vehicleNameById = new Map(
    vehicles.map((vehicle) => [vehicle.id, vehicle.name?.trim() || "Unnamed vehicle"]),
  );
  const gasCardLabelById = new Map(
    gasCards.map((card) => {
      const fallback = [
        card.provider?.trim(),
        card.card_last4 ? `•••• ${card.card_last4}` : undefined,
      ]
        .filter(Boolean)
        .join(" ");
      return [card.id, card.label?.trim() || fallback || "Unlabeled card"];
    }),
  );
  const fuelByVehicleMap = new Map<string, number>();
  const fuelByCardMap = new Map<string, number>();
  let fuelSpendCentsTotal = 0;
  let fuelSpendCentsLast30 = 0;
  let fuelGallonsLast30 = 0;

  for (const fuelPurchase of fuelPurchases) {
    const cents = toNumber(fuelPurchase.total_cents);
    const gallons = toNumber(fuelPurchase.gallons);
    fuelSpendCentsTotal += cents;

    const purchasedDate = safeDate(fuelPurchase.purchased_at);
    if (purchasedDate && purchasedDate >= thirtyDaysAgo) {
      fuelSpendCentsLast30 += cents;
      fuelGallonsLast30 += gallons;
    }

    const vehicleLabel = fuelPurchase.vehicle_id
      ? (vehicleNameById.get(fuelPurchase.vehicle_id) ?? "Unknown vehicle")
      : "Unassigned vehicle";
    fuelByVehicleMap.set(vehicleLabel, (fuelByVehicleMap.get(vehicleLabel) ?? 0) + cents);

    const cardLabel = fuelPurchase.gas_card_id
      ? (gasCardLabelById.get(fuelPurchase.gas_card_id) ?? "Unknown card")
      : "No card linked";
    fuelByCardMap.set(cardLabel, (fuelByCardMap.get(cardLabel) ?? 0) + cents);
  }

  const fuelByVehicleChart = Array.from(fuelByVehicleMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const fuelByCardChart = Array.from(fuelByCardMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const fuelAvgPricePerGallonCentsLast30 =
    fuelGallonsLast30 > 0 ? Math.round(fuelSpendCentsLast30 / fuelGallonsLast30) : 0;
  const fuelMonthMax = Math.max(1, ...months.map((month) => month.fuelCents));

  const insights: { title: string; body: string }[] = [];
  if (totalOutstandingCents > 0) {
    insights.push({
      title: "Collections opportunity",
      body: `${formatMoney(totalOutstandingCents)} is still open across invoices. Focus on older partially paid invoices to speed up cashflow.`,
    });
  }
  if (quotes.length > 0 && quoteConverted / quotes.length < 0.5) {
    insights.push({
      title: "Quote conversion can grow",
      body: `Only ${percentage(quoteConverted, quotes.length)} of quotes have turned into jobs. Consider tighter follow-up cadences and clearer option packaging.`,
    });
  }
  if (unscheduledJobs.length > 0) {
    insights.push({
      title: "Scheduling backlog",
      body: `${unscheduledJobs.length} jobs are unscheduled. Assigning these can smooth crew utilization and improve close time.`,
    });
  }
  if (fuelTablesMissing) {
    insights.push({
      title: "Enable fuel analytics",
      body: "Run the latest migrations to create vehicles, gas cards, and fuel purchases tables so gas spending can be tracked here and in reports.",
    });
  } else if (fuelSpendCentsLast30 > 0) {
    insights.push({
      title: "Fleet fuel spend snapshot",
      body: `${formatMoney(fuelSpendCentsLast30)} spent on gas in the last 30 days at an average of ${formatMoney(fuelAvgPricePerGallonCentsLast30)} per gallon.`,
    });
  }
  if (insights.length === 0) {
    insights.push({
      title: "System is balanced",
      body: "Major leading indicators look healthy right now. Keep feeding data (quotes, leads, payments) to unlock deeper trend confidence.",
    });
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin intelligence</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analytics</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Full-funnel performance for Tommy D&apos;s: leads, estimates, scheduling, crews, invoices, collections, and warehouse signals.
        </p>
      </header>

      {queryErrors.length > 0 ? (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">Some analytics data could not be loaded:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {queryErrors.map((errorMessage) => (
              <li key={errorMessage}>{errorMessage}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">Collected revenue</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{formatMoney(collectedCents)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {percentage(collectedCents, Math.max(totalInvoicedCents, 1))} of invoiced value.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">Open receivables</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{formatMoney(totalOutstandingCents)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Across {invoiceStatusChart.find((d) => d.label === "partially paid")?.value ?? 0} partially paid invoices.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">Job completion rate</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{percentage(completedJobs.length, jobs.length)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {completedJobs.length.toLocaleString("en-US")} of {jobs.length.toLocaleString("en-US")} jobs marked complete/installed/closed/paid.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">Quote acceptance</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{percentage(quoteAccepted, quotes.length)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {quoteAccepted.toLocaleString("en-US")} accepted of {quotes.length.toLocaleString("en-US")} total quotes.
          </p>
        </div>
      </section>

      <MonthlyRevenueChart data={months} />

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Fleet fuel spend</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Track gas costs across trucks, van, and multiple cards.
            </p>
          </div>
          <Link href="/admin/reports/gas" className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40">
            Open dedicated gas report
          </Link>
        </div>

        {fuelTablesMissing ? (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
            Fuel tables are not available yet in this environment. Apply the latest migrations to enable gas analytics.
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Fuel spend (30d)</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{formatMoney(fuelSpendCentsLast30)}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Fuel spend (all-time)</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{formatMoney(fuelSpendCentsTotal)}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Avg price / gallon (30d)</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{formatMoney(fuelAvgPricePerGallonCentsLast30)}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Active vehicles / cards</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {activeVehicles.length}/{activeGasCards.length}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <HorizontalBars
                title="Fuel spend by vehicle"
                subtitle="All-time spend grouped by fleet unit."
                data={fuelByVehicleChart}
                formatter={formatMoney}
              />
              <HorizontalBars
                title="Fuel spend by gas card"
                subtitle="All-time spend grouped by card."
                data={fuelByCardChart}
                formatter={formatMoney}
              />
            </div>

            <div className="mt-4 rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Monthly fuel spend (last 12 months)</p>
              <div className="mt-3 space-y-2">
                {months.map((month) => (
                  <div key={`fuel-${month.key}`} className="grid grid-cols-[40px_1fr_auto] items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{month.label}</span>
                    <div className="h-2 rounded-full bg-muted/70">
                      <div
                        className="h-2 rounded-full bg-orange-500"
                        style={{ width: `${(month.fuelCents / fuelMonthMax) * 100}%` }}
                        title={`${month.label}: ${formatMoney(month.fuelCents)}`}
                      />
                    </div>
                    <span className="text-muted-foreground">{formatMoney(month.fuelCents)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <HorizontalBars
          title="Jobs by status"
          subtitle="Where work currently sits in the lifecycle."
          data={Array.from(jobsByStatusMap.entries())
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value)}
        />
        <HorizontalBars
          title="Invoice health"
          subtitle="Distribution of invoice states."
          data={invoiceStatusChart}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <HorizontalBars
          title="Lead source mix"
          subtitle="Top channels creating opportunities."
          data={leadSourceChart}
        />
        <HorizontalBars
          title="Crew load"
          subtitle="Job volume per crew assignment."
          data={crewLoadChart}
        />
        <HorizontalBars
          title="Customer concentration"
          subtitle="Top customer cities in your dataset."
          data={topCities}
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Pipeline funnel</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          From early estimate to sold and scheduled work.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">Estimates</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {quotes.filter((q) => q.workflow_stage === "estimate").length.toLocaleString("en-US")}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">Formal quotes</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {quotes.filter((q) => q.workflow_stage === "quote").length.toLocaleString("en-US")}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">Accepted</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{quoteAccepted.toLocaleString("en-US")}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">Converted to jobs</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{quoteConverted.toLocaleString("en-US")}</p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Pipeline value</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{formatMoney(quotePipelineValueCents)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Draft + sent quotes.</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Deposits marked received</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {depositsCaptured.toLocaleString("en-US")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {percentage(depositsCaptured, quotes.length)} of all quotes.
            </p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Lead to job conversion</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {percentage(leadsConverted, leads.length)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {leadsConverted.toLocaleString("en-US")} converted of {leads.length.toLocaleString("en-US")} leads.
            </p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Average invoice value</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{formatMoney(avgInvoiceCents)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Across all generated invoices.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <WeeklyHeatStrip jobs={weekdayJobCounts} events={weekdayEventCounts} />

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Warehouse & operations snapshot</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Inventory footprint and throughput context.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">Materials</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{materials.length.toLocaleString("en-US")}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">Lots</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{lots.length.toLocaleString("en-US")}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">Inventory records</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{inventory.length.toLocaleString("en-US")}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-xs text-muted-foreground">Total quantity on hand</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{formatCompact(inventoryQuantity)}</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Monthly activity volume (jobs / quotes / leads / customers)</p>
            <div className="mt-3 space-y-2">
              {months.map((month) => (
                <div key={`volume-${month.key}`} className="grid grid-cols-[40px_1fr_auto] items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{month.label}</span>
                  <div className="h-2 rounded-full bg-muted/70">
                    <div
                      className="h-2 rounded-full bg-indigo-500"
                      style={{
                        width: `${(Math.max(month.jobs, month.quotes, month.leads, month.customers) / monthVolumeMax) * 100}%`,
                      }}
                      title={`${month.label}: ${month.jobs} jobs, ${month.quotes} quotes, ${month.leads} leads, ${month.customers} customers`}
                    />
                  </div>
                  <span className="text-muted-foreground">
                    {month.jobs}/{month.quotes}/{month.leads}/{month.customers}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {insights.map((insight) => (
          <InsightCard key={insight.title} title={insight.title}>
            {insight.body}
          </InsightCard>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">Quick actions</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Use these pages to act on what the analytics surfaced.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/jobs" className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40">
            Review jobs
          </Link>
          <Link href="/admin/quotes" className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40">
            Follow up quotes
          </Link>
          <Link href="/admin/invoices" className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40">
            Collect invoices
          </Link>
          <Link href="/admin/schedule" className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40">
            Balance schedule
          </Link>
          <Link href="/admin/materials" className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40">
            Manage materials
          </Link>
          <Link href="/admin/reports/gas" className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40">
            Track gas spend
          </Link>
        </div>
      </section>
    </div>
  );
}
