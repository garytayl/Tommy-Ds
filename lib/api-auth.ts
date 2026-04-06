import "server-only";

import { getInstallerOrOfficeSessionOrNull, type OfficeSession } from "@/lib/server-action-guards";
import { isFieldRole } from "@/lib/roles";
import { createClient } from "@supabase/supabase-js";

function extractBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? null;
}

/**
 * Auth helper for API routes that should support:
 * - browser cookie sessions (current web app behavior)
 * - native mobile bearer JWTs (React Native / iOS / Android)
 */
export async function getInstallerOrOfficeApiSessionOrNull(
  request: Request,
): Promise<OfficeSession | null> {
  const bearerToken = extractBearerToken(request);
  if (!bearerToken) {
    return getInstallerOrOfficeSessionOrNull();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${bearerToken}` },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser(bearerToken);
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, role, full_name, phone, onboarding_completed_at, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed_at) return null;
  if (!["admin", "manager"].includes(profile.role) && !isFieldRole(profile.role)) {
    return null;
  }

  return { supabase, profile };
}
