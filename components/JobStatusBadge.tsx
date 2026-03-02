type JobStatus =
  | "lead"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "paid"
  | "canceled"
  | string;

const STATUS_STYLES: Record<string, string> = {
  lead: "bg-zinc-100 text-zinc-700",
  scheduled: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  paid: "bg-green-100 text-green-700",
  canceled: "bg-rose-100 text-rose-700",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const className = STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-700";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${className}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
