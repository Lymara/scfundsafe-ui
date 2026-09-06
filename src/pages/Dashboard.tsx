import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { useAuth, formatPHP } from "@/lib/auth-context";
import { api, type BalanceDto, type FundRecordDto, type StudentDto, type YearLevel } from "@/lib/api";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ArrowRight,
  Receipt,
  Users,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export default function DashboardPage() {
  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  );
}

function Dashboard() {
  const { currentUser } = useAuth();
  const [balance, setBalance] = useState<BalanceDto | null>(null);
  const [recent, setRecent] = useState<FundRecordDto[]>([]);
  const [allRecords, setAllRecords] = useState<FundRecordDto[]>([]);
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const today = new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" });
  const canRecord = currentUser?.role === "Treasurer";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [balanceRes, recordsRes, studentsRes] = await Promise.all([
          api.getBalance(),
          api.getAllRecords(),
          api.getStudents({}),
        ]);
        if (cancelled) return;
        setBalance(balanceRes);
        setTotal(recordsRes.length);
        setAllRecords(recordsRes);
        setRecent(recordsRes.slice(0, 6));
        setStudents(studentsRes);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load dashboard data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const monthly = useMemo(() => {
    const map = new Map<string, { month: string; income: number; expense: number }>();
    [...allRecords]
      .sort((a, b) => (a.recordDate < b.recordDate ? -1 : 1))
      .forEach((r) => {
        const key = r.recordDate.slice(0, 7);
        const row = map.get(key) ?? { month: key, income: 0, expense: 0 };
        if (r.recordType === "Income") row.income += r.amount;
        else row.expense += r.amount;
        map.set(key, row);
      });
    return [...map.values()].slice(-8);
  }, [allRecords]);

  const perYear = useMemo(
    () =>
      ([1, 2, 3, 4] as YearLevel[]).map((yl) => {
        const rows = students.filter((s) => s.yearLevel === yl);
        return {
          yearLevel: yl,
          count: rows.length,
          paid: rows.filter((s) => s.status === "Paid").length,
          pending: rows.filter((s) => s.status !== "Paid").length,
          collected: rows.reduce((s, r) => s + r.totalPaid, 0),
          outstanding: rows.reduce((s, r) => s + r.balance, 0),
        };
      }),
    [students],
  );

  const totalCollected = students.reduce((s, r) => s + r.totalPaid, 0);
  const totalExpected = students.reduce((s, r) => s + r.totalDue, 0);
  const collectRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const studentsWithBalance = students.filter((s) => s.balance > 0).length;

  return (
    <div className="space-y-14">
      {/* Hero */}
      <header>
        <div className="flex items-center justify-between mb-6">
          <div className="eyebrow flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald dot-pulse" /> BSIT Department Council · Overview
          </div>
          <div className="text-xs text-muted-foreground mono">{today}</div>
        </div>
        <h1 className="display text-4xl md:text-6xl">
          Good day, <span className="gradient-text">{currentUser?.fullName.split(" ")[0]}</span>.
        </h1>
        <p className="text-muted-foreground mt-3 max-w-lg text-sm leading-relaxed">
          Here's the state of the IT department council fund — collections, expenses, and every student's standing.
        </p>
      </header>

      {/* Balance panel */}
      <section className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <div className="surface-lift p-8 md:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-emerald/8 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-amber/8 blur-3xl" />
          <div className="relative z-10">
            <div className="eyebrow">Current fund balance</div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="mono text-5xl md:text-6xl font-medium tracking-tight">
                {loading ? "…" : formatPHP(balance?.currentBalance ?? 0)}
              </span>
            </div>
            <div className="mt-3 mono text-[11px] text-muted-foreground">
              LIVE · {total} record{total === 1 ? "" : "s"} · {students.length} students
            </div>

            {totalExpected > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between text-[11px] mono">
                  <span className="text-muted-foreground">Collection rate</span>
                  <span>
                    {formatPHP(totalCollected)} / {formatPHP(totalExpected)} · {collectRate}%
                  </span>
                </div>
                <div className="h-2 mt-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full gradient-emerald transition-all duration-700" style={{ width: `${collectRate}%` }} />
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-2">
              {canRecord && (
                <>
                  <Link to="/students" className="btn btn-primary">
                    <Receipt className="h-3.5 w-3.5" /> Collect payment
                  </Link>
                  <Link to="/income" className="btn btn-ghost">
                    <Plus className="h-3.5 w-3.5" /> Income
                  </Link>
                  <Link to="/expenses" className="btn btn-ghost">
                    <Plus className="h-3.5 w-3.5" /> Expense
                  </Link>
                </>
              )}
              <Link to="/students" className="btn btn-ghost">
                <Users className="h-3.5 w-3.5" /> Students
              </Link>
              <Link to="/reports" className="btn btn-ghost">
                Reports <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <StatCard icon={<TrendingUp className="h-4 w-4" />} tone="emerald" label="Total income" value={formatPHP(balance?.totalIncome ?? 0)} />
          <StatCard icon={<TrendingDown className="h-4 w-4" />} tone="destructive" label="Total expense" value={formatPHP(balance?.totalExpense ?? 0)} />
          <StatCard
            icon={<AlertTriangle className="h-4 w-4" />}
            tone="amber"
            label="Students with balance"
            value={`${studentsWithBalance} of ${students.length}`}
          />
        </div>
      </section>

      {/* Charts */}
      {(monthly.length > 0 || students.length > 0) && (
        <section className="grid lg:grid-cols-2 gap-6">
          <div className="surface p-6">
            <div className="eyebrow">Cash flow</div>
            <h2 className="display text-xl mt-1 mb-4">Income vs expense</h2>
            {monthly.length > 0 ? (
              <AreaChart rows={monthly} />
            ) : (
              <div className="h-[220px] grid place-items-center text-xs text-muted-foreground">No records yet.</div>
            )}
          </div>
          <div className="surface p-6">
            <div className="eyebrow">Per year level</div>
            <h2 className="display text-xl mt-1 mb-4">Collected vs outstanding</h2>
            {students.length > 0 ? (
              <YearBarChart rows={perYear} />
            ) : (
              <div className="h-[220px] grid place-items-center text-xs text-muted-foreground">No students yet.</div>
            )}
          </div>
        </section>
      )}

      {/* Year level status */}
      {students.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-5">
            <div>
              <div className="eyebrow">Payment standing</div>
              <h2 className="display text-2xl mt-1">Year level status</h2>
            </div>
            <Link to="/students" className="text-xs text-foreground link-hover flex items-center gap-1">
              Student ledger <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {perYear.map((y) => (
              <div key={y.yearLevel} className="surface p-5 hover:-translate-y-0.5 transition-transform duration-300">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Year {y.yearLevel}</div>
                  <span className="mono text-[10px] text-muted-foreground">{y.count} students</span>
                </div>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="mono text-2xl text-emerald">{y.paid}</span>
                  <span className="text-xs text-muted-foreground">paid</span>
                  <span className="mono text-lg text-destructive ml-auto">{y.pending}</span>
                  <span className="text-xs text-muted-foreground">pending</span>
                </div>
                <div className="h-1.5 mt-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full gradient-emerald" style={{ width: `${y.count ? (y.paid / y.count) * 100 : 0}%` }} />
                </div>
                <div className="mono text-[10px] text-muted-foreground mt-2">Outstanding {formatPHP(y.outstanding)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent activity */}
      <section>
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="eyebrow">Latest movements</div>
            <h2 className="display text-2xl mt-1">Recent activity</h2>
          </div>
          <Link to="/records" className="text-xs text-foreground link-hover flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="surface overflow-hidden">
          {!loading && recent.length === 0 ? (
            <div className="p-14 text-center">
              <div className="mono text-xs text-muted-foreground">EMPTY</div>
              <div className="mt-2 text-sm text-muted-foreground">No records yet. Start by recording income or expense.</div>
            </div>
          ) : (
            <div className="divide-y divide-border/70">
              {recent.map((t, i) => (
                <div
                  key={t.recordId}
                  className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4 hover:bg-muted/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="mono text-[10px] text-muted-foreground w-6">{String(i + 1).padStart(2, "0")}</span>
                    <div
                      className={`h-8 w-8 rounded-full grid place-items-center border ${
                        t.recordType === "Income"
                          ? "border-emerald/25 text-emerald bg-emerald/5"
                          : "border-destructive/25 text-destructive bg-destructive/5"
                      }`}
                    >
                      {t.recordType === "Income" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.purpose || t.source || "—"}</div>
                    <div className="text-[11px] text-muted-foreground mono mt-0.5">
                      {t.recordDate.slice(0, 10)} · {t.recordType === "Income" ? t.source ?? "Income" : "Expense"}
                    </div>
                  </div>
                  <div className={`mono font-medium ${t.recordType === "Income" ? "text-emerald" : "text-destructive"}`}>
                    {t.recordType === "Income" ? "+" : "−"}
                    {formatPHP(t.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  tone,
  label,
  value,
}: {
  icon: React.ReactNode;
  tone: "emerald" | "destructive" | "amber";
  label: string;
  value: string;
}) {
  const color = tone === "emerald" ? "text-emerald" : tone === "amber" ? "text-amber" : "text-destructive";
  return (
    <div className="surface p-6 hover:-translate-y-0.5 transition-transform duration-300">
      <div className="flex items-center justify-between">
        <div className="eyebrow">{label}</div>
        <span className={`${color} opacity-80`}>{icon}</span>
      </div>
      <div className={`mono text-2xl mt-4 ${color}`}>{value}</div>
    </div>
  );
}

/* ---------------- Charts ---------------- */

function AreaChart({ rows }: { rows: { month: string; income: number; expense: number }[] }) {
  const width = 560;
  const height = 220;
  const padding = { top: 10, right: 10, bottom: 24, left: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(1, ...rows.map((r) => Math.max(r.income, r.expense)));
  const stepX = rows.length > 1 ? chartW / (rows.length - 1) : 0;
  const scaleY = (v: number) => chartH - (v / maxVal) * chartH;

  const pointsFor = (key: "income" | "expense") =>
    rows.map((r, i) => `${padding.left + stepX * i},${padding.top + scaleY(r[key])}`).join(" ");

  const areaFor = (key: "income" | "expense") => {
    const pts = rows.map((r, i) => `${padding.left + stepX * i},${padding.top + scaleY(r[key])}`);
    const first = `${padding.left},${padding.top + chartH}`;
    const last = `${padding.left + stepX * (rows.length - 1)},${padding.top + chartH}`;
    return `${first} ${pts.join(" ")} ${last}`;
  };

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxVal * f));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[220px]">
      {ticks.map((t, i) => {
        const y = padding.top + scaleY(t);
        return (
          <g key={i}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--border)" strokeDasharray="3 3" />
            <text x={padding.left - 6} y={y + 3} textAnchor="end" fontSize="9" fill="var(--muted-foreground)" className="mono">
              {t >= 1000 ? `${Math.round(t / 1000)}k` : t}
            </text>
          </g>
        );
      })}
      <polygon points={areaFor("income")} fill="var(--emerald)" opacity={0.18} />
      <polygon points={areaFor("expense")} fill="var(--amber)" opacity={0.15} />
      <polyline points={pointsFor("income")} fill="none" stroke="var(--emerald)" strokeWidth={2} />
      <polyline points={pointsFor("expense")} fill="none" stroke="var(--amber)" strokeWidth={2} />
      {rows.map((r, i) => (
        <text
          key={r.month}
          x={padding.left + stepX * i}
          y={height - 6}
          textAnchor="middle"
          fontSize="9"
          fill="var(--muted-foreground)"
          className="mono"
        >
          {r.month.slice(2)}
        </text>
      ))}
      <g transform={`translate(${width - 150}, 4)`} className="mono" fontSize="10">
        <rect width="9" height="9" rx="2" fill="var(--emerald)" />
        <text x="14" y="8" fill="var(--muted-foreground)">
          Income
        </text>
        <rect x="70" width="9" height="9" rx="2" fill="var(--amber)" />
        <text x="84" y="8" fill="var(--muted-foreground)">
          Expense
        </text>
      </g>
    </svg>
  );
}

interface YearBarRow {
  yearLevel: YearLevel;
  collected: number;
  outstanding: number;
}

function YearBarChart({ rows }: { rows: YearBarRow[] }) {
  const width = 560;
  const height = 220;
  const padding = { top: 10, right: 10, bottom: 28, left: 36 };
  const chartH = height - padding.top - padding.bottom;
  const chartW = width - padding.left - padding.right;
  const maxTotal = Math.max(1, ...rows.map((r) => Math.max(r.collected, r.outstanding)));
  const groupWidth = chartW / rows.length;
  const barWidth = Math.min(30, groupWidth * 0.3);
  const scale = (n: number) => (n / maxTotal) * chartH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[220px]">
      {rows.map((r, i) => {
        const cx = padding.left + groupWidth * i + groupWidth / 2;
        const collectedH = scale(r.collected);
        const outstandingH = scale(r.outstanding);
        const gap = 4;
        const x1 = cx - barWidth - gap / 2;
        const x2 = cx + gap / 2;

        return (
          <g key={r.yearLevel}>
            <rect x={x1} y={padding.top + chartH - collectedH} width={barWidth} height={collectedH} rx={3} fill="var(--emerald)" />
            <rect x={x2} y={padding.top + chartH - outstandingH} width={barWidth} height={outstandingH} rx={3} fill="var(--amber)" />
            <text x={cx} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)" className="mono">
              Year {r.yearLevel}
            </text>
          </g>
        );
      })}
      <line x1={padding.left} y1={padding.top + chartH} x2={width - padding.right} y2={padding.top + chartH} stroke="var(--border)" />
      <g transform={`translate(${width - 190}, 4)`} className="mono" fontSize="10">
        <rect width="9" height="9" rx="2" fill="var(--emerald)" />
        <text x="14" y="8" fill="var(--muted-foreground)">
          Collected
        </text>
        <rect x="80" width="9" height="9" rx="2" fill="var(--amber)" />
        <text x="94" y="8" fill="var(--muted-foreground)">
          Outstanding
        </text>
      </g>
    </svg>
  );
}
