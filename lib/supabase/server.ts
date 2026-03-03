import { createServerClient } from "@supabase/ssr";
import { type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components may attempt writes during render.
          // Middleware should handle session refresh writes.
        }
      },
    },
  });
}

/**
 * Use for server-side data (jobs, customers, invoices, etc.). When
 * SUPABASE_SERVICE_ROLE_KEY is set, uses the service client so existing DB data
 * is visible and new records persist without requiring auth (good for PoC/internal).
 * Otherwise uses the session-based client (RLS applies; user must be admin/manager).
 */
export async function createSupabaseServerClientForData(): Promise<SupabaseClient> {
  if (typeof process !== "undefined" && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createSupabaseServiceClient();
  }
  return createSupabaseServerClient();
}
