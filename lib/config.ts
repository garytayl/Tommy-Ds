/**
 * Single config source: env vars and feature switches.
 * Keep feature checks centralized so layouts/routes can degrade gracefully.
 */

function env(key: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  return process.env[key];
}

/** Public (client-safe) env. Prefer NEXT_PUBLIC_* for anything exposed to the browser. */
export const publicEnv = {
  supabaseUrl: env("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
} as const;

/** Server-only env. Do not import publicEnv + serverEnv in client components. */
export const serverEnv = {
  supabaseServiceRoleKey: env("SUPABASE_SERVICE_ROLE_KEY"),
} as const;

/**
 * Feature flags derived from env. Use these to gate UI and behavior.
 * Enable a feature by setting the required env vars.
 */
export const features = {
  /** Auth + DB: Supabase URL and anon key set. Required for admin/installer and data. */
  get supabase() {
    return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
  },

  /** Service role for server-only Supabase operations. Optional. */
  get supabaseServiceRole() {
    return Boolean(publicEnv.supabaseUrl && serverEnv.supabaseServiceRoleKey);
  },
} as const;
