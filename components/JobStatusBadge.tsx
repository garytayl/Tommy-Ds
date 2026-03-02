type JobStatus =
  | "lead"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "paid"
  | "canceled"
  | string;

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  lead: { bg: "oklch(0.97 0.01 260)", text: "oklch(0.45 0.04 260)" },
  scheduled: { bg: "oklch(0.92 0.06 250)", text: "oklch(0.42 0.15 262)" },
  in_progress: { bg: "oklch(0.92 0.08 75)", text: "oklch(0.5 0.15 75)" },
  completed: { bg: "oklch(0.92 0.08 155)", text: "oklch(0.4 0.12 155)" },
  paid: { bg: "oklch(0.92 0.1 145)", text: "oklch(0.38 0.12 145)" },
  canceled: { bg: "oklch(0.95 0.03 25)", text: "oklch(0.5 0.15 25)" },
};

const defaultStyle = { bg: "oklch(0.97 0.01 260)", text: "oklch(0.45 0.04 260)" };

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const style = STATUS_STYLES[status] ?? defaultStyle;

  return (
    <span
      className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {status.replace("_", " ")}
    </span>
  );
}
