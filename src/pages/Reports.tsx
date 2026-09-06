import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { formatPHP } from "@/lib/auth-context";
import { api, type FundRecordDto, type FeeDto, type StudentDto, type YearLevel } from "@/lib/api";
import { FileBarChart, Printer, Download, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { toTitleCase } from "@/lib/utils";
import { DatePicker } from "@/components/date-picker";
import bitsLogo from "@/assets/bits-logo.png";

export default function ReportsPage() {
  return (
    <AppLayout>
      <ReportsView />
    </AppLayout>
  );
}

type Period = "all" | "month" | "year" | "custom";

function ReportsView() {
  const [period, setPeriod] = useState<Period>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<FundRecordDto[]>([]);
  const [fees, setFees] = useState<FeeDto[]>([]);
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [totals, setTotals] = useState({ income: 0, expense: 0, balance: 0 });
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [includeSections, setIncludeSections] = useState({
    summary: true,
    charts: true,
    fees: true,
    students: true,
    transactions: true,
  });

  const toggleSection = (key: keyof typeof includeSections) =>
    setIncludeSections((s) => ({ ...s, [key]: !s[key] }));

  const range = useMemo(() => {
    const now = new Date();
    if (period === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      return { from: start, to: end };
    }
    if (period === "year") {
      return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
    }
    if (period === "custom") return { from, to };
    return { from: "", to: "" };
  }, [period, from, to]);

  const generate = async () => {
    setLoading(true);
    try {
      const [reportResult, feesData, studentsData] = await Promise.all([
        api.getReport({ dateFrom: range.from || undefined, dateTo: range.to || undefined }),
        api.getFees(),
        api.getStudents({}),
      ]);
      const data = "records" in reportResult ? reportResult : reportResult.data;
      setRecords(data.records);
      setTotals({ income: data.totalIncome, expense: data.totalExpense, balance: data.remainingBalance });
      setFees(feesData);
      setStudents(studentsData);
      setGeneratedAt(new Date());
      setGenerated(true);
      if (data.records.length === 0) {
        toast.error("No report data available for the selected period.");
      } else {
        toast.success("Report generated");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCSV = () => {
    const rows = [["Date", "Type", "Source/Purpose", "Amount", "Payment Method", "Notes"]];
    records.forEach((t) =>
      rows.push([
        t.recordDate.slice(0, 10),
        t.recordType,
        t.recordType === "Income" ? `${t.source ?? ""} — ${t.purpose ?? ""}` : t.purpose ?? "",
        String(t.amount),
        t.paymentMethod ?? "",
        t.notes ?? "",
      ]),
    );
    const csv = rows.map((r) => r.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `it-fundsafe-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Derived: student payment status by year level, and outstanding balances ----
  const byYearLevel = ([1, 2, 3, 4] as YearLevel[]).map((yl) => {
    const rows = students.filter((s) => s.yearLevel === yl);
    return {
      yearLevel: yl,
      total: rows.length,
      paid: rows.filter((s) => s.status === "Paid").length,
      partial: rows.filter((s) => s.status === "Partial").length,
      unpaid: rows.filter((s) => s.status === "Unpaid").length,
      collected: rows.reduce((s, r) => s + r.totalPaid, 0),
      expected: rows.reduce((s, r) => s + r.totalDue, 0),
    };
  });
  const outstanding = students
    .filter((s) => s.balance > 0)
    .sort((a, b) => (a.yearLevel - b.yearLevel) || a.fullName.localeCompare(b.fullName));

  // ---- Derived: cash flow over time, and collections by payment method ----
  const monthly = useMemo(() => {
    const map = new Map<string, { month: string; income: number; expense: number }>();
    [...records]
      .sort((a, b) => (a.recordDate < b.recordDate ? -1 : 1))
      .forEach((r) => {
        const key = r.recordDate.slice(0, 7);
        const row = map.get(key) ?? { month: key, income: 0, expense: 0 };
        if (r.recordType === "Income") row.income += r.amount;
        else row.expense += r.amount;
        map.set(key, row);
      });
    return [...map.values()];
  }, [records]);

  const byMethod = useMemo(() => {
    const map = new Map<string, number>();
    records
      .filter((r) => r.recordType === "Income" && r.paymentMethod)
      .forEach((r) => map.set(r.paymentMethod!, (map.get(r.paymentMethod!) ?? 0) + r.amount));
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [records]);

  // Section numbers shift to stay sequential based on what's actually included.
  let sectionNo = 0;
  const nextSection = () => ++sectionNo;

  const periodLabel =
    period === "all" ? "All Time" : period === "month" ? "This Month" : period === "year" ? "This Year" : "Custom Range";

  return (
    <div className="space-y-10">
      {/* Print-only letterhead */}
      <div className="hidden print:block space-y-1 pb-4 mb-2 border-b-2 border-black/80">
        <div className="flex items-center gap-3">
          <img src={bitsLogo} alt="BSIT Department" className="h-10 w-10 object-contain" />
          <div>
            <div className="text-lg font-bold leading-none">IT FundSafe</div>
            <div className="text-[10px] text-black/60 mt-0.5">BSIT Department Council · Fund & Fee Collection Report</div>
          </div>
        </div>
        <div className="flex items-baseline justify-between pt-2 text-[11px] text-black/70">
          <span>
            Period: <strong>{periodLabel}</strong> ({range.from || "Beginning"} &rarr; {range.to || "Today"})
          </span>
          <span>Generated {generatedAt?.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</span>
        </div>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <FileBarChart className="h-3 w-3 text-amber" /> Reports
          </div>
          <h1 className="display text-4xl md:text-5xl mt-3">Generate report.</h1>
          <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed">
            A complete, printable record: fund summary, every fee/source, student payment status, and every transaction.
          </p>
        </div>
        {generated && records.length > 0 && (
          <div className="flex gap-2">
            <button onClick={exportCSV} className="btn btn-ghost">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button onClick={() => window.print()} className="btn btn-primary">
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
          </div>
        )}
      </header>

      <div className="surface p-6 space-y-4 print:hidden">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg">
            {(["all", "month", "year", "custom"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs capitalize transition ${
                  period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "all" ? "All time" : p === "month" ? "This month" : p === "year" ? "This year" : "Custom"}
              </button>
            ))}
          </div>
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <DatePicker value={from} onChange={setFrom} dense placeholder="From" />
              <span className="text-xs text-muted-foreground">→</span>
              <DatePicker value={to} onChange={setTo} dense placeholder="To" />
            </div>
          )}
          <div className="flex-1" />
          <button onClick={generate} disabled={loading} className="btn btn-primary">
            {loading ? "Generating…" : "Generate"} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="pt-3 hairline-t">
          <div className="eyebrow mb-2">Include in report</div>
          <div className="flex flex-wrap gap-2">
            <SectionToggle label="Financial summary" checked={includeSections.summary} onChange={() => toggleSection("summary")} />
            <SectionToggle label="Charts" checked={includeSections.charts} onChange={() => toggleSection("charts")} />
            <SectionToggle label="Fee & income sources" checked={includeSections.fees} onChange={() => toggleSection("fees")} />
            <SectionToggle
              label="Student payment status"
              checked={includeSections.students}
              onChange={() => toggleSection("students")}
            />
            <SectionToggle
              label="All transactions"
              checked={includeSections.transactions}
              onChange={() => toggleSection("transactions")}
            />
          </div>
        </div>
      </div>

      {generated && (
        <div className="space-y-10" id="report">
          {/* ---- Section: Financial Summary ---- */}
          {includeSections.summary && (
            <ReportSection title={`${nextSection()}. Financial Summary`} subtitle="Fund position for the selected period">
              <div className="grid md:grid-cols-3 gap-4 print:grid-cols-3">
                <Stat label="Total income" value={totals.income} tone="emerald" />
                <Stat label="Total expense" value={totals.expense} tone="destructive" />
                <Stat label="Remaining balance" value={totals.balance} tone="gradient" />
              </div>
            </ReportSection>
          )}

          {/* ---- Section: Charts ---- */}
          {includeSections.charts && (monthly.length > 0 || byMethod.length > 0 || students.length > 0) && (
            <ReportSection title={`${nextSection()}. Charts`} subtitle="Cash flow, collections by payment method, and standing by year level" pageBreakBefore>
              <div className="grid md:grid-cols-2 gap-6 print-avoid-break">
                {monthly.length > 0 && (
                  <div className="surface p-5 print:border print:border-black/20 print:rounded-none print:shadow-none print:bg-transparent">
                    <div className="text-xs font-semibold mb-3 print:text-black">Cash flow (income vs. expense)</div>
                    <ReportAreaChart rows={monthly} />
                  </div>
                )}
                {byMethod.length > 0 && (
                  <div className="surface p-5 print:border print:border-black/20 print:rounded-none print:shadow-none print:bg-transparent">
                    <div className="text-xs font-semibold mb-3 print:text-black">Collected by payment method</div>
                    <ReportMethodDonut data={byMethod} />
                  </div>
                )}
              </div>
              {students.length > 0 && (
                <div className="mt-6 surface p-5 print:border print:border-black/20 print:rounded-none print:shadow-none print:bg-transparent print-avoid-break">
                  <div className="text-xs font-semibold mb-3 print:text-black">Collected vs. expected, per year level</div>
                  <ReportYearBarChart rows={byYearLevel} />
                </div>
              )}
            </ReportSection>
          )}

          {/* ---- Section: Fee / Source Collection Summary ---- */}
          {includeSections.fees && fees.length > 0 && (
            <ReportSection title={`${nextSection()}. Fee & Income Source Summary`} subtitle="Every configured fee, its rate, due date, and collection status">
              <PrintTable
                head={["Fee / Source", "Category", "Amount", "Due Date", "Paid", "Partial", "Unpaid", "Collected", "Expected"]}
                rows={fees.map((f) => [
                  f.name,
                  f.category,
                  formatPHP(f.amount),
                  new Date(f.dueDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
                  String(f.paidCount),
                  String(f.partialCount),
                  String(f.unpaidCount),
                  formatPHP(f.amountCollected),
                  formatPHP(f.amountExpected),
                ])}
                align={["left", "left", "right", "right", "right", "right", "right", "right", "right"]}
              />
            </ReportSection>
          )}

          {/* ---- Section: Student Payment Status ---- */}
          {includeSections.students && students.length > 0 && (
            <ReportSection title={`${nextSection()}. Student Payment Status`} subtitle="Paid, partial, and unpaid counts by year level, plus every student with an outstanding balance">
              <PrintTable
                head={["Year Level", "Total Students", "Paid", "Partial", "Unpaid", "Collected", "Expected"]}
                rows={byYearLevel.map((r) => [
                  `Year ${r.yearLevel}`,
                  String(r.total),
                  String(r.paid),
                  String(r.partial),
                  String(r.unpaid),
                  formatPHP(r.collected),
                  formatPHP(r.expected),
                ])}
                align={["left", "right", "right", "right", "right", "right", "right"]}
                foot={[
                  "Total",
                  String(students.length),
                  String(byYearLevel.reduce((s, r) => s + r.paid, 0)),
                  String(byYearLevel.reduce((s, r) => s + r.partial, 0)),
                  String(byYearLevel.reduce((s, r) => s + r.unpaid, 0)),
                  formatPHP(byYearLevel.reduce((s, r) => s + r.collected, 0)),
                  formatPHP(byYearLevel.reduce((s, r) => s + r.expected, 0)),
                ]}
              />

              {outstanding.length > 0 && (
                <div className="mt-6">
                  <div className="text-xs font-semibold mb-2 print:text-black">
                    Students with an outstanding balance ({outstanding.length})
                  </div>
                  <PrintTable
                    dense
                    head={["Student No.", "Full Name", "Year", "Status", "Paid", "Balance"]}
                    rows={outstanding.map((s) => [
                      s.studentNumber,
                      toTitleCase(s.fullName),
                      String(s.yearLevel),
                      s.status,
                      formatPHP(s.totalPaid),
                      formatPHP(s.balance),
                    ])}
                    align={["left", "left", "right", "left", "right", "right"]}
                  />
                </div>
              )}
            </ReportSection>
          )}

          {/* ---- Section: All Transactions ---- */}
          {includeSections.transactions && (
            <ReportSection
              title={`${nextSection()}. All Transactions`}
              subtitle={`Every income and expense record for the selected period (${records.length} total)`}
              pageBreakBefore
            >
              {records.length === 0 ? (
                <div className="surface p-14 text-center print:border print:border-black/20">
                  <div className="mono text-xs text-muted-foreground">EMPTY</div>
                  <div className="mt-2 text-sm text-muted-foreground">No report data for the selected period.</div>
                </div>
              ) : (
                <PrintTable
                  head={["Date", "Type", "Description", "Method", "Amount"]}
                  rows={records.map((t) => [
                    t.recordDate.slice(0, 10),
                    t.recordType,
                    t.recordType === "Income" ? `${t.source ?? ""} — ${t.purpose ?? ""}` : t.purpose ?? "",
                    t.paymentMethod ?? "—",
                    `${t.recordType === "Income" ? "+" : "−"}${formatPHP(t.amount)}`,
                  ])}
                  align={["left", "left", "left", "left", "right"]}
                  amountColorRows={records.map((t) => (t.recordType === "Income" ? "emerald" : "destructive"))}
                />
              )}
            </ReportSection>
          )}

          <div className="hidden print:block text-center text-[10px] text-black/50 pt-6 border-t border-black/10">
            IT FundSafe — BSIT Department Council · This report was generated electronically and reflects records as of the
            generation time shown above.
          </div>
        </div>
      )}
    </div>
  );
}

function ReportSection({
  title,
  subtitle,
  children,
  pageBreakBefore,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  pageBreakBefore?: boolean;
}) {
  return (
    <section className={pageBreakBefore ? "print-page-break print-avoid-break" : "print-avoid-break"}>
      <div className="mb-4">
        <div className="display text-xl print:text-base print:font-bold">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-1 print:text-black/60">{subtitle}</div>}
      </div>
      {children}
    </section>
  );
}

function PrintTable({
  head,
  rows,
  align,
  foot,
  dense,
  amountColorRows,
}: {
  head: string[];
  rows: string[][];
  align?: ("left" | "right")[];
  foot?: string[];
  dense?: boolean;
  amountColorRows?: ("emerald" | "destructive")[];
}) {
  const cellClass = (i: number) => (align?.[i] === "right" ? "text-right" : "text-left");
  const pad = dense ? "px-3 py-2" : "px-4 py-2.5";

  return (
    <div className="surface overflow-hidden print:border print:border-black/20 print:rounded-none print:shadow-none print:bg-transparent">
      <table className="w-full text-xs md:text-sm">
        <thead>
          <tr className="eyebrow text-left bg-muted/40 print:bg-black/5">
            {head.map((h, i) => (
              <th key={h} className={`${pad} font-semibold print:text-black print:font-bold ${cellClass(i)}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70 print:divide-black/10">
          {rows.map((row, ri) => (
            <tr key={ri} className="print-avoid-break">
              {row.map((cell, ci) => {
                const isAmountCol = ci === row.length - 1 && amountColorRows;
                const colorCls = isAmountCol
                  ? amountColorRows[ri] === "emerald"
                    ? "text-emerald print:text-black print:font-medium"
                    : "text-destructive print:text-black print:font-medium"
                  : "";
                return (
                  <td key={ci} className={`${pad} mono print:font-sans print:text-black ${cellClass(ci)} ${colorCls}`}>
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {foot && (
          <tfoot>
            <tr className="border-t-2 border-border font-semibold print:border-black/40">
              {foot.map((f, i) => (
                <td key={i} className={`${pad} mono print:font-sans print:text-black ${cellClass(i)}`}>
                  {f}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "emerald" | "destructive" | "gradient" }) {
  const color = tone === "emerald" ? "text-emerald" : tone === "destructive" ? "text-destructive" : "gradient-text";
  return (
    <div className="surface p-6 print:border print:border-black/20 print:rounded-none print:shadow-none print:bg-transparent">
      <div className="eyebrow print:text-black/60">{label}</div>
      <div className={`mono text-3xl mt-3 print:text-black print:font-bold ${color}`}>{formatPHP(value)}</div>
    </div>
  );
}

function SectionToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs cursor-pointer surface hover:bg-muted/40 transition select-none">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-3.5 w-3.5 accent-emerald" />
      <span className={checked ? "text-foreground" : "text-muted-foreground"}>{label}</span>
    </label>
  );
}

const METHOD_COLORS_REPORT: Record<string, string> = {
  Cash: "var(--emerald)",
  GCash: "var(--amber)",
  PayMaya: "oklch(0.62 0.13 220)",
  "Bank Transfer": "oklch(0.72 0.10 300)",
  Other: "var(--muted-foreground)",
};

function ReportAreaChart({ rows }: { rows: { month: string; income: number; expense: number }[] }) {
  const width = 520;
  const height = 200;
  const padding = { top: 10, right: 10, bottom: 22, left: 36 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(1, ...rows.map((r) => Math.max(r.income, r.expense)));
  const stepX = rows.length > 1 ? chartW / (rows.length - 1) : 0;
  const scaleY = (v: number) => chartH - (v / maxVal) * chartH;

  const pointsFor = (key: "income" | "expense") =>
    rows.map((r, i) => `${padding.left + stepX * i},${padding.top + scaleY(r[key])}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[180px]">
      <line x1={padding.left} y1={padding.top + chartH} x2={width - padding.right} y2={padding.top + chartH} stroke="var(--border)" />
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
          className="mono print:fill-black"
        >
          {r.month.slice(2)}
        </text>
      ))}
      <g transform={`translate(${width - 150}, 4)`} className="mono" fontSize="10">
        <rect width="9" height="9" rx="2" fill="var(--emerald)" />
        <text x="14" y="8" fill="var(--muted-foreground)" className="print:fill-black">
          Income
        </text>
        <rect x="70" width="9" height="9" rx="2" fill="var(--amber)" />
        <text x="84" y="8" fill="var(--muted-foreground)" className="print:fill-black">
          Expense
        </text>
      </g>
    </svg>
  );
}

function ReportMethodDonut({ data }: { data: { name: string; value: number }[] }) {
  const size = 150;
  const stroke = 20;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0);
  let offsetAcc = 0;

  return (
    <div className="grid grid-cols-[150px_1fr] gap-4 items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        {data.map((d) => {
          const frac = total ? d.value / total : 0;
          const dash = frac * c;
          const gap = c - dash;
          const rotate = (offsetAcc / total) * 360 - 90;
          offsetAcc += d.value;
          return (
            <circle
              key={d.name}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={METHOD_COLORS_REPORT[d.name] ?? "var(--muted-foreground)"}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`}
              transform={`rotate(${rotate} ${size / 2} ${size / 2})`}
            />
          );
        })}
      </svg>
      <div className="space-y-1.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: METHOD_COLORS_REPORT[d.name] ?? "var(--muted-foreground)" }} />
              <span className="print:text-black">{d.name}</span>
            </span>
            <span className="mono print:text-black">{formatPHP(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ReportYearRow {
  yearLevel: number;
  collected: number;
  expected: number;
}

function ReportYearBarChart({ rows }: { rows: ReportYearRow[] }) {
  const width = 520;
  const height = 190;
  const padding = { top: 10, right: 10, bottom: 26, left: 10 };
  const chartH = height - padding.top - padding.bottom;
  const chartW = width - padding.left - padding.right;
  const maxTotal = Math.max(1, ...rows.map((r) => Math.max(r.collected, r.expected)));
  const groupWidth = chartW / rows.length;
  const barWidth = Math.min(30, groupWidth * 0.3);
  const scale = (n: number) => (n / maxTotal) * chartH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[170px]">
      {rows.map((r, i) => {
        const cx = padding.left + groupWidth * i + groupWidth / 2;
        const collectedH = scale(r.collected);
        const expectedH = scale(r.expected);
        const gap = 4;
        const x1 = cx - barWidth - gap / 2;
        const x2 = cx + gap / 2;
        return (
          <g key={r.yearLevel}>
            <rect x={x1} y={padding.top + chartH - collectedH} width={barWidth} height={collectedH} rx={3} fill="var(--emerald)" />
            <rect x={x2} y={padding.top + chartH - expectedH} width={barWidth} height={expectedH} rx={3} fill="var(--amber)" opacity={0.55} />
            <text x={cx} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)" className="mono print:fill-black">
              Year {r.yearLevel}
            </text>
          </g>
        );
      })}
      <line x1={padding.left} y1={padding.top + chartH} x2={width - padding.right} y2={padding.top + chartH} stroke="var(--border)" />
      <g transform={`translate(${width - 190}, 4)`} className="mono" fontSize="10">
        <rect width="9" height="9" rx="2" fill="var(--emerald)" />
        <text x="14" y="8" fill="var(--muted-foreground)" className="print:fill-black">
          Collected
        </text>
        <rect x="80" width="9" height="9" rx="2" fill="var(--amber)" opacity={0.55} />
        <text x="94" y="8" fill="var(--muted-foreground)" className="print:fill-black">
          Expected
        </text>
      </g>
    </svg>
  );
}
