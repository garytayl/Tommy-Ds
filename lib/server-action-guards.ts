import { getCurrentUserAndProfile } from "@/lib/auth";
import type { Profile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Shown when a server action is invoked without an allowed office/field session. */
export const UNAUTHORIZED_TOAST = "You don’t have permission to do that.";

export type OfficeSession = { supabase: SupabaseClient; profile: Profile };

/**
 * Admin or manager with completed onboarding — use for estimates, schedule, office job tools.
 */
export async function getOfficeSessionOrNull(): Promise<OfficeSession | null> {
  const auth = await getCurrentUserAndProfile();
  if (!auth?.profile?.onboarding_completed_at) return null;
  if (!["admin", "manager"].includes(auth.profile.role)) return null;
  const supabase = await createSupabaseServerClient();
  return { supabase, profile: auth.profile };
}

/**
 * Installer, admin, or manager with completed onboarding — use for /m job actions and shared field flows.
 */
export async function getInstallerOrOfficeSessionOrNull(): Promise<OfficeSession | null> {
  const auth = await getCurrentUserAndProfile();
  if (!auth?.profile?.onboarding_completed_at) return null;
  if (!["admin", "manager", "installer"].includes(auth.profile.role)) return null;
  const supabase = await createSupabaseServerClient();
  return { supabase, profile: auth.profile };
}

/**
 * Admin only — team invites and auth.admin operations already pair with explicit checks.
 */
export async function getAdminSessionOrNull(): Promise<OfficeSession | null> {
  const auth = await getCurrentUserAndProfile();
  if (!auth?.profile?.onboarding_completed_at) return null;
  if (auth.profile.role !== "admin") return null;
  const supabase = await createSupabaseServerClient();
  return { supabase, profile: auth.profile };
}
