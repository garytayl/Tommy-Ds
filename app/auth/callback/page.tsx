"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";

function normalizeNextPath(rawNext: string | null): string {
  if (!rawNext) return "/auth/onboarding";
  const next = rawNext.trim();
  if (!next.startsWith("/") || next.startsWith("//")) return "/auth/onboarding";
  if (next.startsWith("/auth/login")) return "/auth/onboarding";
  return next;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  const nextPath = useMemo(
    () => normalizeNextPath(searchParams.get("next")),
    [searchParams],
  );

  useEffect(() => {
    let active = true;

    async function completeAuth() {
      try {
        const supabase = createClient();
        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type") as EmailOtpType | null;

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash: tokenHash,
          });
          if (error) throw error;
        } else if (typeof window !== "undefined" && window.location.hash.includes("access_token=")) {
          const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          const accessToken = hash.get("access_token");
          const refreshToken = hash.get("refresh_token");
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          router.replace(`/auth/login?next=${encodeURIComponent(nextPath)}`);
          return;
        }
        router.replace(nextPath);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Unable to complete sign-in.");
      }
    }

    void completeAuth();
    return () => {
      active = false;
    };
  }, [nextPath, router, searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-lg shadow-black/5">
        <h1 className="text-xl font-semibold text-foreground">Finishing sign-in…</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;re validating your invite and preparing your account.
        </p>
        {error ? (
          <div className="mt-4 space-y-3">
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
            <Link href={`/auth/login?next=${encodeURIComponent(nextPath)}`} className="btn-secondary inline-flex">
              Go to sign in
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
