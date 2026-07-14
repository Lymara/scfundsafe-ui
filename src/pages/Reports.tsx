import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { formatPHP } from "@/lib/auth-context";
import { api, type FundRecordDto } from "@/lib/api";
import { FileBarChart, Printer, Download, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import dmcLogo from "@/assets/dmc-logo.png";

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
  const [totals, setTotals] = useState({ income: 0, expense: 0, balance: 0 });

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
      const result = await api.getReport({ dateFrom: range.from || undefined, dateTo: range.to || undefined });
      const data = "records" in result ? result : result.data;
      setRecords(data.records);
      setTotals({ income: data.totalIncome, expense: data.totalExpense, balance: data.remainingBalance });
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
    const rows = [["Date", "Type", "Source/Purpose", "Amount", "Notes"]];
    records.forEach((t) =>
      rows.push([
        t.recordDate.slice(0, 10),
        t.recordType,
        t.recordType === "Income" ? `${t.source ?? ""} — ${t.purpose ?? ""}` : t.purpose ?? "",
        String(t.amount),
        t.notes ?? "",
      ]),
    );
    const csv = rows.map((r) => r.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scfundsafe-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-10">
      <div className="hidden print:flex items-center gap-3">
        <div className="relative h-11 w-11 rounded-xl grid place-items-center bg-gradient-to-br from-emerald/25 to-emerald/5 ring-1 ring-emerald/30 shrink-0">
          <img src={dmcLogo} alt="DMC College Foundation" className="h-8 w-8 object-contain" />
        </div>
        <div>
          <div className="display text-xl leading-none">
            SC <span className="gradient-text">FundSafe</span>
          </div>
          <div className="mono text-[10px] text-muted-foreground/80 mt-1">DMC College Foundation</div>
        </div>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <FileBarChart className="h-3 w-3 text-amber" /> Reports
          </div>
          <h1 className="display text-4xl md:text-5xl mt-3">Generate report.</h1>
          <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed">
            Summarize income, expenses, and remaining balance for any period. Export as CSV or print.
          </p>
        </div>
        {generated && records.length > 0 && (
          <div className="flex gap-2 print:hidden">
            <button onClick={exportCSV} className="btn btn-ghost">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button onClick={() => window.print()} className="btn btn-primary">
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
          </div>
        )}
      </header>

      <div className="surface p-6 flex flex-wrap items-end gap-4 print:hidden">
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
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mono text-xs bg-transparent border-b border-border py-1.5 outline-none focus:border-emerald transition"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mono text-xs bg-transparent border-b border-border py-1.5 outline-none focus:border-emerald transition"
            />
          </div>
        )}
        <div className="flex-1" />
        <button onClick={generate} disabled={loading} className="btn btn-primary">
          {loading ? "Generating…" : "Generate"} <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {generated && (
        <div className="space-y-6" id="report">
          <div className="grid md:grid-cols-3 gap-4">
            <Stat label="Total income" value={totals.income} tone="emerald" />
            <Stat label="Total expense" value={totals.expense} tone="destructive" />
            <Stat label="Remaining balance" value={totals.balance} tone="gradient" />
          </div>

          {records.length === 0 ? (
            <div className="surface p-14 text-center">
              <div className="mono text-xs text-muted-foreground">EMPTY</div>
              <div className="mt-2 text-sm text-muted-foreground">No report data for the selected period.</div>
            </div>
          ) : (
            <div className="surface overflow-hidden">
              <div className="p-6 hairline-b">
                <div className="eyebrow">Report summary</div>
                <div className="mt-2 flex items-baseline gap-3">
                  <div className="display text-xl">
                    {range.from || "Beginning"} → {range.to || "Today"}
                  </div>
                  <div className="mono text-xs text-muted-foreground">{records.length} records</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="eyebrow text-left">
                      <th className="px-6 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Description</th>
                      <th className="px-6 py-3 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {records.map((t) => (
                      <tr key={t.recordId} className="hover:bg-muted/40 transition">
                        <td className="px-6 py-3 mono text-xs">{t.recordDate.slice(0, 10)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full ${
                              t.recordType === "Income" ? "bg-emerald/10 text-emerald" : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {t.recordType}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {t.recordType === "Income" ? `${t.source ?? ""} — ${t.purpose ?? ""}` : t.purpose}
                        </td>
                        <td
                          className={`px-6 py-3 text-right mono font-medium ${
                            t.recordType === "Income" ? "text-emerald" : "text-destructive"
                          }`}
                        >
                          {t.recordType === "Income" ? "+" : "−"}
                          {formatPHP(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "emerald" | "destructive" | "gradient" }) {
  const color = tone === "emerald" ? "text-emerald" : tone === "destructive" ? "text-destructive" : "gradient-text";
  return (
    <div className="surface p-6">
      <div className="eyebrow">{label}</div>
      <div className={`mono text-3xl mt-3 ${color}`}>{formatPHP(value)}</div>
    </div>
  );
}