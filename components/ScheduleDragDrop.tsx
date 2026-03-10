"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

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
  invoices: { id: string; balance_due_cents: number }[] | { id: string; balance_due_cents: number } | null;
};

type ScheduleDragDropProps = {
  /** Map of date key (YYYY-MM-DD) to jobs for that day */
  jobsByDate: Record<string, ScheduleJob[]>;
  sortedDates: string[];
  /** Server action: (jobId: string, newDateStr: string) => Promise<void> */
  rescheduleJob: (jobId: string, newDateStr: string) => Promise<void>;
};

export function ScheduleDragDrop({
  jobsByDate,
  sortedDates,
  rescheduleJob,
}: ScheduleDragDropProps) {
  const router = useRouter();

  function handleDragStart(e: React.DragEvent, jobId: string, currentStart: string | null) {
    e.dataTransfer.setData("application/x-job-id", jobId);
    e.dataTransfer.setData("application/x-job-start", currentStart ?? "");
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(e: React.DragEvent, dateKey: string) {
    e.preventDefault();
    const jobId = e.dataTransfer.getData("application/x-job-id");
    const currentStart = e.dataTransfer.getData("application/x-job-start");
    if (!jobId) return;

    const timePart = currentStart && currentStart.includes("T")
      ? currentStart.split("T")[1].slice(0, 8)
      : "08:00:00";
    const newStart = `${dateKey}T${timePart}`;

    await rescheduleJob(jobId, newStart);
    router.refresh();
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
        return (
          <div
            key={dateKey}
            id={`day-${dateKey}`}
            className="scroll-mt-4 rounded-xl border border-border bg-card overflow-hidden shadow-sm"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, dateKey)}
          >
            <div className="border-b border-border bg-muted/30 px-3 py-2.5 sm:px-5">
              <h2 className="text-sm font-semibold text-foreground">{label}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Drop jobs here to reschedule
              </p>
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
                  const installer = Array.isArray(job.profiles)
                    ? job.profiles[0]?.full_name
                    : job.profiles?.full_name;
                  const invoice = Array.isArray(job.invoices) ? job.invoices[0] : job.invoices;
                  const hasBalanceDue = invoice && invoice.balance_due_cents > 0;
                  return (
                    <li
                      key={job.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, job.id, job.scheduled_start)}
                      className="flex flex-wrap items-center gap-2 px-3 py-3 sm:px-5 cursor-grab active:cursor-grabbing border-b border-border bg-card hover:bg-muted/20 transition"
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
                        {crew?.name && (
                          <span className="text-xs font-medium text-muted-foreground">
                            {crew.name}
                          </span>
                        )}
                        {customer && (
                          <span className="text-sm text-muted-foreground">{customer}</span>
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
