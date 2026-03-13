import Link from "next/link";

import { createSupabaseServerClientForData } from "@/lib/supabase/server";
import { SearchForm } from "./SearchForm";

function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  let customers: { id: string; name: string }[] = [];
  let jobs: {
    id: string;
    title: string;
    address_line1: string;
    city: string;
    state: string;
    zip: string;
    status: string;
    customers: { name: string } | { name: string }[] | null;
  }[] = [];

  if (query.length >= 1) {
    const supabase = await createSupabaseServerClientForData();
    const pattern = `%${escapeLike(query)}%`;
    const quoted = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const orClause = `title.ilike.${quoted(pattern)},address_line1.ilike.${quoted(pattern)},city.ilike.${quoted(pattern)},zip.ilike.${quoted(pattern)}`;

    const [custRes, jobsRes] = await Promise.all([
      supabase
        .from("customers")
        .select("id,name")
        .ilike("name", pattern)
        .order("name", { ascending: true })
        .limit(20),
      supabase
        .from("jobs")
        .select("id,title,address_line1,city,state,zip,status,customers(name)")
        .or(orClause)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    customers = (custRes.data ?? []) as typeof customers;
    jobs = (jobsRes.data ?? []) as typeof jobs;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Search
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find customers, jobs, or addresses by name or location.
        </p>
      </div>

      <SearchForm initialValue={query} />

      {query.length >= 1 && (
        <section className="space-y-6">
          {customers.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Customers
              </h2>
              <ul className="space-y-1 rounded-xl border border-white/10 bg-white/5 py-2 backdrop-blur-sm">
                {customers.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="block px-4 py-2 text-sm text-foreground hover:bg-white/10"
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {jobs.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Jobs
              </h2>
              <ul className="space-y-1 rounded-xl border border-white/10 bg-white/5 py-2 backdrop-blur-sm">
                {jobs.map((j) => {
                  const customerName = Array.isArray(j.customers)
                    ? j.customers[0]?.name
                    : j.customers?.name;
                  const address = [j.address_line1, j.city, j.state, j.zip]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <li key={j.id}>
                      <Link
                        href={`/jobs/${j.id}`}
                        className="block px-4 py-2 text-sm text-foreground hover:bg-white/10"
                      >
                        <span className="font-medium">{j.title}</span>
                        {customerName && (
                          <span className="text-muted-foreground">
                            {" "}
                            — {customerName}
                          </span>
                        )}
                        {address && (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {address}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {query.length >= 1 && customers.length === 0 && jobs.length === 0 && (
            <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-muted-foreground backdrop-blur-sm">
              No customers or jobs match &quot;{query}&quot;.
            </p>
          )}
        </section>
      )}

      {query.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Enter a name, address, city, or zip above to search.
        </p>
      )}
    </div>
  );
}
