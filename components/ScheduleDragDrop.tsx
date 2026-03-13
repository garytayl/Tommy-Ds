"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";

import { CollectPaymentButton } from "@/components/CollectPaymentButton";
import { JobStatusBadge } from "@/components/JobStatusBadge";

export type ScheduleJob = {
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

type ScheduleDragDropProps = {
  /** Map of date key (YYYY-MM-DD) to jobs for that day */
  jobsByDate: Record<string, ScheduleJob[]>;
  sortedDates: string[];
  /** Server action: (jobId: string, newDateStr: string) => Promise<void> */
  rescheduleJob: (jobId: string, newDateStr: string) => Promise<void>;
  /** Optional map of crew id to display name (e.g. "Joe & Michael") */
  crewDisplayNames?: Record<string, string>;
};

export function ScheduleDragDrop({
  jobsByDate,
  sortedDates,
  rescheduleJob,
  crewDisplayNames = {},
}: ScheduleDragDropProps) {
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

    const timePart = currentStart && currentStart.includes("T")
      ? currentStart.split("T")[1].slice(0, 8)
      : "08:00:00";
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

  return (
    <section className="space-y-4" aria-label="Jobs by day">
      {sortedDates.map((dateKey) => {
        const dayJobs = jobsByDate[dateKey] ?? [];
        const date = new Date(dateKey + "T12:00:00");
        const label = date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const isDropTarget = dragOverDateKey === dateKey;
        return (
          <div
            key={dateKey}
            id={`day-${dateKey}`}
            className={`scroll-mt-4 rounded-xl border overflow-hidden shadow-sm transition-colors ${
              isDropTarget ? "border-accent-gold bg-accent-gold/10 ring-2 ring-accent-gold/50" : "border-border bg-card"
            }`}
            onDragOver={(e) => handleDragOver(e, dateKey)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, dateKey)}
          >
            <div className="sticky top-0 z-10 border-b border-border bg-card px-3 py-2.5 sm:px-5 shadow-[0_1px_0_0_var(--border)]">
              <h2 className="text-sm font-semibold text-foreground">{label}</h2>
              {dayJobs.length === 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Drop jobs here to reschedule
                </p>
              )}
            </div>
            <ul className="divide-y divide-border">
              {dayJobs.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground sm:px-5 border-b border-dashed border-border min-h-[60px] flex items-center justify-center">
                  No jobs — drag a job from another day to schedule here
                </li>
              ) : (
                dayJobs.map((job) => {
                  const customer = Array.isArray(job.customers)
                    ? job.customers[0]?.name
                    : job.customers?.name;
                  const crew = Array.isArray(job.crews) ? job.crews[0] : job.crews;
                  const crewName =
                    (job.assigned_crew_id && crewDisplayNames[job.assigned_crew_id]) ?? crew?.name;
                  const installer = Array.isArray(job.profiles)
                    ? job.profiles[0]?.full_name
                    : job.profiles?.full_name;
                  const invoice = Array.isArray(job.invoices) ? job.invoices[0] : job.invoices;
                  const hasBalanceDue = invoice && invoice.balance_due_cents > 0;
                  const isRescheduling = reschedulingJobId === job.id;
                  const currentDateKey = job.scheduled_start?.slice(0, 10);
                  return (
                    <li
                      key={job.id}
                      draggable={!isRescheduling}
                      onDragStart={(e) => handleDragStart(e, job.id, job.scheduled_start)}
                      onDragEnd={() => setDragOverDateKey(null)}
                      className={`flex flex-wrap items-center gap-2 px-3 py-3 sm:px-5 border-b border-border bg-card transition ${
                        isRescheduling ? "opacity-60 pointer-events-none" : "cursor-grab active:cursor-grabbing hover:bg-muted/20"
                      } ${hasBalanceDue ? "border-l-2 border-l-accent-gold" : ""}`}
                    >
                      <Link
                        href={`/jobs/${job.id}`}
                        className="flex flex-1 min-w-0 flex-col gap-1 transition hover:bg-muted/30 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1 -mx-3 px-3 py-1 sm:-mx-5 sm:px-5 sm:py-1"
                      >
                        <span className="font-medium text-foreground">{job.title}</span>
                        <span className="text-sm text-muted-foreground">
                          {job.scheduled_start
                            ? new Date(job.scheduled_start).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })
                            : "—"}
                        </span>
                        {crewName && (
                          <span className="text-xs font-medium text-muted-foreground">
                            {crewName}
                          </span>
                        )}
                        {customer && (
                          <span className="text-sm text-muted-foreground">{customer}</span>
                        )}
                        {invoice && (
                          <Link
                            href={`/admin/invoices/${invoice.id}`}
                            className="text-xs text-muted-foreground hover:underline tabular-nums"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Inv #{invoice.invoice_number}
                          </Link>
                        )}
                        {installer && (
                          <span className="text-xs text-muted-foreground">{installer}</span>
                        )}
                        <span className="mt-1 sm:mt-0 sm:ml-auto">
                          <JobStatusBadge status={job.status} />
                        </span>
                      </Link>
                      {hasBalanceDue && (
                        <CollectPaymentButton
                          invoiceId={invoice!.id}
                          disabled={false}
                          compact
                        />
                      )}
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
                        {sortedDates.map((d) => {
                          const dayDate = new Date(d + "T12:00:00");
                          const dayLabel = dayDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                          return (
                            <option key={d} value={d} disabled={d === currentDateKey}>
                              {d === currentDateKey ? `${dayLabel} (current)` : dayLabel}
                            </option>
                          );
                        })}
                      </select>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
