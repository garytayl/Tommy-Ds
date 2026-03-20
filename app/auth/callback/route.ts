import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

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
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const nextRaw = url.searchParams.get("next");
  let nextPath = normalizeNextPath(nextRaw);

  if (type === "invite") {
    // Invite links should always land in onboarding first.
    nextPath = "/auth/onboarding";
  }

  let authErrorMessage: string | null = null;
  if (code || (tokenHash && type)) {
    const supabase = await createSupabaseServerClient();
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) authErrorMessage = error.message;
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as EmailOtpType,
      });
      if (error) authErrorMessage = error.message;
    }
  }

  if (authErrorMessage) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", "/auth/onboarding");
    loginUrl.searchParams.set("error", authErrorMessage);
    return NextResponse.redirect(loginUrl, { status: 302 });
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = nextPath;
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl, { status: 302 });
}
