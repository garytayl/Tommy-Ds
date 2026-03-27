"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import {
  ScheduleCalendar,
  type CalendarItem,
} from "@/components/ScheduleCalendar";

const ACTIVITY_TYPES: { value: string; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "consultation", label: "Consultation" },
  { value: "pre_measure", label: "Pre-measure" },
  { value: "measure", label: "Measure" },
  { value: "design", label: "Design" },
  { value: "quote_sent", label: "Quote sent" },
  { value: "follow_up", label: "Follow up" },
  { value: "customer_acceptance", label: "Customer acceptance" },
  { value: "deposit_received", label: "Deposit received" },
  { value: "schedule_install", label: "Schedule install" },
  { value: "walkthrough", label: "Walkthrough" },
  { value: "install", label: "Install" },
  { value: "payment_received", label: "Payment received" },
];

export type ScheduleEventRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  job_id: string | null;
};

export type QuickAddJobOption = {
  id: string;
  title: string;
  customerLabel?: string;
};

type ScheduleCalendarWithActionsProps = {
  jobsByDate: Record<string, number>;
  itemsByDate: Record<string, CalendarItem[]>;
  startDate: string;
  endDate: string;
  visibleStart?: string;
  visibleEnd?: string;
  weekNavigation?: { prevUrl: string; nextUrl: string };
  scheduleEvents: ScheduleEventRow[];
  createScheduleEvent: (formData: FormData) => Promise<void>;
  updateScheduleEvent: (formData: FormData) => Promise<void>;
  deleteScheduleEvent: (formData: FormData) => Promise<void>;
  quickAddActivity?: (formData: FormData) => Promise<void>;
  quickAddJobOptions?: QuickAddJobOption[];
};

function localDatetimeValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function dateOnlyValue(iso: string): string {
  return iso.slice(0, 10);
}

function useFocusTrap(active: boolean, containerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active || !containerRef.current) return;
    const root = containerRef.current;
    const focusables = root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const list = Array.from(focusables).filter((el) => !el.hasAttribute("disabled"));
    if (list.length === 0) return;
    const first = list[0];
    const last = list[list.length - 1];
    first.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    root.addEventListener("keydown", onKeyDown);
    return () => root.removeEventListener("keydown", onKeyDown);
  }, [active, containerRef]);
}

export function ScheduleCalendarWithActions({
  jobsByDate,
  itemsByDate,
  startDate,
  endDate,
  visibleStart,
  visibleEnd,
  weekNavigation,
  scheduleEvents,
  createScheduleEvent,
  updateScheduleEvent,
  deleteScheduleEvent,
  quickAddActivity,
  quickAddJobOptions = [],
}: ScheduleCalendarWithActionsProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"add" | "day" | "edit">("add");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [addAllDay, setAddAllDay] = useState(false);
  const [editAllDay, setEditAllDay] = useState(false);

  const eventMap = useMemo(() => {
    const m = new Map<string, ScheduleEventRow>();
    for (const ev of scheduleEvents) m.set(ev.id, ev);
    return m;
  }, [scheduleEvents]);

  useFocusTrap(panelOpen, panelRef);

  useEffect(() => {
    if (!panelOpen) return;
    function onDocMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
        setEditingEventId(null);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [panelOpen]);

  useEffect(() => {
    if (!panelOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setPanelOpen(false);
        setEditingEventId(null);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  const openAdd = useCallback((dateKey?: string) => {
    setPanelMode("add");
    setSelectedDateKey(dateKey ?? null);
    setEditingEventId(null);
    setAddAllDay(false);
    setPanelOpen(true);
  }, []);

  const openDay = useCallback((dateKey: string) => {
    setPanelMode("day");
    setSelectedDateKey(dateKey);
    setEditingEventId(null);
    setPanelOpen(true);
  }, []);

  const openEditEvent = useCallback((item: CalendarItem) => {
    if (item.type !== "event") return;
    const row = eventMap.get(item.id);
    setPanelMode("edit");
    setEditingEventId(item.id);
    setSelectedDateKey(item.sortKey?.slice(0, 10) ?? null);
    setEditAllDay(row?.all_day ?? false);
    setPanelOpen(true);
  }, [eventMap]);

  const dayItems = selectedDateKey ? itemsByDate[selectedDateKey] ?? [] : [];
  const editingRow = editingEventId ? eventMap.get(editingEventId) : undefined;

  const defaultStartsForAdd = useMemo(() => {
    const key = selectedDateKey ?? new Date().toISOString().slice(0, 10);
    const d = new Date(key + "T09:00:00");
    return localDatetimeValue(d.toISOString());
  }, [selectedDateKey, panelOpen, panelMode]);

  const headerBtn = (
    <button
      type="button"
      onClick={() => openAdd()}
      className="inline-flex items-center justify-center rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-white/20"
    >
      Add event
    </button>
  );

  return (
    <>
      <ScheduleCalendar
        jobsByDate={jobsByDate}
        itemsByDate={itemsByDate}
        startDate={startDate}
        endDate={endDate}
        visibleStart={visibleStart}
        visibleEnd={visibleEnd}
        weekNavigation={weekNavigation}
        onDayClick={openDay}
        onEventChipClick={openEditEvent}
        headerExtra={headerBtn}
      />

      {panelOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="presentation"
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/20 bg-gradient-to-b from-white/10 to-white/5 p-4 shadow-2xl backdrop-blur-md sm:p-6"
          >
            {panelMode === "day" && selectedDateKey && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 id={titleId} className="text-lg font-semibold text-foreground">
                    {new Date(selectedDateKey + "T12:00:00").toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </h2>
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-white/10"
                    onClick={() => setPanelOpen(false)}
                  >
                    Close
                  </button>
                </div>
                <button
                  type="button"
                  className="w-full rounded-xl border border-primary/40 bg-primary/15 px-4 py-2.5 text-sm font-medium text-foreground"
                  onClick={() => openAdd(selectedDateKey)}
                >
                  Add event this day
                </button>
                <ul className="space-y-2">
                  {dayItems.length === 0 && (
                    <li className="text-sm text-muted-foreground">Nothing scheduled.</li>
                  )}
                  {dayItems.map((item) => (
                    <li
                      key={`${item.type}-${item.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {item.timeLabel ? `${item.timeLabel} · ` : ""}
                          {item.title}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">{item.type}</div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {item.type === "event" ? (
                          <>
                            <button
                              type="button"
                              className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                              onClick={() => openEditEvent(item)}
                            >
                              Edit
                            </button>
                            <form action={deleteScheduleEvent}>
                              <input type="hidden" name="id" value={item.id} />
                              <button
                                type="submit"
                                className="text-sm font-medium text-destructive underline-offset-2 hover:underline"
                              >
                                Delete
                              </button>
                            </form>
                          </>
                        ) : (
                          <a href={item.href} className="text-sm font-medium text-primary underline-offset-2 hover:underline">
                            Open job
                          </a>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>

                {quickAddActivity && quickAddJobOptions.length > 0 && (
                  <div className="border-t border-white/15 pt-4">
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Quick-add activity</h3>
                    <form action={quickAddActivity} className="form-group space-y-3">
                      <div>
                        <label htmlFor={`qa-job-${selectedDateKey}`} className="mb-1 block text-xs font-medium text-muted-foreground">
                          Job
                        </label>
                        <select
                          id={`qa-job-${selectedDateKey}`}
                          name="job_id"
                          required
                          className="field w-full"
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Select job
                          </option>
                          {quickAddJobOptions.map((j) => (
                            <option key={j.id} value={j.id}>
                              {j.customerLabel ? `${j.title} — ${j.customerLabel}` : j.title}
                            </option>
                        ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`qa-type-${selectedDateKey}`} className="mb-1 block text-xs font-medium text-muted-foreground">
                          Activity type
                        </label>
                        <select
                          id={`qa-type-${selectedDateKey}`}
                          name="activity_type"
                          required
                          className="field w-full"
                          defaultValue="note"
                        >
                          {ACTIVITY_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor={`qa-title-${selectedDateKey}`} className="mb-1 block text-xs font-medium text-muted-foreground">
                          Title (optional)
                        </label>
                        <input
                          id={`qa-title-${selectedDateKey}`}
                          name="activity_title"
                          className="field w-full"
                          placeholder="Activity title"
                        />
                      </div>
                      <input type="hidden" name="activity_scheduled_date" value={selectedDateKey + "T12:00:00"} />
                      <button
                        type="submit"
                        className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                      >
                        Add activity
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {panelMode === "add" && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 id={titleId} className="text-lg font-semibold text-foreground">
                    New event
                  </h2>
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-white/10"
                    onClick={() => setPanelOpen(false)}
                  >
                    Close
                  </button>
                </div>
                <form action={createScheduleEvent} className="form-group space-y-3">
                  <div>
                    <label htmlFor="ev-title" className="mb-1 block text-xs font-medium text-muted-foreground">
                      Title
                    </label>
                    <input id="ev-title" name="title" required className="field w-full" placeholder="Meeting, PTO, …" />
                  </div>
                  <div>
                    <label htmlFor="ev-desc" className="mb-1 block text-xs font-medium text-muted-foreground">
                      Description (optional)
                    </label>
                    <textarea id="ev-desc" name="description" className="field w-full min-h-[72px]" rows={3} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="ev-allday"
                      name="all_day"
                      type="checkbox"
                      value="1"
                      checked={addAllDay}
                      onChange={(e) => setAddAllDay(e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <label htmlFor="ev-allday" className="text-sm text-foreground">
                      All day
                    </label>
                  </div>
                  <div>
                    <label htmlFor="ev-start" className="mb-1 block text-xs font-medium text-muted-foreground">
                      {addAllDay ? "Start date" : "Starts"}
                    </label>
                    <input
                      key={`ev-start-${addAllDay ? "d" : "dt"}`}
                      id="ev-start"
                      name="starts_at"
                      type={addAllDay ? "date" : "datetime-local"}
                      required
                      defaultValue={
                        addAllDay ? defaultStartsForAdd.slice(0, 10) : defaultStartsForAdd
                      }
                      className="field w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor="ev-end" className="mb-1 block text-xs font-medium text-muted-foreground">
                      {addAllDay ? "End date (optional)" : "Ends (optional)"}
                    </label>
                    <input
                      key={`ev-end-${addAllDay ? "d" : "dt"}`}
                      id="ev-end"
                      name="ends_at"
                      type={addAllDay ? "date" : "datetime-local"}
                      className="field w-full"
                    />
                  </div>
                  {selectedDateKey && <input type="hidden" name="prefill_date" value={selectedDateKey} />}
                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-border px-4 py-2.5 text-sm"
                      onClick={() => setPanelOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {panelMode === "edit" && !editingRow && (
              <p className="text-sm text-muted-foreground">Event not found. Close and try again.</p>
            )}

            {panelMode === "edit" && editingRow && (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 id={titleId} className="text-lg font-semibold text-foreground">
                    Edit event
                  </h2>
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-white/10"
                    onClick={() => setPanelOpen(false)}
                  >
                    Close
                  </button>
                </div>
                <form action={updateScheduleEvent} className="form-group space-y-3">
                  <input type="hidden" name="id" value={editingRow.id} />
                  <div>
                    <label htmlFor="ed-title" className="mb-1 block text-xs font-medium text-muted-foreground">
                      Title
                    </label>
                    <input
                      id="ed-title"
                      name="title"
                      required
                      className="field w-full"
                      defaultValue={editingRow.title}
                    />
                  </div>
                  <div>
                    <label htmlFor="ed-desc" className="mb-1 block text-xs font-medium text-muted-foreground">
                      Description (optional)
                    </label>
                    <textarea
                      id="ed-desc"
                      name="description"
                      className="field w-full min-h-[72px]"
                      rows={3}
                      defaultValue={editingRow.description ?? ""}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="ed-allday"
                      name="all_day"
                      type="checkbox"
                      value="1"
                      checked={editAllDay}
                      onChange={(e) => setEditAllDay(e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <label htmlFor="ed-allday" className="text-sm text-foreground">
                      All day
                    </label>
                  </div>
                  <div>
                    <label htmlFor="ed-start" className="mb-1 block text-xs font-medium text-muted-foreground">
                      {editAllDay ? "Start date" : "Starts"}
                    </label>
                    <input
                      key={`ed-start-${editAllDay ? "d" : "dt"}`}
                      id="ed-start"
                      name="starts_at"
                      type={editAllDay ? "date" : "datetime-local"}
                      required
                      className="field w-full"
                      defaultValue={
                        editAllDay
                          ? dateOnlyValue(editingRow.starts_at)
                          : localDatetimeValue(editingRow.starts_at)
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="ed-end" className="mb-1 block text-xs font-medium text-muted-foreground">
                      {editAllDay ? "End date (optional)" : "Ends (optional)"}
                    </label>
                    <input
                      key={`ed-end-${editAllDay ? "d" : "dt"}`}
                      id="ed-end"
                      name="ends_at"
                      type={editAllDay ? "date" : "datetime-local"}
                      className="field w-full"
                      defaultValue={
                        editingRow.ends_at
                          ? editAllDay
                            ? dateOnlyValue(editingRow.ends_at)
                            : localDatetimeValue(editingRow.ends_at)
                          : ""
                      }
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                    >
                      Save changes
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-border px-4 py-2.5 text-sm"
                      onClick={() => setPanelOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
                <form action={deleteScheduleEvent} className="border-t border-white/15 pt-4">
                  <input type="hidden" name="id" value={editingRow.id} />
                  <button
                    type="submit"
                    className="text-sm font-medium text-destructive underline-offset-2 hover:underline"
                  >
                    Delete event
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
