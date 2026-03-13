"use client";

import { useEffect } from "react";

/**
 * On mount, scroll the day list so today is in view.
 */
export function ScheduleScrollToToday({ todayDateKey }: { todayDateKey: string }) {
  useEffect(() => {
    const el = document.getElementById(`day-${todayDateKey}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [todayDateKey]);
  return null;
}
