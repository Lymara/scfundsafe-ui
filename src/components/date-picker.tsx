import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseISO(v: string): Date | null {
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Replaces the native <input type="date"> popup calendar, which every
 * browser renders as an internal, non-stylable widget - there is no CSS
 * that can recolor it. This is a fully custom implementation instead, so it
 * matches the rest of the app exactly.
 */
export function DatePicker({
  value,
  onChange,
  label,
  dense = false,
  placeholder = "Select date",
  disablePast = false,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Renders as a full floating-label field (like FloatField). Omit for the compact inline variant. */
  label?: string;
  /** Compact trigger for inline filter bars - no floating label, smaller text. */
  dense?: boolean;
  placeholder?: string;
  /** Grays out and blocks any day before today. Off by default - most date
   * fields here (recording a past income/expense, editing an old record,
   * running a report for a prior month, calculating an overdue fine) need
   * to allow past dates on purpose. */
  disablePast?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseISO(value);
  const [viewDate, setViewDate] = useState(() => selected ?? new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) setViewDate(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const grid = useMemo(() => {
    const first = new Date(year, month, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = startWeekday - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), inMonth: true });
    }
    let nextDay = 1;
    while (cells.length < 42) {
      cells.push({ date: new Date(year, month + 1, nextDay), inMonth: false });
      nextDay += 1;
    }
    return cells;
  }, [year, month]);

  const display = selected
    ? selected.toLocaleDateString("en-PH", { month: dense ? "short" : "2-digit", day: "2-digit", year: "numeric" })
    : "";

  const panel = open && (
    <div className="absolute z-30 mt-2 w-52 surface-lift p-2.5 left-0">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-xs font-semibold">
          {MONTH_NAMES[month]} {year}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
            aria-label="Previous month"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
            aria-label="Next month"
          >
            <ArrowDown className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-0.5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[9px] text-muted-foreground mono">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {grid.map((c, i) => {
          const isSelected = !!selected && sameDay(c.date, selected);
          const isToday = sameDay(c.date, today);
          const isPast = disablePast && c.date.getTime() < todayMidnight.getTime();
          return (
            <button
              key={i}
              type="button"
              disabled={isPast}
              onClick={() => {
                onChange(toISO(c.date));
                setOpen(false);
              }}
              className={cn(
                "h-6 w-6 rounded-md text-[10px] transition mono",
                !c.inMonth && !isPast && "text-muted-foreground/30 hover:bg-muted/40",
                c.inMonth && !isSelected && !isPast && "text-foreground hover:bg-muted",
                isSelected && !isPast && "bg-emerald text-[oklch(0.14_0.02_165)] font-semibold hover:bg-emerald",
                isToday && !isSelected && !isPast && "ring-1 ring-emerald/50",
                isPast && "text-muted-foreground/25 cursor-not-allowed pointer-events-none",
              )}
            >
              {c.date.getDate()}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-1.5 pt-1.5 hairline-t text-[10px]">
        <button
          type="button"
          onClick={() => {
            onChange("");
            setOpen(false);
          }}
          className="text-muted-foreground hover:text-foreground transition"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(toISO(today));
            setViewDate(today);
            setOpen(false);
          }}
          className="text-emerald hover:underline"
        >
          Today
        </button>
      </div>
    </div>
  );

  if (dense) {
    return (
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "mono text-xs bg-transparent border-b border-border py-1.5 outline-none transition text-left min-w-[92px]",
            display ? "text-foreground hover:text-foreground" : "text-muted-foreground hover:text-foreground",
            open && "border-emerald",
          )}
        >
          {display || placeholder}
        </button>
        {panel}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="field is-filled">
        <button type="button" onClick={() => setOpen((o) => !o)} className="field-trigger">
          {display || <span className="text-muted-foreground">{placeholder}</span>}
        </button>
        {label && <span className="field-label">{label}</span>}
      </label>
      {panel}
    </div>
  );
}
