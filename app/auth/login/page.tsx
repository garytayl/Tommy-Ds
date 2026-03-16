"use client";

import { createClient } from "@/lib/supabase/client";
import { withRetry } from "@/lib/retry";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setRetrying(false);
    setLoading(true);
    const supabase = createClient();
    try {
      const { data, error: signInError } = await withRetry(
        () => supabase.auth.signInWithPassword({ email, password }),
        {
          attempts: 3,
          delayMs: 1500,
          onRetry: () => setRetrying(true),
        }
      );
      if (signInError) {
        setError(signInError.message);
        return;
      }
      if (!data.user) {
        setError("Sign-in failed. Please try again.");
        return;
      }
      // Redirect immediately; server will check profile and redirect back if no access
      if (next.startsWith("/m")) {
        router.replace("/m");
      } else {
        router.replace(next);
      }
    } catch (e) {
      setError(
        "Connection problem. Check your network and try again, or wait a moment and retry."
      );
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="animate-card-in w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/5 transition-shadow duration-300 hover:shadow-xl">
        <h1 className="text-xl font-semibold text-foreground">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tommy D&apos;s — access by role only
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              required
            />
          </div>
          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? (retrying ? "Connection issue, retrying…" : "Signing in…") : "Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/" className="underline hover:text-foreground">
            Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
