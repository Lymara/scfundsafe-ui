import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { formatPHP } from "@/lib/auth-context";
import { api, type FeeDto } from "@/lib/api";
import { SelectPicker } from "@/components/select-picker";
import { DatePicker } from "@/components/date-picker";
import { Calculator as CalculatorIcon, Delete, AlertTriangle, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function CalculatorPage() {
  const [tab, setTab] = useState<"basic" | "fines">("basic");

  return (
    <AppLayout>
      <div className="space-y-8">
        <header>
          <div className="eyebrow flex items-center gap-2">
            <CalculatorIcon className="h-3 w-3 text-amber" /> Tools
          </div>
          <h1 className="display text-4xl md:text-5xl mt-3">Calculator.</h1>
          <p className="text-muted-foreground mt-3 max-w-lg text-sm leading-relaxed">
            A quick basic calculator, plus a fines calculator for working out late fees on an overdue
            fee or any custom date range.
          </p>
        </header>

        <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg w-fit">
          {(["basic", "fines"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-1.5 rounded-md text-xs font-medium transition",
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "basic" ? "Basic Calculator" : "Fines Calculator"}
            </button>
          ))}
        </div>

        {tab === "basic" ? <BasicCalculator /> : <FinesCalculator />}
      </div>
    </AppLayout>
  );
}

/* ---------------- Basic Calculator ---------------- */

function BasicCalculator() {
  const [display, setDisplay] = useState("0");
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<"+" | "−" | "×" | "÷" | null>(null);
  const [justEvaluated, setJustEvaluated] = useState(false);

  const inputDigit = (d: string) => {
    if (justEvaluated) {
      setDisplay(d === "." ? "0." : d);
      setJustEvaluated(false);
      return;
    }
    if (d === "." && display.includes(".")) return;
    setDisplay((cur) => (cur === "0" && d !== "." ? d : cur + d));
  };

  const clear = () => {
    setDisplay("0");
    setPrev(null);
    setOp(null);
    setJustEvaluated(false);
  };

  const backspace = () => {
    setDisplay((cur) => (cur.length > 1 ? cur.slice(0, -1) : "0"));
  };

  const applyOp = (a: number, b: number, operator: typeof op): number => {
    switch (operator) {
      case "+":
        return a + b;
      case "−":
        return a - b;
      case "×":
        return a * b;
      case "÷":
        return b === 0 ? NaN : a / b;
      default:
        return b;
    }
  };

  const chooseOp = (nextOp: "+" | "−" | "×" | "÷") => {
    const current = parseFloat(display);
    if (prev !== null && op && !justEvaluated) {
      const result = applyOp(prev, current, op);
      setPrev(result);
      setDisplay(String(Number.isFinite(result) ? round(result) : "Error"));
    } else {
      setPrev(current);
    }
    setOp(nextOp);
    // Next digit typed should start a fresh number, not append to the one
    // that's still showing on screen.
    setJustEvaluated(true);
  };

  const evaluate = () => {
    if (prev === null || !op) return;
    const current = parseFloat(display);
    const result = applyOp(prev, current, op);
    setDisplay(Number.isFinite(result) ? String(round(result)) : "Error");
    setPrev(null);
    setOp(null);
    setJustEvaluated(true);
  };

  const round = (n: number) => Math.round(n * 1e8) / 1e8;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        inputDigit(e.key);
        return;
      }
      switch (e.key) {
        case ".":
          e.preventDefault();
          inputDigit(".");
          break;
        case "+":
          e.preventDefault();
          chooseOp("+");
          break;
        case "-":
          e.preventDefault();
          chooseOp("−");
          break;
        case "*":
          e.preventDefault();
          chooseOp("×");
          break;
        case "/":
          e.preventDefault();
          chooseOp("÷");
          break;
        case "%":
          e.preventDefault();
          setDisplay((cur) => String(round(parseFloat(cur) / 100)));
          break;
        case "Enter":
        case "=":
          e.preventDefault();
          evaluate();
          break;
        case "Backspace":
          e.preventDefault();
          backspace();
          break;
        case "Escape":
        case "Delete":
          e.preventDefault();
          clear();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display, prev, op, justEvaluated]);

  const buttons: { label: string; onClick: () => void; tone?: "op" | "primary" | "muted" }[] = [
    { label: "C", onClick: clear, tone: "muted" },
    { label: "⌫", onClick: backspace, tone: "muted" },
    { label: "%", onClick: () => setDisplay((cur) => String(round(parseFloat(cur) / 100))), tone: "muted" },
    { label: "÷", onClick: () => chooseOp("÷"), tone: "op" },
    { label: "7", onClick: () => inputDigit("7") },
    { label: "8", onClick: () => inputDigit("8") },
    { label: "9", onClick: () => inputDigit("9") },
    { label: "×", onClick: () => chooseOp("×"), tone: "op" },
    { label: "4", onClick: () => inputDigit("4") },
    { label: "5", onClick: () => inputDigit("5") },
    { label: "6", onClick: () => inputDigit("6") },
    { label: "−", onClick: () => chooseOp("−"), tone: "op" },
    { label: "1", onClick: () => inputDigit("1") },
    { label: "2", onClick: () => inputDigit("2") },
    { label: "3", onClick: () => inputDigit("3") },
    { label: "+", onClick: () => chooseOp("+"), tone: "op" },
    { label: "0", onClick: () => inputDigit("0") },
    { label: ".", onClick: () => inputDigit(".") },
    { label: "=", onClick: evaluate, tone: "primary" },
  ];

  return (
    <div className="max-w-sm">
      <div className="surface-lift p-6">
        <div className="text-right">
          <div className="mono text-[11px] text-muted-foreground h-4">
            {prev !== null && op ? `${round(prev)} ${op}` : "\u00A0"}
          </div>
          <div className="mono text-4xl font-medium mt-1 truncate">{display}</div>
        </div>
        <div className="grid grid-cols-4 gap-2 mt-6">
          {buttons.map((b, i) => (
            <button
              key={i}
              onClick={b.onClick}
              className={cn(
                "h-14 rounded-xl text-lg font-medium transition active:scale-95",
                b.label === "0" ? "col-span-1" : "",
                b.tone === "primary"
                  ? "gradient-emerald text-[oklch(0.14_0.02_165)]"
                  : b.tone === "op"
                    ? "bg-amber/10 text-amber hover:bg-amber/20"
                    : b.tone === "muted"
                      ? "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/70"
                      : "bg-muted/50 hover:bg-muted transition",
              )}
            >
              {b.label === "⌫" ? <Delete className="h-4 w-4 mx-auto" /> : b.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Fines Calculator ---------------- */

function FinesCalculator() {
  const [mode, setMode] = useState<"event" | "custom">("event");
  const [fees, setFees] = useState<FeeDto[]>([]);
  const [feeId, setFeeId] = useState<string>("");
  const [calculateUntil, setCalculateUntil] = useState(new Date().toISOString().slice(0, 10));
  const [finePerDayEvent, setFinePerDayEvent] = useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [finePerDayCustom, setFinePerDayCustom] = useState("");

  useEffect(() => {
    api
      .getFees()
      .then(setFees)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load fees"));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const overdueFees = useMemo(() => fees.filter((f) => f.dueDate.slice(0, 10) < today), [fees, today]);
  const selectedFee = overdueFees.find((f) => String(f.feeId) === feeId) ?? null;

  const daysBetween = (a: string, b: string) => {
    if (!a || !b) return 0;
    const start = new Date(a + "T00:00:00");
    const end = new Date(b + "T00:00:00");
    const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const eventDays = selectedFee ? daysBetween(selectedFee.dueDate.slice(0, 10), calculateUntil) : 0;
  const eventFine = selectedFee && eventDays > 0 ? eventDays * (parseFloat(finePerDayEvent) || 0) : 0;

  const invalidRange = Boolean(startDate && endDate && startDate > endDate);
  const customDays = daysBetween(startDate, endDate);
  const customFine = customDays > 0 ? customDays * (parseFloat(finePerDayCustom) || 0) : 0;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="surface p-2 flex items-center gap-1 w-fit">
        {(["event", "custom"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              "px-3.5 py-1.5 rounded-md text-xs font-medium transition",
              mode === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {m === "event" ? "Based on an event" : "Custom date range"}
          </button>
        ))}
      </div>

      {mode === "event" ? (
        <div className="surface-lift p-8 space-y-6">
          <div>
            <span className="eyebrow">Overdue fee / event</span>
            <div className="mt-2">
              {overdueFees.length === 0 ? (
                <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 border border-border/70 rounded-lg px-3 py-2.5">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber" />
                  No fees are past their due date right now — nothing to calculate a fine on yet.
                </div>
              ) : (
                <SelectPicker
                  label="Fee"
                  value={feeId}
                  placeholder="Select an overdue fee…"
                  options={overdueFees.map((f) => ({
                    value: String(f.feeId),
                    label: `${f.name} — due ${new Date(f.dueDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`,
                  }))}
                  onChange={setFeeId}
                />
              )}
            </div>
          </div>

          {selectedFee && (
            <>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <FloatField label="Fine per day (PHP)" value={finePerDayEvent}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={finePerDayEvent}
                    onChange={(e) => setFinePerDayEvent(e.target.value)}
                  />
                </FloatField>
                <DatePicker label="Calculate until" value={calculateUntil} onChange={setCalculateUntil} />
              </div>

              <ResultCard
                days={eventDays}
                finePerDay={parseFloat(finePerDayEvent) || 0}
                total={eventFine}
                fromLabel={`Due ${new Date(selectedFee.dueDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`}
                toLabel={new Date(calculateUntil).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
              />
            </>
          )}
        </div>
      ) : (
        <div className="surface-lift p-8 space-y-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <DatePicker label="Start date" value={startDate} onChange={setStartDate} />
            <DatePicker label="End date" value={endDate} onChange={setEndDate} />
          </div>
          {invalidRange && (
            <p className="text-xs text-destructive flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Start date can't be after end date.
            </p>
          )}
          <FloatField label="Fine per day (PHP)" value={finePerDayCustom}>
            <input type="number" step="0.01" min="0" value={finePerDayCustom} onChange={(e) => setFinePerDayCustom(e.target.value)} />
          </FloatField>

          {startDate && endDate && !invalidRange && (
            <ResultCard
              days={customDays}
              finePerDay={parseFloat(finePerDayCustom) || 0}
              total={customFine}
              fromLabel={new Date(startDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
              toLabel={new Date(endDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
            />
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">
        This is a calculator only — it doesn't create a fee or charge anyone automatically. Once you have
        the number, you can record it as a "Fines" fee/source from{" "}
        <a href="/income" className="text-emerald hover:underline">
          Income → Fees & Sources
        </a>
        .
      </p>
    </div>
  );
}

function ResultCard({
  days,
  finePerDay,
  total,
  fromLabel,
  toLabel,
}: {
  days: number;
  finePerDay: number;
  total: number;
  fromLabel: string;
  toLabel: string;
}) {
  if (days <= 0) {
    return (
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 border border-border/70 rounded-lg px-3.5 py-3">
        <CalendarClock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <div>
          {fromLabel} to {toLabel} isn't a positive range — nothing is overdue there, so the fine is ₱0.00.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald/30 bg-emerald/5 p-5">
      <div className="eyebrow">Total fine</div>
      <div className="mono text-4xl mt-2 text-emerald">{formatPHP(total)}</div>
      <div className="mono text-[11px] text-muted-foreground mt-2">
        {days} day{days === 1 ? "" : "s"} × {formatPHP(finePerDay)}/day · {fromLabel} → {toLabel}
      </div>
    </div>
  );
}

function FloatField({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <label className={"field" + (value ? " is-filled" : "")}>
      {children}
      <span className="field-label">{label}</span>
    </label>
  );
}
