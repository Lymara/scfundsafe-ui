import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { api, type BalanceDto } from "@/lib/api";
import { formatPHP } from "@/lib/auth-context";
import { TrendingDown, ArrowRight, ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function ExpensePage() {
  return (
    <AppLayout>
      <ExpenseForm />
    </AppLayout>
  );
}

function ExpenseForm() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<BalanceDto | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
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
    if (overBalance) {
      const proceed = confirm(
        `This expense (${formatPHP(amt)}) exceeds the balance (${formatPHP(currentBalance)}). Save anyway?`,
      );
      if (!proceed) return;
    }
    setSubmitting(true);
    try {
      await api.recordExpense({
        recordDate: date,
        amount: amt,
        purpose: purpose.trim(),
        notes: notes.trim() || undefined,
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
            <FloatField label="Date" value={date}>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </FloatField>
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
          <FloatField label="Purpose" value={purpose}>
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={120} />
          </FloatField>
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
