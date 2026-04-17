import type { PostgrestError } from "@supabase/supabase-js";

import { isRetryableNetworkError } from "@/lib/retry";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** True for flaky browser fetch / Supabase gateway errors worth retrying. */
export function isTransientPostgrestError(error: PostgrestError | null | undefined): boolean {
  if (!error) return false;
  if (isRetryableNetworkError(new Error(error.message))) return true;
  const m = (error.message || "").toLowerCase();
  if (m.includes("load failed") || m.includes("failed to fetch") || m.includes("network")) return true;
  if (m.includes("timeout") || m.includes("econnreset") || m.includes("socket")) return true;
  const code = error.code || "";
  if (code === "PGRST301" || code.startsWith("08")) return true;
  return false;
}

/** User-facing copy after retries are exhausted. */
export function humanizeDbError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("load failed") || m.includes("failed to fetch") || m.includes("network")) {
    return "Connection dropped—check signal and tap Save again.";
  }
  if (m.includes("jwt") || m.includes("session")) {
    return "Session expired—sign in again from the menu.";
  }
  return message;
}

type PgResult<T> = { data: T; error: PostgrestError | null };

/**
 * Re-run a PostgREST call when the error looks transient (common on mobile Safari / spotty Wi‑Fi).
 */
export async function runPostgrestWithRetry<T>(
  /** Supabase query builders are `PromiseLike`, not `Promise`, in typings. */
  fn: () => PromiseLike<PgResult<T>>,
  options: { attempts?: number; baseDelayMs?: number } = {},
): Promise<PgResult<T>> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 350;
  let last: PgResult<T> | undefined;
  for (let i = 0; i < attempts; i++) {
    last = await Promise.resolve(fn());
    if (!last.error) return last;
    if (!isTransientPostgrestError(last.error) || i === attempts - 1) return last;
    await sleep(baseDelayMs * (i + 1));
  }
  return last!;
}
