import { Fragment, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AppLayout } from "@/components/app-layout";
import { formatPHP } from "@/lib/auth-context";
import { api, type OverdueFeeDto, type StudentFeeStatusDto } from "@/lib/api";
import { AlarmClock, ChevronDown, CircleDashed, CircleDot, RefreshCw, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import { SearchClearButton } from "@/components/search-clear";
import { Highlight } from "@/components/highlight";
import { matchesSearch } from "@/lib/search";
import { cn, toTitleCase } from "@/lib/utils";
import { Pagination, paginate } from "@/components/pagination";
import { onRecordsChanged } from "@/lib/events";
import { RecordPaymentModal } from "@/pages/Students";

export default function OverduePage() {
  return (
    <AppLayout>
      <OverdueView />
    </AppLayout>
  );
}

type OverdueRow = OverdueFeeDto;

/** Due dates come from the API as ISO strings; only the date part matters. */
function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

type StatusFilter = "all" | "Unpaid" | "Partial";

/** One student with all of their overdue fees added together (used for "All fees"). */
interface StudentGroup {
  studentId: number;
  fullName: string;
  studentNumber: string;
  yearLevel: OverdueRow["yearLevel"];
  fees: OverdueRow[]; // most overdue first
  amountDue: number;
  amountPaid: number;
  balance: number;
  daysOverdue: number; // longest wait among their fees
  earliestDue: string;
  status: OverdueRow["status"];
}

function groupByStudent(list: OverdueRow[]): StudentGroup[] {
  const map = new Map<number, OverdueRow[]>();
  list.forEach((r) => map.set(r.studentId, [...(map.get(r.studentId) ?? []), r]));
  return [...map.values()]
    .map((fees) => {
      const sorted = [...fees].sort((a, b) => b.daysOverdue - a.daysOverdue || b.balance - a.balance);
      const first = sorted[0];
      const amountPaid = sorted.reduce((s, f) => s + f.amountPaid, 0);
      return {
        studentId: first.studentId,
        fullName: first.fullName,
        studentNumber: first.studentNumber,
        yearLevel: first.yearLevel,
        fees: sorted,
        amountDue: sorted.reduce((s, f) => s + f.amountDue, 0),
        amountPaid,
        balance: sorted.reduce((s, f) => s + f.balance, 0),
        daysOverdue: first.daysOverdue,
        earliestDue: first.feeDueDate,
        // "Unpaid" only if nothing has been paid on any of their overdue fees.
        status: amountPaid > 0 ? "Partial" : "Unpaid",
      } as StudentGroup;
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue || b.balance - a.balance || a.fullName.localeCompare(b.fullName));
}

function OverdueView() {
  const [rows, setRows] = useState<OverdueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [feeFilter, setFeeFilter] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [collecting, setCollecting] = useState<OverdueRow | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpanded = (studentId: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });

  const load = async () => {
    setLoading(true);
    try {
      // The server works out which fees are overdue, the balances and the days
      // overdue, and returns them most overdue first.
      setRows(await api.getOverdueFees());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load overdue fees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Refresh when a payment is recorded anywhere in the app.
    return onRecordsChanged(() => load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q, feeFilter, statusFilter]);

  // One chip per overdue fee, taken from the rows the server returned.
  const fees = useMemo(() => {
    const map = new Map<number, string>();
    rows.forEach((r) => map.set(r.feeId, r.feeName));
    return [...map.entries()].map(([feeId, name]) => ({ feeId, name }));
  }, [rows]);

  // If the selected fee is no longer overdue (all paid), fall back to "All fees".
  useEffect(() => {
    if (feeFilter !== "all" && !fees.some((f) => f.feeId === feeFilter)) setFeeFilter("all");
  }, [fees, feeFilter]);

  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (feeFilter === "all" || r.feeId === feeFilter) &&
          (statusFilter === "all" || r.status === statusFilter) &&
          matchesSearch(q, r.fullName, r.studentNumber, r.feeName),
      ),
    [rows, q, feeFilter, statusFilter],
  );

  // "All fees" → one row per student with their total; a single fee → one row per fee.
  const grouped = feeFilter === "all";
  const groups = useMemo(() => groupByStudent(visible), [visible]);
  const listLength = grouped ? groups.length : visible.length;

  const totalOutstanding = visible.reduce((sum, r) => sum + r.balance, 0);
  const studentCount = new Set(visible.map((r) => r.studentId)).size;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <AlarmClock className="h-3 w-3 text-destructive" /> Collections
          </div>
          <h1 className="display text-4xl md:text-5xl mt-3">Overdue fees.</h1>
          <p className="text-muted-foreground mt-3 max-w-lg text-sm leading-relaxed">
            Students with unpaid or partially paid fees past their due date — who still owes, how much, and for how long.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn btn-ghost disabled:opacity-50">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
        </button>
      </header>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="surface p-6">
          <div className="eyebrow">Outstanding balance</div>
          <div className="mono text-3xl mt-3 text-destructive">{formatPHP(totalOutstanding)}</div>
          <div className="mono text-[11px] text-muted-foreground mt-2">across the list below</div>
        </div>
        <div className="surface p-6">
          <div className="eyebrow">Students overdue</div>
          <div className="mono text-3xl mt-3">{studentCount}</div>
          <div className="mono text-[11px] text-muted-foreground mt-2">
            {visible.length} overdue fee record{visible.length === 1 ? "" : "s"}
          </div>
        </div>
        <div className="surface p-6">
          <div className="eyebrow">Fees past due</div>
          <div className="mono text-3xl mt-3 text-amber">{fees.length}</div>
          <div className="mono text-[11px] text-muted-foreground mt-2">with balances still unpaid</div>
        </div>
      </div>

      <div className="surface p-3 space-y-2">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search student name, student number, fee…"
            className="w-full bg-transparent pl-9 pr-9 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70"
          />
          <SearchClearButton value={q} onClear={() => setQ("")} />
        </div>
        <div className="flex items-center gap-3 pt-1 hairline-t flex-wrap">
          <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground w-12 shrink-0">Status</span>
          <div className="flex items-center gap-1 flex-wrap">
            {(["all", "Unpaid", "Partial"] as StatusFilter[]).map((s) => (
              <Chip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                {s === "all" ? "All" : s}
              </Chip>
            ))}
          </div>
        </div>
        {fees.length > 0 && (
          <div className="flex items-center gap-3 pt-1 hairline-t flex-wrap">
            <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground w-12 shrink-0">Fee</span>
            <div className="flex items-center gap-1 flex-wrap">
              <Chip active={feeFilter === "all"} onClick={() => setFeeFilter("all")}>
                All fees
              </Chip>
              {fees.map((f) => (
                <Chip key={f.feeId} active={feeFilter === f.feeId} onClick={() => setFeeFilter(f.feeId)}>
                  {f.name}
                </Chip>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="eyebrow text-left hairline-b">
                <th className="px-5 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">{grouped ? "Fees" : "Fee"}</th>
                <th className="px-4 py-3 font-semibold">{grouped ? "Earliest due" : "Due date"}</th>
                <th className="px-4 py-3 font-semibold">Overdue</th>
                <th className="px-4 py-3 font-semibold text-right">Paid</th>
                <th className="px-4 py-3 font-semibold text-right">{grouped ? "Total balance" : "Balance"}</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-14 text-center mono text-xs text-muted-foreground">
                    LOADING…
                  </td>
                </tr>
              ) : listLength === 0 ? (
                <tr>
                  <td colSpan={8} className="p-14 text-center">
                    <div className="mono text-xs text-muted-foreground">
                      {rows.length === 0 ? "NO OVERDUE FEES" : "NO MATCHES"}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      {rows.length === 0
                        ? "Every student is up to date on fees past their due date."
                        : "Try a different search or filter."}
                    </div>
                  </td>
                </tr>
              ) : grouped ? (
                paginate(groups, page).map((g) => {
                  const open = expanded.has(g.studentId);
                  return (
                    <Fragment key={g.studentId}>
                      <tr
                        onClick={() => toggleExpanded(g.studentId)}
                        className="hover:bg-muted/40 transition cursor-pointer"
                        title={open ? "Hide fee breakdown" : "Show fee breakdown"}
                      >
                        <td className="px-5 py-4">
                          <div className="font-medium flex items-center gap-1.5">
                            <ChevronDown
                              className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")}
                            />
                            <Highlight text={toTitleCase(g.fullName)} query={q} />
                          </div>
                          <div className="mono text-[10px] text-muted-foreground pl-5">
                            <Highlight text={g.studentNumber} query={q} /> · Year {g.yearLevel}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <FeesHover fees={g.fees} query={q} />
                        </td>
                        <td className="px-4 py-4 mono text-xs whitespace-nowrap">{formatDate(g.earliestDue)}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <OverdueBadge days={g.daysOverdue} />
                        </td>
                        <td className="px-4 py-4 mono text-xs text-right whitespace-nowrap">
                          {formatPHP(g.amountPaid)}
                          <span className="text-muted-foreground"> / {formatPHP(g.amountDue)}</span>
                        </td>
                        <td className="px-4 py-4 mono text-xs text-right text-destructive whitespace-nowrap font-semibold">
                          {formatPHP(g.balance)}
                        </td>
                        <td className="px-4 py-4">
                          <StatusPill status={g.status} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <CollectButton
                            onClick={(e) => {
                              e.stopPropagation();
                              setCollecting(g.fees[0]); // starts on their most overdue fee
                            }}
                          />
                        </td>
                      </tr>
                      {open &&
                        g.fees.map((f) => (
                          <tr key={`${g.studentId}-${f.feeId}`} className="bg-muted/20">
                            <td className="px-5 py-2.5 mono text-[10px] text-muted-foreground pl-10">└ fee</td>
                            <td className="px-4 py-2.5">
                              <div className="text-xs">
                                <Highlight text={f.feeName} query={q} />
                              </div>
                              <div className="mono text-[10px] text-muted-foreground">{f.feeCategory}</div>
                            </td>
                            <td className="px-4 py-2.5 mono text-xs whitespace-nowrap">{formatDate(f.feeDueDate)}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <OverdueBadge days={f.daysOverdue} />
                            </td>
                            <td className="px-4 py-2.5 mono text-xs text-right whitespace-nowrap">
                              {formatPHP(f.amountPaid)}
                              <span className="text-muted-foreground"> / {formatPHP(f.amountDue)}</span>
                            </td>
                            <td className="px-4 py-2.5 mono text-xs text-right text-destructive whitespace-nowrap">
                              {formatPHP(f.balance)}
                            </td>
                            <td className="px-4 py-2.5">
                              <StatusPill status={f.status} />
                            </td>
                            <td className="px-5 py-2.5 text-right">
                              <CollectButton onClick={() => setCollecting(f)} />
                            </td>
                          </tr>
                        ))}
                    </Fragment>
                  );
                })
              ) : (
                paginate(visible, page).map((r) => (
                  <tr key={`${r.studentId}-${r.feeId}`} className="hover:bg-muted/40 transition">
                    <td className="px-5 py-4">
                      <div className="font-medium">
                        <Highlight text={toTitleCase(r.fullName)} query={q} />
                      </div>
                      <div className="mono text-[10px] text-muted-foreground">
                        <Highlight text={r.studentNumber} query={q} /> · Year {r.yearLevel}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <Highlight text={r.feeName} query={q} />
                      </div>
                      <div className="mono text-[10px] text-muted-foreground">{r.feeCategory}</div>
                    </td>
                    <td className="px-4 py-4 mono text-xs whitespace-nowrap">{formatDate(r.feeDueDate)}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <OverdueBadge days={r.daysOverdue} />
                    </td>
                    <td className="px-4 py-4 mono text-xs text-right whitespace-nowrap">
                      {formatPHP(r.amountPaid)}
                      <span className="text-muted-foreground"> / {formatPHP(r.amountDue)}</span>
                    </td>
                    <td className="px-4 py-4 mono text-xs text-right text-destructive whitespace-nowrap">
                      {formatPHP(r.balance)}
                    </td>
                    <td className="px-4 py-4">
                      <StatusPill status={r.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <CollectButton onClick={() => setCollecting(r)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && listLength > 0 && (
          <Pagination page={page} totalItems={listLength} onPageChange={setPage} />
        )}
      </div>

      {collecting && (
        <RecordPaymentModal
          student={{
            studentId: collecting.studentId,
            fullName: collecting.fullName,
            studentNumber: collecting.studentNumber,
            yearLevel: collecting.yearLevel,
          }}
          initialFeeId={collecting.feeId}
          onClose={() => setCollecting(null)}
          onSaved={() => {
            setCollecting(null);
            load();
          }}
        />
      )}
    </div>
  );
}

/**
 * "4 fees" label that shows the fee names in a small popup on hover.
 * The popup is rendered into <body> with fixed positioning so the table's
 * scroll container can't clip it.
 */
function FeesHover({ fees, query }: { fees: OverdueRow[]; query: string }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const show = (e: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left });
  };
  const hide = () => setPos(null);

  return (
    <>
      <span
        tabIndex={0}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="cursor-help underline decoration-dotted decoration-muted-foreground/60 underline-offset-4 outline-none"
      >
        {fees.length} fee{fees.length === 1 ? "" : "s"}
      </span>
      {pos &&
        createPortal(
          <div
            role="tooltip"
            className="fixed z-[120] min-w-[200px] max-w-xs rounded-lg border border-border bg-popover/95 backdrop-blur-md px-3 py-2.5 shadow-xl animate-fade-in pointer-events-none"
            style={{ top: pos.top, left: pos.left, background: "var(--popover, var(--card))" }}
          >
            <div className="eyebrow mb-1.5">Overdue fees</div>
            <ul className="space-y-1">
              {fees.map((f) => (
                <li key={f.feeId} className="flex items-center justify-between gap-4 text-xs">
                  <span className="truncate">
                    <Highlight text={f.feeName} query={query} />
                  </span>
                  <span className="mono text-destructive shrink-0">{formatPHP(f.balance)}</span>
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}

function CollectButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-emerald hover:bg-emerald/10 transition"
      title="Record a payment"
    >
      <Wallet className="h-3.5 w-3.5" /> Collect
    </button>
  );
}

function OverdueBadge({ days }: { days: number }) {
  // Longer overdue → stronger colour.
  const cls =
    days > 30
      ? "text-destructive ring-destructive/40 bg-destructive/10"
      : days > 7
        ? "text-amber ring-amber/30 bg-amber/5"
        : "text-muted-foreground ring-border bg-muted/40";
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] mono ring-1", cls)}>
      <AlarmClock className="h-3 w-3" />
      {days} day{days === 1 ? "" : "s"}
    </span>
  );
}

function StatusPill({ status }: { status: StudentFeeStatusDto["status"] }) {
  const partial = status === "Partial";
  const Icon = partial ? CircleDot : CircleDashed;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest mono ring-1",
        partial ? "text-amber ring-amber/30 bg-amber/5" : "text-muted-foreground ring-border bg-muted/40",
      )}
    >
      <Icon className="h-3 w-3" /> {status}
    </span>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-md text-xs transition",
        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
