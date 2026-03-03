"use client";

import { useState, useCallback } from "react";

type ScheduleCalendarProps = {
  /** Map of date string (YYYY-MM-DD) to number of jobs */
  jobsByDate: Record<string, number>;
  /** First day to show (YYYY-MM-DD) */
  startDate: string;
  /** Last day to show (YYYY-MM-DD) */
  endDate: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: (number | null)[] = [];
  const startDay = first.getDay();
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return days;
}

function dateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function ScheduleCalendar({
  jobsByDate,
  startDate,
  endDate,
}: ScheduleCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const goPrev = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goNext = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const scrollToDay = useCallback((key: string) => {
    const el = document.getElementById(`day-${key}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const days = getDaysInMonth(viewYear, viewMonth);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  );

  const isInRange = (key: string) => {
    return key >= startDate && key <= endDate;
  };

  return (
    <section
      className="rounded-xl border border-border bg-card overflow-hidden shadow-sm"
      aria-label="Calendar"
    >
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-2.5 sm:px-4">
        <button
          type="button"
          onClick={goPrev}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-foreground transition hover:bg-muted touch-manipulation"
          aria-label="Previous month"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h2 className="text-sm font-semibold text-foreground sm:text-base">
          {monthLabel}
        </h2>
        <button
          type="button"
          onClick={goNext}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-foreground transition hover:bg-muted touch-manipulation"
          aria-label="Next month"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>

      <div className="p-2 sm:p-3">
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {WEEKDAYS.map((wd) => (
            <div
              key={wd}
              className="py-1.5 text-[10px] font-medium text-muted-foreground sm:text-xs"
            >
              {wd}
            </div>
          ))}
          {days.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="aspect-square" />;
            }
            const key = dateKey(viewYear, viewMonth, day);
            const count = jobsByDate[key] ?? 0;
            const isToday =
              today.getFullYear() === viewYear &&
              today.getMonth() === viewMonth &&
              today.getDate() === day;
            const inRange = isInRange(key);

            return (
              <button
                key={key}
                type="button"
                onClick={() => inRange && scrollToDay(key)}
                disabled={!inRange}
                className={`
                  relative flex aspect-square min-h-[36px] min-w-0 items-center justify-center rounded-lg text-sm font-medium transition touch-manipulation
                  sm:min-h-[44px]
                  ${!inRange ? "cursor-default text-muted-foreground/50" : "hover:bg-muted active:bg-muted/80"}
                  ${isToday ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}
                  ${count > 0 && inRange ? "bg-primary/10 text-foreground" : "text-foreground"}
                `}
              >
                <span>{day}</span>
                {count > 0 && inRange && (
                  <span
                    className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary sm:bottom-1"
                    aria-hidden
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
