import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { useAuth, formatPHP } from "@/lib/auth-context";
import { api, type BalanceDto, type FundRecordDto } from "@/lib/api";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Plus, ArrowRight } from "lucide-react";
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
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const today = new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" });
  const canRecord = currentUser?.role === "Treasurer";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [balanceRes, recordsRes] = await Promise.all([api.getBalance(), api.getAllRecords()]);
        if (cancelled) return;
        setBalance(balanceRes);
        setTotal(recordsRes.length);
        setRecent(recordsRes.slice(0, 6));
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

  return (
    <div className="space-y-14">
      {/* Hero */}
      <header>
        <div className="flex items-center justify-between mb-6">
          <div className="eyebrow flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald dot-pulse" /> Overview
          </div>
          <div className="text-xs text-muted-foreground mono">{today}</div>
        </div>
        <h1 className="display text-4xl md:text-6xl">
          Good day, <span className="gradient-text">{currentUser?.fullName.split(" ")[0]}</span>.
        </h1>
        <p className="text-muted-foreground mt-3 max-w-lg text-sm leading-relaxed">
          Here's the state of the council fund. Everything is up to date — recorded, attributed, and safe.
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
              LIVE · {total} record{total === 1 ? "" : "s"} on file
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {canRecord && (
                <>
                  <Link to="/income" className="btn btn-primary">
                    <Plus className="h-3.5 w-3.5" /> Record income
                  </Link>
                  <Link to="/expenses" className="btn btn-ghost">
                    <Plus className="h-3.5 w-3.5" /> Record expense
                  </Link>
                </>
              )}
              <Link to="/reports" className="btn btn-ghost">
                Reports <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <StatCard icon={<TrendingUp className="h-4 w-4" />} tone="emerald" label="Total income" value={balance?.totalIncome ?? 0} />
          <StatCard icon={<TrendingDown className="h-4 w-4" />} tone="destructive" label="Total expense" value={balance?.totalExpense ?? 0} />
        </div>
      </section>

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
  tone: "emerald" | "destructive";
  label: string;
  value: number;
}) {
  const color = tone === "emerald" ? "text-emerald" : "text-destructive";
  return (
    <div className="surface p-6 hover:-translate-y-0.5 transition-transform duration-300">
      <div className="flex items-center justify-between">
        <div className="eyebrow">{label}</div>
        <span className={`${color} opacity-80`}>{icon}</span>
      </div>
      <div className={`mono text-2xl mt-4 ${color}`}>{formatPHP(value)}</div>
    </div>
  );
}
