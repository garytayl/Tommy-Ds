import { redirect } from "next/navigation";

import { getCurrentUserAndProfile, type ProfileRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { setToastCookie } from "@/lib/toast";

export const dynamic = "force-dynamic";

function defaultRouteFor(role: ProfileRole): string {
  return role === "installer" ? "/m" : "/admin";
}

function normalizeNextPath(rawNext: string | null, role: ProfileRole): string {
  if (!rawNext) return defaultRouteFor(role);
  const next = rawNext.trim();
  if (!next.startsWith("/") || next.startsWith("//")) return defaultRouteFor(role);
  if (next.startsWith("/auth/")) return defaultRouteFor(role);
  if (role === "installer") {
    return next.startsWith("/m") ? next : "/m";
  }
  if (next.startsWith("/admin") || next.startsWith("/jobs/")) return next;
  return "/admin";
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const auth = await getCurrentUserAndProfile();
  if (!auth) {
    redirect("/auth/login?next=/auth/onboarding");
  }

  const { next: nextParam } = await searchParams;
  if (!auth.profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-center shadow-lg shadow-black/5">
          <h1 className="text-xl font-semibold text-foreground">Account not ready yet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your sign-in worked, but your profile/role hasn&apos;t been provisioned yet.
            Ask an admin to invite you again or assign your role in Team.
          </p>
          <form action="/auth/logout" method="post" className="mt-4">
            <button type="submit" className="btn-secondary">Sign out</button>
          </form>
        </div>
      </div>
    );
  }
  const nextPath = normalizeNextPath(nextParam ?? null, auth.profile.role);
  if (auth.profile.onboarding_completed_at) {
    redirect(nextPath);
  }

  async function completeOnboarding(formData: FormData) {
    "use server";
    const auth = await getCurrentUserAndProfile();
    if (!auth) {
      redirect("/auth/login?next=/auth/onboarding");
    }
    if (!auth.profile) {
      await setToastCookie("Your profile is not set up yet. Ask an admin for access.");
      redirect("/auth/login");
    }

    const fullName = String(formData.get("full_name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");
    const nextRaw = String(formData.get("next") ?? "");
    const nextPath = normalizeNextPath(nextRaw || null, auth.profile.role);

    if (!fullName) {
      await setToastCookie("Please enter your full name.");
      redirect(`/auth/onboarding?next=${encodeURIComponent(nextPath)}`);
    }
    if (password.length < 8) {
      await setToastCookie("Password must be at least 8 characters.");
      redirect(`/auth/onboarding?next=${encodeURIComponent(nextPath)}`);
    }
    if (password !== confirmPassword) {
      await setToastCookie("Passwords do not match.");
      redirect(`/auth/onboarding?next=${encodeURIComponent(nextPath)}`);
    }

    try {
      const sessionClient = await createSupabaseServerClient();
      const { error: userError } = await sessionClient.auth.updateUser({
        password,
        data: { full_name: fullName, onboarding_completed: true },
      });
      if (userError) {
        await setToastCookie(userError.message);
        redirect(`/auth/onboarding?next=${encodeURIComponent(nextPath)}`);
      }

      const serviceClient = createSupabaseServiceClient();
      const { error: profileError } = await serviceClient
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone || null,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("user_id", auth.user.id);
      if (profileError) {
        await setToastCookie(profileError.message);
        redirect(`/auth/onboarding?next=${encodeURIComponent(nextPath)}`);
      }
    } catch (e) {
      await setToastCookie(e instanceof Error ? e.message : "Unable to complete onboarding.");
      redirect(`/auth/onboarding?next=${encodeURIComponent(nextPath)}`);
    }

    await setToastCookie("Welcome! Your account is ready.");
    redirect(nextPath);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="animate-card-in w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-lg shadow-black/5 transition-shadow duration-300 hover:shadow-xl">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Welcome</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Finish setting up your account
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          One quick step so your account is secure and ready. Your role is{" "}
          <span className="font-medium capitalize text-foreground">{auth.profile.role}</span>.
        </p>

        <form action={completeOnboarding} className="mt-6 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="next" value={nextPath} />
          <div className="sm:col-span-2">
            <label htmlFor="onboarding-full-name" className="form-label">
              Full name
            </label>
            <input
              id="onboarding-full-name"
              name="full_name"
              type="text"
              required
              defaultValue={auth.profile.full_name ?? ""}
              className="field"
              placeholder="Jane Smith"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="onboarding-phone" className="form-label">
              Phone (optional)
            </label>
            <input
              id="onboarding-phone"
              name="phone"
              type="tel"
              defaultValue={auth.profile.phone ?? ""}
              className="field"
              placeholder="(555) 123-4567"
            />
          </div>
          <div>
            <label htmlFor="onboarding-password" className="form-label">
              New password
            </label>
            <input
              id="onboarding-password"
              name="password"
              type="password"
              required
              minLength={8}
              className="field"
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label htmlFor="onboarding-confirm-password" className="form-label">
              Confirm password
            </label>
            <input
              id="onboarding-confirm-password"
              name="confirm_password"
              type="password"
              required
              minLength={8}
              className="field"
              autoComplete="new-password"
              placeholder="Re-enter password"
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary w-full">
              Complete setup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
