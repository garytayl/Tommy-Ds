"use client";

type DevHintProps = {
  /** Shown on hover when dev hints are enabled. Can describe behavior, data source, API, etc. */
  message: string;
  children: React.ReactNode;
};

const DEV_HINTS_ENABLED =
  typeof process !== "undefined" &&
  process.env.NODE_ENV !== "production" &&
  process.env.NEXT_PUBLIC_DEV_HINTS === "true";

export function DevHint({ message, children }: DevHintProps) {
  if (!DEV_HINTS_ENABLED) {
    return <>{children}</>;
  }

  return (
    <div className="relative group/devhint w-fit">
      {children}
      <div
        className="absolute left-0 top-full z-[100] mt-1 hidden max-w-xs rounded bg-zinc-900 px-2.5 py-2 text-xs font-medium text-white shadow-lg group-hover/devhint:block dark:bg-zinc-100 dark:text-zinc-900"
        role="tooltip"
      >
        <span className="block text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Dev hint
        </span>
        {message}
      </div>
    </div>
  );
}
