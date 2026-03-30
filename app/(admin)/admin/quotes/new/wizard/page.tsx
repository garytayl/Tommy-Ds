import { redirect } from "next/navigation";

/** Old URL: /admin/quotes/new/wizard — new estimate is now at /admin/quotes/new */
export default async function LegacyWizardRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<{ customer_id?: string; template?: string; wstep?: string }>;
}) {
  const resolvedSearch = (await searchParams) ?? {};
  const q = new URLSearchParams();
  const cid = resolvedSearch.customer_id?.trim();
  const tpl = resolvedSearch.template?.trim();
  const wstep = resolvedSearch.wstep?.trim();
  if (cid) q.set("customer_id", cid);
  if (tpl) q.set("template", tpl);
  if (wstep) q.set("wstep", wstep);
  const s = q.toString();
  redirect(s ? `/admin/quotes/new?${s}` : "/admin/quotes/new");
}
