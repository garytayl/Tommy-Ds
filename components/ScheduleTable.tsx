"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";

import { CollectPaymentButton } from "@/components/CollectPaymentButton";
import { JobStatusBadge } from "@/components/JobStatusBadge";
import type { ScheduleJob } from "@/components/ScheduleDragDrop";

type ScheduleTableProps = {
  /** Map of date key (YYYY-MM-DD) to jobs for that day */
  jobsByDate: Record<string, ScheduleJob[]>;
  /** Dates to show in the table (e.g. 14 days) */
  tableDates: string[];
  /** All dates for "Move to…" dropdown (can be wider than tableDates) */
  dateOptions: string[];
  /** Server action: (jobId: string, newStartIso: string) => Promise<void> */
  rescheduleJob: (jobId: string, newStartIso: string) => Promise<void>;
  /** Optional map of crew id to display name */
  crewDisplayNames?: Record<string, string>;
  /** Today's date key for scroll target */
  todayDateKey: string;
};

export function ScheduleTable({
  jobsByDate,
  tableDates,
  dateOptions,
  rescheduleJob,
  crewDisplayNames = {},
  todayDateKey,
}: ScheduleTableProps) {
  const router = useRouter();
  const [dragOverDateKey, setDragOverDateKey] = useState<string | null>(null);
  const [reschedulingJobId, setReschedulingJobId] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, jobId: string, currentStart: string | null) => {
    e.dataTransfer.setData("application/x-job-id", jobId);
    e.dataTransfer.setData("application/x-job-start", currentStart ?? "");
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDateKey(dateKey);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOverDateKey(null);
    }
  }, []);

  async function handleDrop(e: React.DragEvent, dateKey: string) {
    e.preventDefault();
    setDragOverDateKey(null);
    const jobId = e.dataTransfer.getData("application/x-job-id");
    const currentStart = e.dataTransfer.getData("application/x-job-start");
    if (!jobId) return;
    const timePart =
      currentStart && currentStart.includes("T") ? currentStart.split("T")[1].slice(0, 8) : "08:00:00";
    const newStart = `${dateKey}T${timePart}`;
    setReschedulingJobId(jobId);
    try {
      await rescheduleJob(jobId, newStart);
      router.refresh();
    } finally {
      setReschedulingJobId(null);
    }
  }

  async function handleMoveTo(job: ScheduleJob, newDateKey: string) {
    const currentKey = job.scheduled_start?.slice(0, 10);
    if (currentKey === newDateKey) return;
    const timePart = job.scheduled_start?.includes("T")
      ? job.scheduled_start.split("T")[1].slice(0, 8)
      : "08:00:00";
    const newStart = `${newDateKey}T${timePart}`;
    setReschedulingJobId(job.id);
    try {
      await rescheduleJob(job.id, newStart);
      router.refresh();
    } finally {
      setReschedulingJobId(null);
    }
  }

  // Build flat rows: only scheduled jobs (no empty-day placeholders). First row per date gets id for scroll-to-day.
  const rows: { dateKey: string; job: ScheduleJob; isFirstForDate: boolean }[] = [];
  for (const dateKey of tableDates) {
    const dayJobs = jobsByDate[dateKey] ?? [];
    dayJobs.forEach((job, i) => {
      rows.push({ dateKey, job, isFirstForDate: i === 0 });
    });
  }

  const firstDate = tableDates[0] ? new Date(tableDates[0] + "T12:00:00") : null;
  const lastDate = tableDates[tableDates.length - 1]
    ? new Date(tableDates[tableDates.length - 1] + "T12:00:00")
    : null;
  const rangeLabel =
    firstDate && lastDate
      ? `${firstDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${lastDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      : "Schedule";

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg shadow-black/5 transition-shadow duration-300 hover:shadow-xl" aria-label="Scheduled jobs">
      <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-6">
        <h2 className="text-base font-semibold text-foreground">Scheduled jobs</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {rows.length === 0
            ? `${rangeLabel} · No jobs in this period`
            : `${rangeLabel} · ${rows.length} job${rows.length !== 1 ? "s" : ""}`}
        </p>
      </div>
      <div className="table-wrap overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="table-header py-3 pl-5 pr-4 text-left">Date</th>
              <th className="table-header py-3 pr-4 text-left">Time</th>
              <th className="table-header py-3 pr-4 text-left">Job</th>
              <th className="table-header py-3 pr-4 text-left hidden sm:table-cell">Customer</th>
              <th className="table-header py-3 pr-4 text-left hidden md:table-cell">Crew</th>
              <th className="table-header py-3 pr-4 text-left">Status</th>
              <th className="table-header py-3 pr-4 text-left">Balance</th>
              <th className="table-header py-3 pr-5 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  No jobs scheduled in this period. Use the calendar above or &quot;Move to…&quot; on a job in another view to schedule.
                </td>
              </tr>
            ) : (
            rows.map(({ dateKey, job, isFirstForDate }) => {
              const isDropTarget = dragOverDateKey === dateKey;
              const date = new Date(dateKey + "T12:00:00");
              const dateLabel = date.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              const isToday = dateKey === todayDateKey;

              const customer = Array.isArray(job.customers)
                ? job.customers[0]?.name
                : job.customers?.name;
              const crew = Array.isArray(job.crews) ? job.crews[0] : job.crews;
              const crewName =
                (job.assigned_crew_id && crewDisplayNames[job.assigned_crew_id]) ?? crew?.name;
              const invoice = Array.isArray(job.invoices) ? job.invoices[0] : job.invoices;
              const hasBalanceDue = invoice && invoice.balance_due_cents > 0;
              const isRescheduling = reschedulingJobId === job.id;
              const currentDateKey = job.scheduled_start?.slice(0, 10);

              return (
                <tr
                  key={job.id}
                  id={isFirstForDate ? `day-${dateKey}` : undefined}
                  draggable={!isRescheduling}
                  onDragStart={(e) => handleDragStart(e, job.id, job.scheduled_start)}
                  onDragEnd={() => setDragOverDateKey(null)}
                  onDragOver={(e) => handleDragOver(e, dateKey)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, dateKey)}
                  className={`border-b border-border transition-all duration-200 ${
                    isRescheduling ? "opacity-60 pointer-events-none" : "hover:bg-muted/30"
                  } ${!isRescheduling ? "cursor-grab active:cursor-grabbing" : ""} ${
                    isDropTarget ? "bg-accent-gold/15 animate-schedule-drop-zone" : ""
                  } ${hasBalanceDue ? "border-l-2 border-l-accent-gold" : ""} ${
                    isToday ? "bg-accent-gold/5" : ""
                  }`}
                >
                  <td className="py-3 pl-5 pr-4 font-medium text-foreground whitespace-nowrap">
                    {dateLabel}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground tabular-nums whitespace-nowrap">
                    {job.scheduled_start
                      ? new Date(job.scheduled_start).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="py-3 pr-4 font-medium text-foreground">
                    <Link href={`/jobs/${job.id}`} className="link transition-colors duration-200 hover:underline">
                      {job.title}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground hidden sm:table-cell">
                    {customer ?? "—"}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground hidden md:table-cell">
                    {crewName ?? "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <JobStatusBadge status={job.status} />
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground tabular-nums">
                    {invoice ? (
                      <Link href={`/admin/invoices/${invoice.id}`} className="hover:underline">
                        #{invoice.invoice_number}
                        {invoice.balance_due_cents > 0 && (
                          <span className="text-accent-gold ml-0.5">
                            (${(invoice.balance_due_cents / 100).toFixed(0)})
                          </span>
                        )}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 pr-5 flex flex-wrap items-center gap-2">
                    <select
                      aria-label={`Move ${job.title} to another day`}
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) handleMoveTo(job, val);
                        e.target.value = "";
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-md border border-border bg-muted/50 py-1.5 pl-2 pr-6 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Move to…</option>
                      {dateOptions.map((d) => {
                        const dayDate = new Date(d + "T12:00:00");
                        const dayLabel = dayDate.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        });
                        return (
                          <option key={d} value={d} disabled={d === currentDateKey}>
                            {d === currentDateKey ? `${dayLabel} (current)` : dayLabel}
                          </option>
                        );
                      })}
                    </select>
                    {hasBalanceDue && (
                      <CollectPaymentButton
                        invoiceId={invoice!.id}
                        disabled={false}
                        compact
                      />
                    )}
                  </td>
                </tr>
              );
            })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
