import Link from "next/link";

import { addGasCard, addVehicle, logFuelPurchase } from "@/app/(admin)/admin/reports/gas/actions";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
  station: string | null;
  gallons: number | null;
  total_cents: number | null;
  odometer_miles: number | null;
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

function formatMoney(cents: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(cents / 100);
}

function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);
}

function formatDateTime(value: string | null): string {
  const parsed = safeDate(value);
  if (!parsed) return "Unknown";
  return parsed.toLocaleString();
}

function isMissingRelationError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "42P01") return true;
  return /does not exist/i.test(error.message ?? "");
}

export default async function GasReportPage() {
  const supabase = await createSupabaseServerClientForData();

  const [vehiclesResult, cardsResult, purchasesResult] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id,name,vehicle_type,is_active")
      .order("name", { ascending: true }),
    supabase
      .from("gas_cards")
      .select("id,label,provider,card_last4,assigned_vehicle_id,is_active")
      .order("label", { ascending: true }),
    supabase
      .from("fuel_purchases")
      .select("id,purchased_at,vehicle_id,gas_card_id,station,gallons,total_cents,odometer_miles")
      .order("purchased_at", { ascending: false }),
  ]);

  const tablesMissing = [vehiclesResult.error, cardsResult.error, purchasesResult.error].some((error) =>
    isMissingRelationError(error),
  );

  const vehicles = tablesMissing ? [] : asArray(vehiclesResult.data as VehicleRow[] | null);
  const gasCards = tablesMissing ? [] : asArray(cardsResult.data as GasCardRow[] | null);
  const purchases = tablesMissing ? [] : asArray(purchasesResult.data as FuelPurchaseRow[] | null);

  const queryErrors = [
    { name: "vehicles", error: vehiclesResult.error },
    { name: "gas_cards", error: cardsResult.error },
    { name: "fuel_purchases", error: purchasesResult.error },
  ]
    .filter((item) => Boolean(item.error) && !isMissingRelationError(item.error))
    .map((item) => `${item.name}: ${item.error?.message ?? "Unknown query error"}`);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const vehicleNameById = new Map(
    vehicles.map((vehicle) => [vehicle.id, vehicle.name?.trim() || "Unnamed vehicle"]),
  );
  const cardLabelById = new Map(
    gasCards.map((card) => {
      const fallback = [card.provider?.trim(), card.card_last4 ? `•••• ${card.card_last4}` : undefined]
        .filter(Boolean)
        .join(" ");
      return [card.id, card.label?.trim() || fallback || "Unlabeled card"];
    }),
  );

  const spendByVehicle = new Map<string, number>();
  const spendByCard = new Map<string, number>();

  let totalSpendCents = 0;
  let totalGallons = 0;
  let spend30Cents = 0;
  let gallons30 = 0;

  for (const purchase of purchases) {
    const cents = toNumber(purchase.total_cents);
    const gallons = toNumber(purchase.gallons);
    totalSpendCents += cents;
    totalGallons += gallons;

    const purchasedDate = safeDate(purchase.purchased_at);
    if (purchasedDate && purchasedDate >= thirtyDaysAgo) {
      spend30Cents += cents;
      gallons30 += gallons;
    }

    const vehicleLabel = purchase.vehicle_id
      ? (vehicleNameById.get(purchase.vehicle_id) ?? "Unknown vehicle")
      : "Unassigned vehicle";
    const cardLabel = purchase.gas_card_id
      ? (cardLabelById.get(purchase.gas_card_id) ?? "Unknown card")
      : "No card linked";

    spendByVehicle.set(vehicleLabel, (spendByVehicle.get(vehicleLabel) ?? 0) + cents);
    spendByCard.set(cardLabel, (spendByCard.get(cardLabel) ?? 0) + cents);
  }

  const activeVehicles = vehicles.filter((vehicle) => vehicle.is_active !== false);
  const activeCards = gasCards.filter((card) => card.is_active !== false);
  const avgPricePerGallonCentsAll = totalGallons > 0 ? totalSpendCents / totalGallons : 0;
  const avgPricePerGallonCents30 = gallons30 > 0 ? spend30Cents / gallons30 : 0;

  const topVehicles = Array.from(spendByVehicle.entries())
    .map(([label, cents]) => ({ label, cents }))
    .sort((a, b) => b.cents - a.cents);
  const topCards = Array.from(spendByCard.entries())
    .map(([label, cents]) => ({ label, cents }))
    .sort((a, b) => b.cents - a.cents);

  const maxVehicleSpend = Math.max(1, ...topVehicles.map((item) => item.cents));
  const maxCardSpend = Math.max(1, ...topCards.map((item) => item.cents));

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin reports</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Gas spending</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Dedicated fuel reporting across all trucks, van units, and gas cards.
        </p>
      </header>

      {tablesMissing ? (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">Fuel tables are not available yet.</p>
          <p className="mt-2">
            Apply the latest Supabase migrations to create <code>vehicles</code>, <code>gas_cards</code>, and{" "}
            <code>fuel_purchases</code>, then refresh this page.
          </p>
        </section>
      ) : null}

      {queryErrors.length > 0 ? (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">Some gas report data could not be loaded:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {queryErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {!tablesMissing ? (
        <section className="grid gap-4 xl:grid-cols-3">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm xl:col-span-2">
            <h2 className="text-base font-semibold text-foreground">Log fuel purchase</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Record each fill-up to track spend by vehicle and by gas card.
            </p>
            <form action={logFuelPurchase} className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="vehicle_id" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Vehicle
                </label>
                <select
                  id="vehicle_id"
                  name="vehicle_id"
                  required
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select vehicle
                  </option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.name?.trim() || "Unnamed vehicle"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="gas_card_id" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Gas card
                </label>
                <select
                  id="gas_card_id"
                  name="gas_card_id"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  defaultValue=""
                >
                  <option value="">No card linked</option>
                  {gasCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.label?.trim() || card.provider?.trim() || "Unlabeled card"}
                      {card.card_last4 ? ` (•••• ${card.card_last4})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="purchased_at" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Date and time
                </label>
                <input
                  id="purchased_at"
                  name="purchased_at"
                  type="datetime-local"
                  required
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="station" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Station
                </label>
                <input
                  id="station"
                  name="station"
                  type="text"
                  placeholder="Shell, Speedway, etc."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="gallons" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Gallons
                </label>
                <input
                  id="gallons"
                  name="gallons"
                  type="number"
                  inputMode="decimal"
                  min="0.001"
                  step="0.001"
                  required
                  placeholder="18.402"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="total_dollars" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Total amount ($)
                </label>
                <input
                  id="total_dollars"
                  name="total_dollars"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="64.22"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="odometer_miles" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Odometer miles
                </label>
                <input
                  id="odometer_miles"
                  name="odometer_miles"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  placeholder="128455"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="notes" className="mb-1 block text-xs font-medium text-muted-foreground">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  placeholder="Optional notes"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-95"
                >
                  Save fuel purchase
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-4">
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-base font-semibold text-foreground">Add vehicle</h2>
              <form action={addVehicle} className="mt-4 space-y-3">
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="Truck 1 / Van A"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
                <select
                  name="vehicle_type"
                  defaultValue="truck"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="truck">Truck</option>
                  <option value="van">Van</option>
                  <option value="other">Other</option>
                </select>
                <input
                  name="plate"
                  type="text"
                  placeholder="Plate (optional)"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40"
                >
                  Add vehicle
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-base font-semibold text-foreground">Add gas card</h2>
              <form action={addGasCard} className="mt-4 space-y-3">
                <input
                  name="label"
                  type="text"
                  required
                  placeholder="Fleet Card 1"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  name="provider"
                  type="text"
                  placeholder="WEX, Shell, etc."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  name="card_last4"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  placeholder="Last 4 digits"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                />
                <select
                  name="assigned_vehicle_id"
                  defaultValue=""
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Unassigned</option>
                  {vehicles.map((vehicle) => (
                    <option key={`assign-${vehicle.id}`} value={vehicle.id}>
                      {vehicle.name?.trim() || "Unnamed vehicle"}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40"
                >
                  Add gas card
                </button>
              </form>
            </section>
          </section>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">Fuel spend (30d)</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{formatMoney(spend30Cents)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">Fuel spend (all-time)</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{formatMoney(totalSpendCents)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">Avg / gallon (30d)</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{formatMoney(avgPricePerGallonCents30, 2)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">Transactions</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(purchases.length)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatNumber(gallons30, 1)} gal in last 30d</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <p className="text-xs text-muted-foreground">Active fleet / cards</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {activeVehicles.length}/{activeCards.length}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Avg / gallon all-time: {formatMoney(avgPricePerGallonCentsAll, 2)}</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Spend by vehicle</h2>
          <p className="mt-1 text-xs text-muted-foreground">All-time fuel spend across trucks and vans.</p>
          <div className="mt-4 space-y-3">
            {topVehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fuel purchases yet.</p>
            ) : (
              topVehicles.map((item) => (
                <div key={`vehicle-${item.label}`}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className="text-muted-foreground">{formatMoney(item.cents)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/70">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.max(4, (item.cents / maxVehicleSpend) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Spend by gas card</h2>
          <p className="mt-1 text-xs text-muted-foreground">All-time spend split by card usage.</p>
          <div className="mt-4 space-y-3">
            {topCards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fuel purchases yet.</p>
            ) : (
              topCards.map((item) => (
                <div key={`card-${item.label}`}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span className="text-muted-foreground">{formatMoney(item.cents)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/70">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
                      style={{ width: `${Math.max(4, (item.cents / maxCardSpend) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Recent fuel purchases</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Last {Math.min(50, purchases.length)} transactions, newest first.
            </p>
          </div>
          <Link href="/admin/analytics" className="rounded-xl border border-border px-3 py-2 text-sm font-medium hover:bg-muted/40">
            Back to analytics
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium text-muted-foreground">Date</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Vehicle</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Card</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Station</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Gallons</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Total</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">$/gal</th>
                <th className="px-3 py-2 font-medium text-muted-foreground">Odometer</th>
              </tr>
            </thead>
            <tbody>
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                    No fuel purchase records yet.
                  </td>
                </tr>
              ) : (
                purchases.slice(0, 50).map((purchase) => {
                  const gallons = toNumber(purchase.gallons);
                  const totalCents = toNumber(purchase.total_cents);
                  const centsPerGallon = gallons > 0 ? totalCents / gallons : 0;
                  const vehicleLabel = purchase.vehicle_id
                    ? (vehicleNameById.get(purchase.vehicle_id) ?? "Unknown vehicle")
                    : "Unassigned vehicle";
                  const cardLabel = purchase.gas_card_id
                    ? (cardLabelById.get(purchase.gas_card_id) ?? "Unknown card")
                    : "No card linked";
                  return (
                    <tr key={purchase.id} className="border-b border-border/70">
                      <td className="px-3 py-2 text-muted-foreground">{formatDateTime(purchase.purchased_at)}</td>
                      <td className="px-3 py-2">{vehicleLabel}</td>
                      <td className="px-3 py-2">{cardLabel}</td>
                      <td className="px-3 py-2 text-muted-foreground">{purchase.station?.trim() || "-"}</td>
                      <td className="px-3 py-2">{formatNumber(gallons, 3)}</td>
                      <td className="px-3 py-2 font-medium">{formatMoney(totalCents, 2)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatMoney(centsPerGallon, 2)}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {purchase.odometer_miles ? formatNumber(purchase.odometer_miles) : "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
