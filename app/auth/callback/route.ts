import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function normalizeNextPath(rawNext: string | null): string {
  if (!rawNext) return "/auth/onboarding";
  const next = rawNext.trim();
  if (!next.startsWith("/") || next.startsWith("//")) return "/auth/onboarding";
  if (next.startsWith("/auth/login")) return "/auth/onboarding";
  return next;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next");
  const nextPath = normalizeNextPath(nextRaw);

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = nextPath;
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl, { status: 302 });
}
