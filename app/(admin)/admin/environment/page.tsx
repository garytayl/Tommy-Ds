import { headers } from "next/headers";

import { getCurrentUserAndProfile } from "@/lib/auth";
import { getEnvVariableRows, getRuntimeContext } from "@/lib/env-diagnostics";
import { isOfficeRole } from "@/lib/roles";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function tierLabel(tier: "required" | "recommended" | "optional"): string {
  if (tier === "required") return "Required";
  if (tier === "recommended") return "Recommended";
  return "Optional";
}

async function resolveEffectiveBaseUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const h = await headers();
  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost ?? h.get("host");
  const forwardedProto = h.get("x-forwarded-proto");
  if (host) {
    const proto =
      forwardedProto ??
      (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
    return `${proto}://${host}`.replace(/\/+$/, "");
  }

  const vercelProjectUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProjectUrl) return `https://${vercelProjectUrl.replace(/\/+$/, "")}`;
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}

export default async function EnvironmentPage() {
  const auth = await getCurrentUserAndProfile();
  if (!auth?.profile || !isOfficeRole(auth.profile.role)) {
    redirect("/admin");
  }

  const rows = getEnvVariableRows();
  const runtime = getRuntimeContext();
  const effectiveUrl = await resolveEffectiveBaseUrl();
  const requiredOk = rows.filter((r) => r.tier === "required").every((r) => r.present);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Admin</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Environment</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Secret values are never shown. Set or fix variables in Vercel → your project → Settings →
          Environment Variables (then redeploy), or in <code className="text-foreground">.env.local</code>{" "}
          for local dev.
        </p>
      </div>

      {!requiredOk ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
          A required variable is missing. The app will not work correctly until{" "}
          <code className="rounded bg-amber-500/20 px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-amber-500/20 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> are set.
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
          <h2 className="text-lg font-semibold text-foreground">Configuration keys</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Present = non-empty in this deployment.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="px-4 py-2.5 font-medium text-foreground sm:px-5">Variable</th>
                <th className="px-4 py-2.5 font-medium text-foreground sm:px-5">Role</th>
                <th className="px-4 py-2.5 font-medium text-foreground sm:px-5">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-border/80 last:border-0">
                  <td className="align-top px-4 py-3 font-mono text-xs text-foreground sm:px-5">
                    {row.key}
                    <p className="mt-1 max-w-md font-sans text-xs font-normal text-muted-foreground">
                      {row.description}
                    </p>
                  </td>
                  <td className="align-top px-4 py-3 text-muted-foreground sm:px-5">
                    {tierLabel(row.tier)}
                  </td>
                  <td className="align-top px-4 py-3 sm:px-5">
                    {row.present ? (
                      <span className="inline-flex items-center rounded-md border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-200">
                        Set
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-200">
                        Missing
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
          <h2 className="text-lg font-semibold text-foreground">Runtime</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Where this response was built.</p>
        </div>
        <dl className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">NODE_ENV</dt>
            <dd className="mt-0.5 font-mono text-sm text-foreground">{runtime.nodeEnv ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vercel</dt>
            <dd className="mt-0.5 text-sm text-foreground">{runtime.onVercel ? "Yes" : "No"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">VERCEL_ENV</dt>
            <dd className="mt-0.5 font-mono text-sm text-foreground">{runtime.vercelEnv ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              VERCEL_URL host
            </dt>
            <dd className="mt-0.5 font-mono text-sm text-foreground break-all">
              {runtime.vercelUrlHost ?? "—"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Effective base URL (invites &amp; redirects use this when{" "}
              <code className="text-foreground">NEXT_PUBLIC_APP_URL</code> is unset)
            </dt>
            <dd className="mt-0.5 font-mono text-sm text-foreground break-all">{effectiveUrl}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
