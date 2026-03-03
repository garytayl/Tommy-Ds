# Field Service Scheduler MVP

MVP for a local installer business:
- Office/admin dashboard (customers, jobs, invoices)
- Installer mobile flow (`/m`) for today’s jobs, notes, photos, and payment collection
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
      layout.tsx
      page.tsx
      customers/page.tsx
      customers/[id]/page.tsx
      jobs/page.tsx
      jobs/[id]/page.tsx
      invoices/[id]/page.tsx
  (installer)/
    m/
      layout.tsx
      page.tsx
      jobs/[id]/page.tsx
  api/
    checkout/create/route.ts
    stripe/webhook/route.ts
lib/
  supabase/
    client.ts
    server.ts
    service.ts
  stripe.ts
  money.ts
components/
  InvoiceSummary.tsx
  JobStatusBadge.tsx
  CollectPaymentButton.tsx
supabase/
  migrations/
    20260302141000_mvp_schema.sql
```

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Apply SQL migration in Supabase:
   - `supabase/migrations/20260302141000_mvp_schema.sql`

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
   - Admin: `http://localhost:3000/admin`
   - Installer: `http://localhost:3000/m`

## Stripe Webhook (Local)

Forward Stripe events to local webhook route:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the resulting signing secret as `STRIPE_WEBHOOK_SECRET`.
