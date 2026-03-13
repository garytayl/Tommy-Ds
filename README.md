# Field Service Scheduler MVP

**Field Service Scheduler** is the project name. The business using it is **Tommy D's** (Windows, Doors, & More); that name appears in customer-facing copy (receipts, payments, etc.).

MVP for a local installer business:
- Office/admin dashboard: schedule, jobs, quotes, crews, customers, invoices, locations, lots, materials, scan
- Installer mobile flow (`/m`) for today’s jobs, notes, photos, and payment collection
- **Customer payment:** Public **Pay your invoice** (`/pay`) — enter invoice number to look up and pay by card; or use the link from your bill. Receipt page shows “Pay remaining balance” when balance is due. Card payments are for invoices only (no generic “pay your bill” without an invoice).
- Stripe Checkout payment-link flow + webhook reconciliation
- Supabase schema + RLS + invoice recompute helpers

## Stack

- Next.js App Router + TypeScript
- Supabase (Postgres, Auth, RLS, Storage)
- Stripe (Checkout Sessions + webhooks)
- Tailwind CSS

## Required Environment Variables

Copy `.env.example` to `.env.local` and fill in. **You must set `SUPABASE_SERVICE_ROLE_KEY`** (Supabase Dashboard → Project Settings → API → service_role) or the app will show no data (RLS blocks reads when not logged in).

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # required for data to show

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Key File Tree

```txt
app/
  (admin)/
    admin/
      layout.tsx, page.tsx
      schedule/page.tsx, jobs/, quotes/, crews/, customers/, invoices/
      locations/, lots/, materials/, scan/, future-features/
  (installer)/m/
    layout.tsx, page.tsx, jobs/[id]/page.tsx
  pay/page.tsx              # Public: pay your invoice (lookup + card)
  receipt/[invoiceId]/page.tsx
  payment/thank-you/page.tsx
  api/
    checkout/create/route.ts
    invoices/lookup/route.ts   # GET ?id= — public invoice lookup for /pay
    stripe/webhook/route.ts
lib/
  supabase/, config.ts, money.ts, stripe.ts
components/
  InvoiceSummary.tsx, JobStatusBadge.tsx, CollectPaymentButton.tsx
  PayWithCardButton.tsx       # Used on /pay and receipt when balance due
supabase/
  migrations/
    20260302141000_mvp_schema.sql
    20260302150000_enforce_job_update_permissions.sql
    20260310120000_locations_materials_job_supplies.sql
    20260310140000_crews.sql
    20260310160000_quotes.sql
    20260310170000_lots_inventory_barcodes.sql
```

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Apply SQL migrations in Supabase (in order):
   - All files in `supabase/migrations/` (mvp_schema first, then the rest by timestamp)

3. **(Optional)** Seed placeholder data (customers, jobs, invoices):
   - From the project root (with `.env.local` containing `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`):  
     `npm run db:seed`
   - Or open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**, paste and run the contents of `supabase/seed.sql`.
   - Adds 10 customers, 15 jobs, invoices with line items, and a few payments so the app has data to show.

4. Run app:

   ```bash
   npm run dev
   ```

5. Open:
   - Home: `http://localhost:3000` (includes “Pay your bill” and links to /pay)
   - Pay invoice (customers): `http://localhost:3000/pay`
   - Admin: `http://localhost:3000/admin`
   - Installer: `http://localhost:3000/m`

## Stripe Webhook (Local)

Forward Stripe events to local webhook route:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the resulting signing secret as `STRIPE_WEBHOOK_SECRET`.
