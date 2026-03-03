/**
 * Single config source: env vars and feature switches.
 * Add vars here and flip switches when you set them. Build features against
 * config.features.* and turn on by setting the corresponding env.
 */

function env(key: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  return process.env[key];
}

function envBool(key: string): boolean {
  const v = env(key);
  if (v === undefined || v === "") return false;
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
}

/** Public (client-safe) env. Prefer NEXT_PUBLIC_* for anything exposed to the browser. */
export const publicEnv = {
  appUrl: env("NEXT_PUBLIC_APP_URL"),
  supabaseUrl: env("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: env("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
} as const;

/** Server-only env. Do not import publicEnv + serverEnv in client components. */
export const serverEnv = {
  supabaseServiceRoleKey: env("SUPABASE_SERVICE_ROLE_KEY"),
  stripeSecretKey: env("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: env("STRIPE_WEBHOOK_SECRET"),
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

  /** Service role for server-only Supabase (e.g. signed URLs, webhook writes). Optional. */
  get supabaseServiceRole() {
    return Boolean(publicEnv.supabaseUrl && serverEnv.supabaseServiceRoleKey);
  },

  /** Stripe payments: secret key set. Enables "Collect payment" and checkout. */
  get stripe() {
    return Boolean(serverEnv.stripeSecretKey);
  },

  /** Stripe webhook: secret set. Enables payment confirmation and balance updates. */
  get stripeWebhook() {
    return Boolean(serverEnv.stripeWebhookSecret);
  },

  /** Payments fully on: Stripe + webhook. When false, collect payment can still create a session but we won't record completion. */
  get payments() {
    return features.stripe && features.stripeWebhook;
  },
} as const;

/**
 * App URL for redirects (Stripe success/cancel, etc.). Prefer request origin in API routes when available.
 */
export function getAppUrl(fallbackOrigin?: string): string {
  return publicEnv.appUrl || fallbackOrigin || "http://localhost:3000";
}
