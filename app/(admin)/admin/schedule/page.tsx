import Link from "next/link";
import { revalidatePath } from "next/cache";

import { getOfficeSessionOrNull } from "@/lib/server-action-guards";
import { setToastCookie } from "@/lib/toast";

import { getCrewDisplayName } from "@/lib/crews";
import {
  ScheduleCalendarWithActions,
  type ScheduleEventRow,
} from "@/components/ScheduleCalendarWithActions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ScheduleControls } from "@/components/ScheduleControls";
import { type ScheduleJob } from "@/components/ScheduleDragDrop";
import { ScheduleMobileWeekRedirect } from "@/components/ScheduleMobileWeekRedirect";
import { ScheduleScrollToToday } from "@/components/ScheduleScrollToToday";
import { ScheduleDayView } from "@/components/ScheduleDayView";
import { ScheduleTable } from "@/components/ScheduleTable";
import { ScheduleTableNav } from "@/components/ScheduleTableNav";
import { ScheduleTodayStrip } from "@/components/ScheduleTodayStrip";
import { ScheduleUnscheduledBlock } from "@/components/ScheduleUnscheduledBlock";

const DAYS_AHEAD = 90;
const DAYS_PAST = 7;

const TABLE_DAYS = 14;

function toIsoOrNull(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function localDateKeyFromIso(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function eachDateKeyInclusive(startKey: string, endKey: string): string[] {
  const out: string[] = [];
  const a = new Date(startKey + "T12:00:00");
  const b = new Date(endKey + "T12:00:00");
  for (const d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; week?: string; layout?: string; date?: string; table_start?: string; kind?: string }>;
}) {
  const {
    view: viewParam,
    week: weekParam,
    layout: layoutParam,
    date: dateParam,
    table_start: tableStartParam,
    kind: kindParam,
  } = await searchParams;
  const kindFilter = kindParam === "service" || kindParam === "installation" ? kindParam : null;
  const view = viewParam ?? "all";
  const viewCrewId = view.startsWith("crew:") ? view.slice(5) : null;
  const viewPersonId = view.startsWith("person:") ? view.slice(7) : null;
  const isWeekView = layoutParam === "week";
  const isDayView = layoutParam === "day";
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

  // Table range: 2 weeks starting from table_start (default: Sunday of current week)
  const tableStart = tableStartParam
    ? new Date(tableStartParam + "T12:00:00")
    : (() => {
        const d = new Date(today);
        d.setDate(d.getDate() - d.getDay());
        return d;
      })();
  const tableDates: string[] = [];
  for (let i = 0; i < TABLE_DAYS; i++) {
    const d = new Date(tableStart);
    d.setDate(d.getDate() + i);
    tableDates.push(d.toISOString().slice(0, 10));
  }

  // Day view: which single day to show
  const dayViewDate = dateParam
    ? new Date(dateParam + "T12:00:00")
    : today;
  const dayViewDateKey = dayViewDate.toISOString().slice(0, 10);

  const supabase = await createSupabaseServerClient();

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
    { data: pointEvents },
    { data: rangedEvents },
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id,title,status,job_kind,scheduled_start,scheduled_end,assigned_installer_id,assigned_crew_id,customers(name),profiles(full_name),crews(name,specialty),invoices(id,invoice_number,balance_due_cents)",
      )
      .gte("scheduled_start", start.toISOString())
      .lt("scheduled_start", end.toISOString())
      .order("scheduled_start", { ascending: true, nullsFirst: false }),
    supabase
      .from("jobs")
      .select("id,title,status,job_kind,customers(name),assigned_installer_id,assigned_crew_id")
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
    supabase
      .from("schedule_events")
      .select("id,title,description,starts_at,ends_at,all_day,job_id")
      .is("ends_at", null)
      .gte("starts_at", start.toISOString())
      .lt("starts_at", end.toISOString()),
    supabase
      .from("schedule_events")
      .select("id,title,description,starts_at,ends_at,all_day,job_id")
      .not("ends_at", "is", null)
      .lt("starts_at", end.toISOString())
      .gte("ends_at", start.toISOString()),
  ]);

  const scheduleEventMap = new Map<string, ScheduleEventRow>();
  for (const row of [...(pointEvents ?? []), ...(rangedEvents ?? [])]) {
    const r = row as ScheduleEventRow;
    scheduleEventMap.set(r.id, r);
  }
  const scheduleEventsList = [...scheduleEventMap.values()];

  type JobRow = {
    id: string;
    title: string;
    status: string;
    job_kind: "installation" | "service";
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
    if (kindFilter && job.job_kind !== kindFilter) return false;
    if (viewCrewId) return job.assigned_crew_id === viewCrewId;
    if (viewPersonId) {
      if (job.assigned_installer_id === viewPersonId) return true;
      if (job.assigned_crew_id && crewIdsForPerson.has(job.assigned_crew_id)) return true;
      return false;
    }
    return true;
  });

  type UnscheduledJobRow = {
    id: string;
    title: string;
    status: string;
    job_kind: "installation" | "service";
    customers: { name: string } | { name: string }[] | null;
    assigned_installer_id: string | null;
    assigned_crew_id: string | null;
  };

  const unscheduledRows = (unscheduledJobs ?? [] as UnscheduledJobRow[]).filter((job) => {
    if (kindFilter && job.job_kind !== kindFilter) return false;
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
  const crewDisplayNameMap = (crews ?? []).reduce<Record<string, string>>((acc, c) => {
    acc[c.id] = getCrewDisplayName({ name: c.name, crew_members: c.crew_members });
    return acc;
  }, {});
  type CalendarItem = {
    id: string;
    title: string;
    type: "job" | "activity" | "event";
    href: string;
    timeLabel?: string;
    customer?: string;
    crewName?: string;
    sortKey?: string;
  };
  const itemsByDate: Record<string, CalendarItem[]> = {};
  for (let d = 0; d < DAYS_PAST + DAYS_AHEAD; d++) {
    const date = new Date(start);
    date.setDate(date.getDate() + d);
    const key = date.toISOString().slice(0, 10);
    byDate[key] = [];
    jobsByDateCount[key] = 0;
    itemsByDate[key] = [];
  }
  function formatTimeLabel(iso: string): string {
    const d = new Date(iso);
    const h = d.getHours();
    const m = d.getMinutes();
    if (h === 12 && m === 0) return "12p";
    if (h === 0 && m === 0) return "12a";
    if (h >= 12) return `${h === 12 ? 12 : h - 12}${m ? `:${String(m).padStart(2, "0")}` : ""}p`;
    return `${h}${m ? `:${String(m).padStart(2, "0")}` : ""}a`;
  }
  for (const job of rows) {
    if (!job.scheduled_start) continue;
    const key = job.scheduled_start.slice(0, 10);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(job);
    jobsByDateCount[key] = (jobsByDateCount[key] ?? 0) + 1;
    const customer = Array.isArray(job.customers) ? job.customers[0]?.name : job.customers?.name;
    const crew = Array.isArray(job.crews) ? job.crews[0] : job.crews;
    const crewName =
      (job.assigned_crew_id && crewDisplayNameMap[job.assigned_crew_id]) ?? crew?.name ?? undefined;
    if (itemsByDate[key]) {
      itemsByDate[key].push({
        id: job.id,
        title: job.title,
        type: "job",
        href: `/jobs/${job.id}`,
        timeLabel: formatTimeLabel(job.scheduled_start),
        customer: customer ?? undefined,
        crewName,
        sortKey: job.scheduled_start,
      });
    }
  }
  const rowIds = new Set(rows.map((r) => r.id));
  for (const act of activitiesInRange ?? []) {
    const a = act as { id: string; job_id: string; type: string; title: string | null; scheduled_date: string };
    if (!a.scheduled_date || !rowIds.has(a.job_id)) continue;
    const key = a.scheduled_date.slice(0, 10);
    if (byDate[key] !== undefined) jobsByDateCount[key] = (jobsByDateCount[key] ?? 0) + 1;
    const title = (a.title || a.type || "Activity").trim() || "Activity";
    const timeLabel = a.scheduled_date.includes("T") ? formatTimeLabel(a.scheduled_date) : undefined;
    if (itemsByDate[key]) {
      itemsByDate[key].push({
        id: a.id,
        title,
        type: "activity",
        href: `/jobs/${a.job_id}`,
        timeLabel,
        sortKey: a.scheduled_date,
      });
    }
  }

  for (const ev of scheduleEventsList) {
    const startKey = localDateKeyFromIso(ev.starts_at);
    const endKey = ev.ends_at ? localDateKeyFromIso(ev.ends_at) : null;
    const keys =
      endKey && endKey !== startKey
        ? eachDateKeyInclusive(
            startKey <= endKey ? startKey : endKey,
            startKey <= endKey ? endKey : startKey,
          )
        : [startKey];
    const timeLabel = ev.all_day ? undefined : formatTimeLabel(ev.starts_at);
    for (const key of keys) {
      if (itemsByDate[key] === undefined) continue;
      jobsByDateCount[key] = (jobsByDateCount[key] ?? 0) + 1;
      itemsByDate[key].push({
        id: ev.id,
        title: ev.title,
        type: "event",
        href: "#",
        timeLabel,
        sortKey: ev.starts_at,
      });
    }
  }

  for (const key of Object.keys(itemsByDate)) {
    itemsByDate[key].sort((a, b) => (a.sortKey ?? "").localeCompare(b.sortKey ?? ""));
  }

  const startDateStr = start.toISOString().slice(0, 10);
  const endDateStr = end.toISOString().slice(0, 10);
  let sortedDates = Object.keys(byDate).sort();
  if (isWeekView) {
    sortedDates = sortedDates.filter((d) => d >= weekStartStr && d < weekEndStr);
  }

  async function rescheduleJob(jobId: string, newStartIso: string) {
    "use server";
    const session = await getOfficeSessionOrNull();
    if (!session) return;
    const { supabase } = session;
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

  async function createScheduleEvent(formData: FormData) {
    "use server";
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    const description = String(formData.get("description") ?? "").trim() || null;
    const allDay = formData.get("all_day") === "1";
    const startsRaw = String(formData.get("starts_at") ?? "").trim();
    const endsRaw = String(formData.get("ends_at") ?? "").trim();
    let startsAt: string | null = null;
    let endsAt: string | null = null;
    if (allDay) {
      const datePart = startsRaw.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return;
      const start = new Date(datePart + "T12:00:00");
      startsAt = start.toISOString();
      if (endsRaw) {
        const endDatePart = endsRaw.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(endDatePart)) {
          const end = new Date(endDatePart + "T12:00:00");
          endsAt = end.toISOString();
        }
      } else {
        endsAt = new Date(datePart + "T23:59:59").toISOString();
      }
    } else {
      startsAt = toIsoOrNull(formData.get("starts_at"));
      endsAt = toIsoOrNull(formData.get("ends_at"));
    }
    if (!startsAt) return;
    const session = await getOfficeSessionOrNull();
    if (!session) return;
    const { supabase } = session;
    let createdBy: string | null = null;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      createdBy = user?.id ?? null;
    } catch {
      // no session
    }
    await supabase.from("schedule_events").insert({
      title,
      description,
      starts_at: startsAt,
      ends_at: endsAt,
      all_day: allDay,
      created_by: createdBy,
    });
    await setToastCookie("Event added");
    revalidatePath("/admin/schedule");
  }

  async function updateScheduleEvent(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return;
    const title = String(formData.get("title") ?? "").trim();
    if (!title) return;
    const description = String(formData.get("description") ?? "").trim() || null;
    const allDay = formData.get("all_day") === "1";
    const startsRaw = String(formData.get("starts_at") ?? "").trim();
    const endsRaw = String(formData.get("ends_at") ?? "").trim();
    let startsAt: string | null = null;
    let endsAt: string | null = null;
    if (allDay) {
      const datePart = startsRaw.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return;
      const start = new Date(datePart + "T12:00:00");
      startsAt = start.toISOString();
      if (endsRaw) {
        const endDatePart = endsRaw.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(endDatePart)) {
          const end = new Date(endDatePart + "T12:00:00");
          endsAt = end.toISOString();
        }
      } else {
        endsAt = new Date(datePart + "T23:59:59").toISOString();
      }
    } else {
      startsAt = toIsoOrNull(formData.get("starts_at"));
      endsAt = toIsoOrNull(formData.get("ends_at"));
    }
    if (!startsAt) return;
    const session = await getOfficeSessionOrNull();
    if (!session) return;
    const { supabase } = session;
    await supabase
      .from("schedule_events")
      .update({
        title,
        description,
        starts_at: startsAt,
        ends_at: endsAt,
        all_day: allDay,
      })
      .eq("id", id);
    await setToastCookie("Event updated");
    revalidatePath("/admin/schedule");
  }

  async function deleteScheduleEvent(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "").trim();
    if (!id) return;
    const session = await getOfficeSessionOrNull();
    if (!session) return;
    const { supabase } = session;
    await supabase.from("schedule_events").delete().eq("id", id);
    await setToastCookie("Event deleted");
    revalidatePath("/admin/schedule");
  }

  async function quickAddScheduleActivity(formData: FormData) {
    "use server";
    const jobId = String(formData.get("job_id") ?? "").trim();
    const type = String(formData.get("activity_type") ?? "note").trim();
    const title = String(formData.get("activity_title") ?? "").trim();
    const scheduledDate = toIsoOrNull(formData.get("activity_scheduled_date"));
    if (!jobId || !type) return;
    const session = await getOfficeSessionOrNull();
    if (!session) return;
    const { supabase } = session;
    await supabase.from("activities").insert({
      job_id: jobId,
      type: type as
        | "created"
        | "note"
        | "consultation"
        | "pre_measure"
        | "measure"
        | "design"
        | "quote_sent"
        | "follow_up"
        | "customer_acceptance"
        | "deposit_received"
        | "schedule_install"
        | "walkthrough"
        | "install"
        | "payment_received",
      title: title || null,
      description: null,
      scheduled_date: scheduledDate,
      assigned_to: null,
      status: "pending",
    });
    await setToastCookie("Activity added");
    revalidatePath("/admin/schedule");
    revalidatePath(`/jobs/${jobId}`);
  }

  const quickAddJobOptions = [
    ...rows.map((job) => {
      const customer = Array.isArray(job.customers) ? job.customers[0]?.name : job.customers?.name;
      return {
        id: job.id,
        title: job.title,
        customerLabel: customer ?? undefined,
      };
    }),
    ...unscheduledRows.map((job) => {
      const customer = Array.isArray(job.customers) ? job.customers[0]?.name : job.customers?.name;
      return {
        id: job.id,
        title: job.title,
        customerLabel: customer ?? undefined,
      };
    }),
  ].slice(0, 100);

  return (
    <div className="space-y-6 sm:space-y-8">
      <ScheduleMobileWeekRedirect hasLayoutParam={layoutParam !== undefined} />
      <div className="animate-fade-in-section schedule-delay-0">
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

      <div className="relative">
      <ScheduleControls
        view={view}
        isWeekView={isWeekView}
        isDayView={isDayView}
        weekStartStr={weekStartStr}
        dayViewDateKey={dayViewDateKey}
        crews={(crews ?? []).map((c) => ({ id: c.id, name: getCrewDisplayName({ name: c.name, crew_members: c.crew_members }), specialty: c.specialty }))}
        installers={installers ?? []}
        viewCrewId={viewCrewId}
        viewPersonId={viewPersonId}
        kindFilter={kindFilter}
      />
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3 animate-fade-in-section schedule-delay-150">
        <Link
          href="/admin/jobs/new"
          className="inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all duration-200 hover:scale-105 hover:opacity-95 hover:shadow-lg active:scale-95 touch-manipulation"
        >
          New job
        </Link>
        <Link
          href="/admin/jobs"
          className="inline-flex items-center rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:scale-105 hover:bg-muted hover:shadow-sm active:scale-95 touch-manipulation"
        >
          All jobs
        </Link>
      </div>

      <div className="animate-fade-in-section schedule-delay-225">
        <ScheduleUnscheduledBlock jobs={unscheduledRows} />
      </div>

      <div className="animate-fade-in-section schedule-delay-300">
      {isDayView ? (
        <ScheduleDayView
          dateKey={dayViewDateKey}
          jobs={(byDate[dayViewDateKey] ?? []) as ScheduleJob[]}
          crewDisplayNames={crewDisplayNameMap}
        />
      ) : (
        <ScheduleTodayStrip
          todayDateKey={today.toISOString().slice(0, 10)}
          jobs={(byDate[today.toISOString().slice(0, 10)] ?? []) as ScheduleJob[]}
        />
      )}
      </div>

      {!isDayView && (
      <div className="animate-schedule-calendar-in schedule-delay-400">
      <ScheduleCalendarWithActions
        jobsByDate={jobsByDateCount}
        itemsByDate={itemsByDate}
        startDate={startDateStr}
        endDate={endDateStr}
        visibleStart={isWeekView ? weekStartStr : undefined}
        visibleEnd={isWeekView ? weekEndStr : undefined}
        scheduleEvents={scheduleEventsList}
        createScheduleEvent={createScheduleEvent}
        updateScheduleEvent={updateScheduleEvent}
        deleteScheduleEvent={deleteScheduleEvent}
        quickAddActivity={quickAddScheduleActivity}
        quickAddJobOptions={quickAddJobOptions}
        weekNavigation={
          isWeekView
            ? (() => {
                const prev = new Date(weekStart);
                prev.setDate(prev.getDate() - 7);
                const prevStr = prev.toISOString().slice(0, 10);
                const weekNavHref = (week: string) => {
                  const p = new URLSearchParams();
                  if (view !== "all") p.set("view", view);
                  p.set("layout", "week");
                  p.set("week", week);
                  if (kindFilter) p.set("kind", kindFilter);
                  return `/admin/schedule?${p.toString()}`;
                };
                return { prevUrl: weekNavHref(prevStr), nextUrl: weekNavHref(weekEndStr) };
              })()
            : undefined
        }
      />
      </div>
      )}

      <ScheduleScrollToToday todayDateKey={today.toISOString().slice(0, 10)} />
      <div className="space-y-3 animate-fade-in-section schedule-delay-500">
        <ScheduleTableNav
          tableStartStr={tableDates[0] ?? tableStart.toISOString().slice(0, 10)}
          view={view}
          layout={layoutParam}
          weekStartStr={weekStartStr}
          dateStr={isDayView ? dayViewDateKey : undefined}
          kind={kindFilter}
        />
        <ScheduleTable
          jobsByDate={byDate as Record<string, ScheduleJob[]>}
          tableDates={tableDates}
          dateOptions={sortedDates}
          rescheduleJob={rescheduleJob}
          crewDisplayNames={crewDisplayNameMap}
          todayDateKey={today.toISOString().slice(0, 10)}
        />
      </div>
    </div>
  );
}
