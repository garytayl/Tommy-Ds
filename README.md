# Field Service Scheduler MVP

**Field Service Scheduler** is the project name. The business using it is **Tommy D's** (Windows, Doors, & More).

MVP for a local installer business:
- Office/admin dashboard: schedule, jobs, quotes, crews, customers, invoices, locations, lots, materials, scan
- Installer mobile flow (`/m`) for today’s jobs, notes, and photos
- Supabase schema + RLS + invoice recompute helpers

## Stack

- Next.js App Router + TypeScript
- Supabase (Postgres, Auth, RLS, Storage)
- Tailwind CSS

## Required Environment Variables

Copy `.env.example` to `.env.local` and fill in. **You must set `SUPABASE_SERVICE_ROLE_KEY`** (Supabase Dashboard → Project Settings → API → service_role) or the app will show no data (RLS blocks reads when not logged in).

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # required for data to show
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
  api/
lib/
  supabase/, config.ts, money.ts
components/
  InvoiceSummary.tsx, JobStatusBadge.tsx
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
   - Home: `http://localhost:3000`
   - Admin: `http://localhost:3000/admin`
   - Installer: `http://localhost:3000/m`
