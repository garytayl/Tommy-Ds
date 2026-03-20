-- Track whether a user finished first-run onboarding.
-- Backfill existing users so only newly invited/created users are prompted.

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

update public.profiles
set onboarding_completed_at = coalesce(onboarding_completed_at, created_at, now())
where onboarding_completed_at is null;
