import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { useAuth, formatPHP } from "@/lib/auth-context";
import {
  api,
  PAYMENT_METHODS,
  type BalanceDto,
  type FeeDto,
  type StudentFeeStatusDto,
  type PaymentMethod,
} from "@/lib/api";
import {
  TrendingDown,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Undo2,
  Calendar,
  X,
  Search,
  CheckCircle2,
  CircleDot,
  CircleDashed,
} from "lucide-react";
import { toast } from "sonner";
import { cn, toTitleCase } from "@/lib/utils";
import { SelectPicker } from "@/components/select-picker";
import { Pagination, paginate } from "@/components/pagination";

export default function ExpensePage() {
  const { currentUser } = useAuth();
  if (currentUser?.role === "Admin") {
    return (
      <AppLayout>
        <div className="max-w-md text-center py-24 mx-auto">
          <div className="eyebrow">Restricted</div>
          <h1 className="display text-3xl mt-2">Not available for admins</h1>
          <p className="text-muted-foreground text-sm mt-3">
            Administrators manage accounts and audit logs — recording transactions is reserved for the treasurer.
          </p>
        </div>
      </AppLayout>
    );
  }

  const canRefund = currentUser?.role === "Treasurer";
  const [tab, setTab] = useState<"expense" | "refunds">("expense");

  return (
    <AppLayout>
      <div className="space-y-8">
        {canRefund && (
          <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg w-fit">
            {(["expense", "refunds"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-medium transition",
                  tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "expense" ? "Record Expense" : "Fees & Sources (Refunds)"}
              </button>
            ))}
          </div>
        )}
        {tab === "expense" ? <ExpenseForm /> : <RefundsView />}
      </div>
    </AppLayout>
  );
}

function ExpenseForm() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<BalanceDto | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankRef, setBankRef] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getBalance().then(setBalance).catch(() => {});
  }, []);

  const amt = parseFloat(amount) || 0;
  const currentBalance = balance?.currentBalance ?? 0;
  const overBalance = amt > 0 && amt > currentBalance;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !amt || amt <= 0 || !purpose.trim()) return toast.error("Please complete all required fields.");
    if (paymentMethod === "Bank Transfer" && !bankName.trim()) return toast.error("Specify the bank");
    if (overBalance) {
      const proceed = confirm(
        `This expense (${formatPHP(amt)}) exceeds the balance (${formatPHP(currentBalance)}). Save anyway?`,
      );
      if (!proceed) return;
    }
    const combinedNotes =
      paymentMethod === "Bank Transfer" && (bankName.trim() || bankRef.trim())
        ? [notes.trim(), `Bank transfer: ${bankName.trim()}${bankRef.trim() ? ` — ${bankRef.trim()}` : ""}`]
            .filter(Boolean)
            .join(" — ")
        : notes.trim();
    setSubmitting(true);
    try {
      await api.recordExpense({
        recordDate: date,
        amount: amt,
        purpose: purpose.trim(),
        notes: combinedNotes || undefined,
        paymentMethod: paymentMethod || undefined,
      });
      toast.success("Expense recorded successfully");
      navigate("/records");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record expense");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate("/dashboard")}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Overview
      </button>

      <header className="flex items-start justify-between gap-6 mb-10">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <TrendingDown className="h-3 w-3 text-destructive" /> Record · Expense
          </div>
          <h1 className="display text-4xl md:text-5xl mt-3">New expense entry.</h1>
          <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed">
            Log money spent by the council. The system tracks running balance so nothing slips through
            the cracks.
          </p>
        </div>
        <div className="hidden md:flex flex-col items-end gap-3 shrink-0">
          <div className="text-right">
            <div className="eyebrow">Available</div>
            <div className="mono text-2xl mt-1 gradient-text">{formatPHP(currentBalance)}</div>
          </div>
          <div className="text-right">
            <div className="eyebrow">Total expense</div>
            <div className="mono text-sm text-destructive mt-1">{formatPHP(balance?.totalExpense ?? 0)}</div>
          </div>
        </div>
      </header>

      <form onSubmit={submit} className="surface-lift p-8 md:p-10 space-y-10">
        <Section num="01" title="Transaction" hint="When the money went out and how much.">
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-2">
            <DatePicker label="Date" value={date} onChange={setDate} />
            <FloatField label="Amount (PHP)" value={amount}>
              <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </FloatField>
          </div>
          {overBalance && (
            <div className="mt-4 flex items-start gap-2 text-xs text-destructive bg-destructive/5 border border-destructive/15 rounded-lg px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <div>
                This exceeds the current balance of <span className="mono">{formatPHP(currentBalance)}</span>. You can
                still proceed — confirmation will be requested.
              </div>
            </div>
          )}
        </Section>

        <div className="hairline-b" />

        <Section num="02" title="Purpose" hint="A short description that will appear in reports.">
          <div className="space-y-2">
            <FloatField label="Purpose" value={purpose}>
              <input value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={120} />
            </FloatField>
            <SelectPicker
              label="Payment method (optional)"
              value={paymentMethod}
              placeholder="Not specified"
              options={[{ value: "", label: "Not specified" }, ...PAYMENT_METHODS.map((m) => ({ value: m, label: m }))]}
              onChange={setPaymentMethod}
            />
            {paymentMethod === "Bank Transfer" && (
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                <FloatField label="Bank name / type" value={bankName}>
                  <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="BDO, BPI, Metrobank…" />
                </FloatField>
                <FloatField label="Reference number (optional)" value={bankRef}>
                  <input value={bankRef} onChange={(e) => setBankRef(e.target.value)} maxLength={50} placeholder="REF-000123" />
                </FloatField>
              </div>
            )}
          </div>
        </Section>

        <div className="hairline-b" />

        <Section num="03" title="Notes" hint="Optional details — receipts, approvals, context.">
          <FloatField label="Notes" value={notes}>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </FloatField>
          <div className="field-hint text-right">{notes.length}/500</div>
        </Section>

        <div className="flex items-center justify-between pt-4 hairline-t -mx-8 md:-mx-10 px-8 md:px-10 pt-6">
          <button type="button" onClick={() => navigate("/dashboard")} className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? "Saving…" : "Save expense"} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- Refunds (Fees & Sources, read-only + refund action) ---------------- */

function RefundsView() {
  const [fees, setFees] = useState<FeeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [viewing, setViewing] = useState<FeeDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setFees(await api.getFees());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load fees");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const results = useMemo(() => {
    if (!q) return fees;
    const s = q.toLowerCase();
    return fees.filter((f) => f.name.toLowerCase().includes(s) || f.category.toLowerCase().includes(s));
  }, [fees, q]);

  return (
    <div className="space-y-6">
      <header>
        <div className="eyebrow flex items-center gap-2">
          <Undo2 className="h-3 w-3 text-amber" /> Refunds
        </div>
        <h1 className="display text-4xl md:text-5xl mt-3">Give money back.</h1>
        <p className="text-muted-foreground mt-3 max-w-lg text-sm leading-relaxed">
          If an event or fee gets cancelled, click it to see who's paid and refund them. Every refund
          posts as an expense automatically, so your balance, Records, and Reports stay accurate.
        </p>
      </header>

      <div className="surface p-2 flex items-center gap-1">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search fee name or category…"
            className="w-full bg-transparent pl-9 pr-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70"
          />
        </div>
        <span className="mono text-[10px] text-muted-foreground pr-3">{results.length} fees</span>
      </div>

      {loading ? (
        <div className="surface p-14 text-center">
          <div className="mono text-xs text-muted-foreground">LOADING…</div>
        </div>
      ) : results.length === 0 ? (
        <div className="surface p-14 text-center">
          <div className="mono text-xs text-muted-foreground">NO FEES YET</div>
          <div className="mt-2 text-sm text-muted-foreground">Fees created on the Income page will appear here.</div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {results.map((f) => (
            <button
              key={f.feeId}
              onClick={() => setViewing(f)}
              className="surface p-5 text-left hover:-translate-y-0.5 transition-transform duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{f.name}</div>
                  <div className="mono text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> {f.category} · due{" "}
                    {new Date(f.dueDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>
                <span className="mono text-sm shrink-0">{formatPHP(f.amount)}</span>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] mono">
                  <span className="text-muted-foreground">Collected</span>
                  <span>
                    {formatPHP(f.amountCollected)} / {formatPHP(f.amountExpected)}
                  </span>
                </div>
                <div className="h-1.5 mt-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full gradient-emerald"
                    style={{ width: `${f.amountExpected ? Math.min(100, (f.amountCollected / f.amountExpected) * 100) : 0}%` }}
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-[11px]">
                <span className="text-emerald flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {f.paidCount} paid
                </span>
                <span className="text-amber flex items-center gap-1">
                  <CircleDot className="h-3 w-3" /> {f.partialCount} partial
                </span>
                <span className="text-muted-foreground flex items-center gap-1">
                  <CircleDashed className="h-3 w-3" /> {f.unpaidCount} unpaid
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {viewing && (
        <FeeRefundModal
          fee={viewing}
          onClose={() => setViewing(null)}
          onRefunded={() => {
            load();
          }}
        />
      )}
    </div>
  );
}

function FeeRefundModal({ fee, onClose, onRefunded }: { fee: FeeDto; onClose: () => void; onRefunded: () => void }) {
  const [statuses, setStatuses] = useState<StudentFeeStatusDto[] | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [refundingFor, setRefundingFor] = useState<StudentFeeStatusDto | null>(null);

  const load = () => {
    api
      .getStudentsForFee(fee.feeId)
      .then(setStatuses)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load students"));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fee.feeId]);

  const paidStudents = useMemo(() => {
    const rows = (statuses ?? []).filter((s) => s.amountPaid > 0);
    if (!q) return rows;
    const k = q.toLowerCase();
    return rows.filter((s) => s.fullName.toLowerCase().includes(k) || s.studentNumber.toLowerCase().includes(k));
  }, [statuses, q]);

  useEffect(() => {
    setPage(1);
  }, [q]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-foreground/30 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="surface-lift max-w-2xl w-full p-8 space-y-6 animate-scale-in max-h-[86vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">Refunds</div>
            <h3 className="display text-2xl mt-1">{fee.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {fee.category} · {formatPHP(fee.amount)} · due{" "}
              {new Date(fee.dueDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <button onClick={onClose} className="p-2 -m-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="hairline-b" />

        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search student…"
            className="w-full bg-transparent border-b border-border/70 pl-9 pr-3 py-2 text-sm outline-none placeholder:text-muted-foreground/70"
          />
        </div>

        {statuses === null ? (
          <div className="p-10 text-center mono text-xs text-muted-foreground">LOADING…</div>
        ) : paidStudents.length === 0 ? (
          <div className="p-10 text-center mono text-xs text-muted-foreground">
            {q ? "NO MATCHES" : "NO ONE HAS PAID THIS FEE YET"}
          </div>
        ) : (
          <>
            <div className="divide-y divide-border/70 max-h-[50vh] overflow-y-auto pr-1">
              {paginate(paidStudents, page).map((s) => (
                <div key={s.studentId} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{toTitleCase(s.fullName)}</div>
                    <div className="text-[11px] text-muted-foreground mono">
                      {s.studentNumber} · Year {s.yearLevel}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="mono text-sm text-emerald">{formatPHP(s.amountPaid)}</div>
                    <div className="mono text-[10px] text-muted-foreground">paid so far</div>
                  </div>
                  <button onClick={() => setRefundingFor(s)} className="btn btn-ghost text-xs py-1.5 px-3">
                    <Undo2 className="h-3.5 w-3.5" /> Refund
                  </button>
                </div>
              ))}
            </div>
            <Pagination page={page} totalItems={paidStudents.length} onPageChange={setPage} />
          </>
        )}
      </div>

      {refundingFor && (
        <RefundFormModal
          fee={fee}
          student={refundingFor}
          onClose={() => setRefundingFor(null)}
          onSaved={() => {
            setRefundingFor(null);
            load();
            onRefunded();
          }}
        />
      )}
    </div>
  );
}

function RefundFormModal({
  fee,
  student,
  onClose,
  onSaved,
}: {
  fee: FeeDto;
  student: StudentFeeStatusDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(String(student.amountPaid));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [reference, setReference] = useState("");
  const [bankName, setBankName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (amt > student.amountPaid) return toast.error(`Cannot refund more than the ${formatPHP(student.amountPaid)} paid`);
    if (method === "Bank Transfer" && !bankName.trim()) return toast.error("Specify the bank");
    if (method !== "Cash" && !reference.trim()) return toast.error("Enter a reference number for this payment method");

    setSubmitting(true);
    try {
      await api.recordRefund(student.studentId, {
        feeId: fee.feeId,
        amount: amt,
        refundDate: date,
        paymentMethod: method,
        reference:
          method === "Bank Transfer"
            ? `${bankName.trim()} — ${reference.trim()}`
            : method !== "Cash"
              ? reference.trim()
              : undefined,
      });
      toast.success("Refund recorded");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record refund");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4 bg-foreground/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="surface-lift max-w-md w-full p-8 space-y-6 animate-scale-in"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">Refund</div>
            <h3 className="display text-xl mt-1">
              {toTitleCase(student.fullName)} · {fee.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Paid so far: <span className="text-emerald">{formatPHP(student.amountPaid)}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 -m-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="hairline-b" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <FloatField label="Refund amount (PHP)" value={amount}>
            <input type="number" step="0.01" min="0" max={student.amountPaid} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </FloatField>
          <FloatField label="Date" value={date}>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FloatField>
        </div>
        <SelectPicker
          label="Payment method"
          value={method}
          options={[...PAYMENT_METHODS]}
          onChange={(v) => setMethod(v as PaymentMethod)}
        />
        {method === "Bank Transfer" && (
          <FloatField label="Bank name / type" value={bankName}>
            <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="BDO, BPI, Metrobank…" />
          </FloatField>
        )}
        {method !== "Cash" && (
          <FloatField label="Reference number" value={reference}>
            <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={50} placeholder="REF-000123" />
          </FloatField>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? "Refunding…" : "Confirm refund"} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ num, title, hint, children }: { num: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="grid md:grid-cols-[110px_1fr] gap-6 md:gap-10">
      <div>
        <div className="mono text-xs text-amber tracking-widest">{num}</div>
        <div className="font-semibold text-sm mt-2">{title}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{hint}</div>}
      </div>
      <div>{children}</div>
    </section>
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
