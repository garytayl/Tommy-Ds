/**
 * Server-only: which env keys exist (never log or expose values).
 */

function present(key: string): boolean {
  const v = process.env[key];
  return typeof v === "string" && v.trim().length > 0;
}

export type EnvVarTier = "required" | "recommended" | "optional";

export type EnvVarRow = {
  key: string;
  description: string;
  tier: EnvVarTier;
  present: boolean;
};

/** Variables the app reads; booleans only. */
export function getEnvVariableRows(): EnvVarRow[] {
  const rows: EnvVarRow[] = [
    {
      key: "NEXT_PUBLIC_SUPABASE_URL",
      description: "Supabase API URL (browser + server).",
      tier: "required",
      present: present("NEXT_PUBLIC_SUPABASE_URL"),
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      description: "Supabase anon key; RLS applies.",
      tier: "required",
      present: present("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    },
    {
      key: "SUPABASE_SERVICE_ROLE_KEY",
      description: "Service role (Admin → Team invites, seed scripts, server admin APIs).",
      tier: "optional",
      present: present("SUPABASE_SERVICE_ROLE_KEY"),
    },
    {
      key: "NEXT_PUBLIC_APP_URL",
      description: "Public site URL for invite links, Stripe callbacks, and stable production URLs.",
      tier: "recommended",
      present: present("NEXT_PUBLIC_APP_URL"),
    },
    {
      key: "STRIPE_SECRET_KEY",
      description: "Stripe payments (Admin billings, isolated payment links).",
      tier: "optional",
      present: present("STRIPE_SECRET_KEY"),
    },
    {
      key: "STRIPE_WEBHOOK_SECRET",
      description: "Stripe webhook signature verification (/api/stripe/webhook).",
      tier: "optional",
      present: present("STRIPE_WEBHOOK_SECRET"),
    },
    {
      key: "NEXT_PUBLIC_DEV_HINTS",
      description: "Dev-only UI hints (set to true locally; not used in production).",
      tier: "optional",
      present: present("NEXT_PUBLIC_DEV_HINTS"),
    },
  ];
  return rows;
}

export type RuntimeContext = {
  nodeEnv: string | undefined;
  onVercel: boolean;
  vercelEnv: string | undefined;
  /** Non-secret: helps confirm preview vs production hostname. */
  vercelUrlHost: string | undefined;
};

export function getRuntimeContext(): RuntimeContext {
  const raw = process.env.VERCEL_URL?.trim();
  let vercelUrlHost: string | undefined;
  if (raw) {
    try {
      const u = raw.startsWith("http") ? new URL(raw) : new URL(`https://${raw}`);
      vercelUrlHost = u.host;
    } catch {
      vercelUrlHost = raw.replace(/^https?:\/\//, "").split("/")[0];
    }
  }
  return {
    nodeEnv: process.env.NODE_ENV,
    onVercel: present("VERCEL"),
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrlHost,
  };
}
