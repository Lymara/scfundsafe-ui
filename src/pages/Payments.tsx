import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { formatPHP } from "@/lib/auth-context";
import {
  api,
  PAYMENT_METHODS,
  type StudentFeePaymentDto,
  type FeeDto,
  type YearLevel,
  type PaymentMethod,
} from "@/lib/api";
import { Receipt, Search } from "lucide-react";
import { toast } from "sonner";
import { cn, toTitleCase } from "@/lib/utils";
import { Pagination, paginate } from "@/components/pagination";

const METHOD_COLORS: Record<PaymentMethod, string> = {
  Cash: "var(--emerald)",
  GCash: "var(--amber)",
  PayMaya: "oklch(0.62 0.13 220)",
  "Bank Transfer": "oklch(0.72 0.10 300)",
};

export default function PaymentsPage() {
  return (
    <AppLayout>
      <PaymentsView />
    </AppLayout>
  );
}

type YearFilter = "all" | YearLevel;

function PaymentsView() {
  const [payments, setPayments] = useState<StudentFeePaymentDto[]>([]);
  const [fees, setFees] = useState<FeeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [method, setMethod] = useState<PaymentMethod | "all">("all");
  const [year, setYear] = useState<YearFilter>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [paymentsData, feesData] = await Promise.all([api.getPayments({}), api.getFees()]);
        setPayments(paymentsData);
        setFees(feesData);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load payments");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const rows = useMemo(
    () =>
      payments.filter((p) => {
        if (method !== "all" && p.paymentMethod !== method) return false;
        if (year !== "all" && p.yearLevel !== year) return false;
        if (q) {
          const s = q.toLowerCase();
          return (
            p.studentFullName.toLowerCase().includes(s) ||
            p.studentNumber.toLowerCase().includes(s) ||
            p.feeName.toLowerCase().includes(s)
          );
        }
        return true;
      }),
    [payments, q, method, year],
  );

  useEffect(() => {
    setPage(1);
  }, [q, method, year]);

  const total = rows.reduce((s, r) => s + (r.isRefund ? -r.amount : r.amount), 0);

  const bySource = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.feeName, (map.get(r.feeName) ?? 0) + (r.isRefund ? -r.amount : r.amount)));
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [rows]);

  const byMethod = useMemo(
    () =>
      PAYMENT_METHODS.map((m) => ({
        name: m,
        value: rows.filter((r) => r.paymentMethod === m && !r.isRefund).reduce((s, r) => s + r.amount, 0),
        count: rows.filter((r) => r.paymentMethod === m && !r.isRefund).length,
      })).filter((x) => x.value > 0),
    [rows],
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <Receipt className="h-3 w-3 text-amber" /> Collections
          </div>
          <h1 className="display text-4xl md:text-5xl mt-3">Payment records.</h1>
          <p className="text-muted-foreground mt-3 max-w-lg text-sm leading-relaxed">
            Every peso collected — who paid, for which fee, through which method, and who received it.
          </p>
        </div>
      </header>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="surface p-6">
          <div className="eyebrow">Collected (filtered)</div>
          <div className="mono text-3xl mt-3 gradient-text">{formatPHP(total)}</div>
          <div className="mono text-[11px] text-muted-foreground mt-2">
            {rows.length} payment record{rows.length === 1 ? "" : "s"}
          </div>
          <div className="mt-6 space-y-2">
            {bySource.length === 0 ? (
              <div className="text-xs text-muted-foreground">No collections yet.</div>
            ) : (
              bySource.map((s) => (
                <div key={s.name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate">{s.name}</span>
                    <span className="mono">{formatPHP(s.value)}</span>
                  </div>
                  <div className="h-1.5 mt-1 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full gradient-emerald" style={{ width: `${total ? (s.value / total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="surface p-6">
          <div className="eyebrow">By payment method</div>
          <div className="mt-2 grid grid-cols-[160px_1fr] gap-4 items-center">
            <div className="h-[160px]">
              {byMethod.length > 0 && <MethodDonut data={byMethod} />}
            </div>
            <div className="space-y-2">
              {byMethod.length === 0 ? (
                <div className="text-xs text-muted-foreground">No data.</div>
              ) : (
                byMethod.map((m) => (
                  <div key={m.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: METHOD_COLORS[m.name] }} />
                      {m.name} <span className="text-muted-foreground mono text-[10px]">×{m.count}</span>
                    </span>
                    <span className="mono">{formatPHP(m.value)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="surface p-3 space-y-2">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search student, fee, reference…"
            className="w-full bg-transparent pl-9 pr-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70"
          />
        </div>
        <div className="flex items-center gap-3 pt-1 hairline-t flex-wrap">
          <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground w-12 shrink-0">Method</span>
          <div className="flex items-center gap-1 flex-wrap">
            <Chip active={method === "all"} onClick={() => setMethod("all")}>
              All methods
            </Chip>
            {PAYMENT_METHODS.map((m) => (
              <Chip key={m} active={method === m} onClick={() => setMethod(m)}>
                {m}
              </Chip>
            ))}
          </div>
          <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground w-12 shrink-0 pl-3 border-l border-border/70">
            Year
          </span>
          <div className="flex items-center gap-1 flex-wrap">
            <Chip active={year === "all"} onClick={() => setYear("all")}>
              All years
            </Chip>
            {([1, 2, 3, 4] as YearLevel[]).map((y) => (
              <Chip key={y} active={year === y} onClick={() => setYear(y)}>
                Year {y}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="surface overflow-hidden">
        {loading ? (
          <div className="p-14 text-center">
            <div className="mono text-xs text-muted-foreground">LOADING…</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-14 text-center">
            <div className="mono text-xs text-muted-foreground">EMPTY</div>
            <div className="mt-2 text-sm text-muted-foreground">No payment records match your filters.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="eyebrow text-left">
                  <th className="px-6 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Year</th>
                  <th className="px-4 py-3 font-semibold">Fee / source</th>
                  <th className="px-4 py-3 font-semibold">Method</th>
                  <th className="px-4 py-3 font-semibold">Received by</th>
                  <th className="px-6 py-3 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {paginate(rows, page).map((r) => (
                  <tr key={r.paymentId} className={cn("hover:bg-muted/40 transition", r.isRefund && "bg-destructive/5")}>
                    <td className="px-6 py-3 mono text-xs whitespace-nowrap">
                      {new Date(r.paymentDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{toTitleCase(r.studentFullName)}</div>
                      <div className="mono text-[10px] text-muted-foreground">{r.studentNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">Year {r.yearLevel}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {r.feeName}
                        {r.isRefund && (
                          <span className="mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">
                            Refund
                          </span>
                        )}
                      </div>
                      <div className="mono text-[10px] text-muted-foreground">{r.feeCategory}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full border border-border/80"
                        style={{ color: METHOD_COLORS[r.paymentMethod] }}
                      >
                        {r.paymentMethod}
                      </span>
                      {r.reference && <div className="mono text-[10px] text-muted-foreground mt-1">{r.reference}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.recordedByName ?? "—"}</td>
                    <td className={cn("px-6 py-3 text-right mono", r.isRefund ? "text-destructive" : "text-emerald")}>
                      {r.isRefund ? "−" : ""}
                      {formatPHP(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!loading && rows.length > 0 && <Pagination page={page} totalItems={rows.length} onPageChange={setPage} />}

      {fees.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Managing fees and viewing who's paid per fee lives on the{" "}
          <a href="/income" className="text-emerald hover:underline">
            Income → Fees & Sources
          </a>{" "}
          page.
        </div>
      )}
    </div>
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

function MethodDonut({ data }: { data: { name: string; value: number }[] }) {
  const size = 160;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0);
  let offsetAcc = 0;

  return (
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
            stroke={METHOD_COLORS[d.name as PaymentMethod]}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            transform={`rotate(${rotate} ${size / 2} ${size / 2})`}
            strokeLinecap="butt"
          />
        );
      })}
    </svg>
  );
}
