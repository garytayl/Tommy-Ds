import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileRole = "admin" | "installer" | "manager";

export interface Profile {
  user_id: string;
  role: ProfileRole;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email?: string;
}

export type CurrentUserResult =
  | { user: AuthUser; profile: Profile }
  | null;

/**
 * Returns the current session user and their profile, or null if not signed in
 * or profile is missing. Use in server components/layouts to gate access and
 * redirect by role.
 */
export async function getCurrentUserAndProfile(): Promise<CurrentUserResult> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_id, role, full_name, phone, created_at")
    .eq("user_id", user.id)
    .single();

  if (error || !profile) return null;

  return {
    user: { id: user.id, email: user.email ?? undefined },
    profile: profile as Profile,
  };
}
