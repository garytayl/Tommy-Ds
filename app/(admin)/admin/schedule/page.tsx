import Link from "next/link";
import { revalidatePath } from "next/cache";

import { setToastCookie } from "@/lib/toast";

import { getCrewDisplayName } from "@/lib/crews";
import { ScheduleCalendar } from "@/components/ScheduleCalendar";
import { ScheduleControls } from "@/components/ScheduleControls";
import { ScheduleDragDrop, type ScheduleJob } from "@/components/ScheduleDragDrop";
import { ScheduleMobileWeekRedirect } from "@/components/ScheduleMobileWeekRedirect";
import { ScheduleScrollToToday } from "@/components/ScheduleScrollToToday";
import { ScheduleTodayStrip } from "@/components/ScheduleTodayStrip";
import { ScheduleUnscheduledBlock } from "@/components/ScheduleUnscheduledBlock";
import { createSupabaseServerClientForData } from "@/lib/supabase/server";

const DAYS_AHEAD = 90;
const DAYS_PAST = 7;

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; week?: string; layout?: string }>;
}) {
  const { view: viewParam, week: weekParam, layout: layoutParam } = await searchParams;
  const view = viewParam ?? "all";
  const viewCrewId = view.startsWith("crew:") ? view.slice(5) : null;
  const viewPersonId = view.startsWith("person:") ? view.slice(7) : null;
  const isWeekView = layoutParam === "week";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = weekParam
    ? new Date(weekParam + "T12:00:00")
    : (() => {
        const d = new Date(today);
        d.setDate(d.getDate() - d.getDay());
        return d;
      })();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);

  const supabase = await createSupabaseServerClientForData();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - DAYS_PAST);
  const end = new Date(start);
  end.setDate(end.getDate() + DAYS_PAST + DAYS_AHEAD);

  const [
    { data: jobs },
    { data: unscheduledJobs },
    { data: activitiesInRange },
    { data: crews },
    { data: installers },
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id,title,status,scheduled_start,scheduled_end,assigned_installer_id,assigned_crew_id,customers(name),profiles(full_name),crews(name,specialty),invoices(id,invoice_number,balance_due_cents)",
      )
      .gte("scheduled_start", start.toISOString())
      .lt("scheduled_start", end.toISOString())
      .order("scheduled_start", { ascending: true, nullsFirst: false }),
    supabase
      .from("jobs")
      .select("id,title,status,customers(name),assigned_installer_id,assigned_crew_id")
      .is("scheduled_start", null)
      .in("status", ["lead", "consultation_scheduled", "measured", "quote_sent", "approved", "scheduled"])
      .order("title", { ascending: true }),
    supabase
      .from("activities")
      .select("id,job_id,type,title,scheduled_date,status")
      .gte("scheduled_date", start.toISOString())
      .lt("scheduled_date", end.toISOString())
      .not("scheduled_date", "is", null)
      .order("scheduled_date", { ascending: true }),
    supabase
      .from("crews")
      .select("id,name,specialty,crew_members(user_id,profiles(user_id,full_name))")
      .order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("user_id,full_name")
      .eq("role", "installer")
      .order("full_name", { ascending: true }),
  ]);

  type JobRow = {
    id: string;
    title: string;
    status: string;
    scheduled_start: string | null;
    scheduled_end: string | null;
    assigned_installer_id: string | null;
    assigned_crew_id: string | null;
    customers: { name: string } | { name: string }[] | null;
    profiles: { full_name: string | null } | { full_name: string | null }[] | null;
    crews: { name: string; specialty: string } | { name: string; specialty: string }[] | null;
    invoices: { id: string; invoice_number: number; balance_due_cents: number }[] | { id: string; invoice_number: number; balance_due_cents: number } | null;
  };

  const allRows = (jobs ?? []) as JobRow[];

  const crewIdsForPerson = new Set<string>();
  if (viewPersonId && crews) {
    for (const crew of crews) {
      const members = (crew.crew_members ?? []) as { user_id: string }[];
      if (members.some((m) => m.user_id === viewPersonId)) crewIdsForPerson.add(crew.id);
    }
  }

  const rows = allRows.filter((job) => {
    if (viewCrewId) return job.assigned_crew_id === viewCrewId;
    if (viewPersonId) {
      if (job.assigned_installer_id === viewPersonId) return true;
      if (job.assigned_crew_id && crewIdsForPerson.has(job.assigned_crew_id)) return true;
      return false;
    }
    return true;
  });

  const unscheduledRows = (unscheduledJobs ?? []).filter((job: { assigned_crew_id: string | null; assigned_installer_id: string | null }) => {
    if (viewCrewId) return job.assigned_crew_id === viewCrewId;
    if (viewPersonId) {
      if (job.assigned_installer_id === viewPersonId) return true;
      if (job.assigned_crew_id && crewIdsForPerson.has(job.assigned_crew_id)) return true;
      return false;
    }
    return true;
  });

  const byDate: Record<string, JobRow[]> = {};
  const jobsByDateCount: Record<string, number> = {};
  type CalendarItem = { id: string; title: string; type: "job" | "activity"; href: string };
  const itemsByDate: Record<string, CalendarItem[]> = {};
  for (let d = 0; d < DAYS_PAST + DAYS_AHEAD; d++) {
    const date = new Date(start);
    date.setDate(date.getDate() + d);
    const key = date.toISOString().slice(0, 10);
    byDate[key] = [];
    jobsByDateCount[key] = 0;
    itemsByDate[key] = [];
  }
  for (const job of rows) {
    if (!job.scheduled_start) continue;
    const key = job.scheduled_start.slice(0, 10);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(job);
    jobsByDateCount[key] = (jobsByDateCount[key] ?? 0) + 1;
    if (itemsByDate[key]) itemsByDate[key].push({ id: job.id, title: job.title, type: "job", href: `/admin/jobs/${job.id}` });
  }
  const rowIds = new Set(rows.map((r) => r.id));
  for (const act of activitiesInRange ?? []) {
    const a = act as { id: string; job_id: string; type: string; title: string | null; scheduled_date: string };
    if (!a.scheduled_date || !rowIds.has(a.job_id)) continue;
    const key = a.scheduled_date.slice(0, 10);
    if (byDate[key] !== undefined) jobsByDateCount[key] = (jobsByDateCount[key] ?? 0) + 1;
    const title = (a.title || a.type || "Activity").trim() || "Activity";
    if (itemsByDate[key]) itemsByDate[key].push({ id: a.id, title, type: "activity", href: `/admin/jobs/${a.job_id}` });
  }

  const startDateStr = start.toISOString().slice(0, 10);
  const endDateStr = end.toISOString().slice(0, 10);
  let sortedDates = Object.keys(byDate).sort();
  if (isWeekView) {
    sortedDates = sortedDates.filter((d) => d >= weekStartStr && d < weekEndStr);
  }

  async function rescheduleJob(jobId: string, newStartIso: string) {
    "use server";
    const supabase = await createSupabaseServerClientForData();
    const { data: job } = await supabase
      .from("jobs")
      .select("scheduled_start,scheduled_end")
      .eq("id", jobId)
      .maybeSingle();
    if (!job) return;
    let newEnd: string | null = null;
    if (job.scheduled_start && job.scheduled_end) {
      const startMs = new Date(job.scheduled_start).getTime();
      const endMs = new Date(job.scheduled_end).getTime();
      const durationMs = endMs - startMs;
      newEnd = new Date(new Date(newStartIso).getTime() + durationMs).toISOString();
    }
    await supabase
      .from("jobs")
      .update({
        scheduled_start: newStartIso,
        ...(newEnd && { scheduled_end: newEnd }),
      })
      .eq("id", jobId);
    await setToastCookie("Schedule updated");
    revalidatePath("/admin/schedule");
    revalidatePath("/admin/jobs");
    revalidatePath("/m");
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <ScheduleMobileWeekRedirect hasLayoutParam={layoutParam !== undefined} />
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Admin
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Schedule
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View by crew or person to see everyone&apos;s schedule. Drag jobs between days to reschedule. Tap a date to jump to that day.
        </p>
      </div>

      <ScheduleControls
        view={view}
        isWeekView={isWeekView}
        weekStartStr={weekStartStr}
        weekEndStr={weekEndStr}
        crews={(crews ?? []).map((c) => ({ id: c.id, name: getCrewDisplayName({ name: c.name, crew_members: c.crew_members }), specialty: c.specialty }))}
        installers={installers ?? []}
        viewCrewId={viewCrewId}
        viewPersonId={viewPersonId}
      />

      <div className="flex flex-wrap gap-2 sm:gap-3">
        <Link
          href="/admin/jobs#create"
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-95 touch-manipulation"
        >
          New job
        </Link>
        <Link
          href="/admin/jobs"
          className="inline-flex items-center rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted touch-manipulation"
        >
          All jobs
        </Link>
      </div>

      <ScheduleUnscheduledBlock jobs={unscheduledRows} />

      <ScheduleTodayStrip
        todayDateKey={today.toISOString().slice(0, 10)}
        jobs={(byDate[today.toISOString().slice(0, 10)] ?? []) as ScheduleJob[]}
      />

      <ScheduleCalendar
        jobsByDate={jobsByDateCount}
        itemsByDate={itemsByDate}
        startDate={startDateStr}
        endDate={endDateStr}
        visibleStart={isWeekView ? weekStartStr : undefined}
        visibleEnd={isWeekView ? weekEndStr : undefined}
        weekNavigation={
          isWeekView
            ? (() => {
                const prev = new Date(weekStart);
                prev.setDate(prev.getDate() - 7);
                const prevStr = prev.toISOString().slice(0, 10);
                const base = view === "all" ? "/admin/schedule?layout=week&week=" : `/admin/schedule?view=${encodeURIComponent(view)}&layout=week&week=`;
                return { prevUrl: base + prevStr, nextUrl: base + weekEndStr };
              })()
            : undefined
        }
      />

      <ScheduleScrollToToday todayDateKey={today.toISOString().slice(0, 10)} />
      <ScheduleDragDrop
        jobsByDate={byDate as Record<string, ScheduleJob[]>}
        sortedDates={sortedDates}
        rescheduleJob={rescheduleJob}
        crewDisplayNames={(crews ?? []).reduce<Record<string, string>>((acc, c) => {
          acc[c.id] = getCrewDisplayName({ name: c.name, crew_members: c.crew_members });
          return acc;
        }, {})}
      />
    </div>
  );
}
