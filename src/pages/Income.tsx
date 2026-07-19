import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { useAuth } from "@/lib/auth-context";
import { api, type BalanceDto } from "@/lib/api";
import { formatPHP } from "@/lib/auth-context";
import { TrendingUp, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function IncomePage() {
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

  return (
    <AppLayout>
      <IncomeForm />
    </AppLayout>
  );
}

function IncomeForm() {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<BalanceDto | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getBalance().then(setBalance).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!date || !amt || amt <= 0 || !source.trim()) {
      return toast.error("Please complete all required fields.");
    }
    setSubmitting(true);
    try {
      await api.recordIncome({
        recordDate: date,
        amount: amt,
        source: source.trim(),
        purpose: purpose.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Income recorded successfully");
      navigate("/records");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record income");
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
            <TrendingUp className="h-3 w-3 text-emerald" /> Record · Income
          </div>
          <h1 className="display text-4xl md:text-5xl mt-3">New income entry.</h1>
          <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed">
            Log money received by the council — membership dues, donations, fundraising proceeds.
            Every entry is timestamped and attributed.
          </p>
        </div>
        <div className="hidden md:block text-right shrink-0">
          <div className="eyebrow">Total to date</div>
          <div className="mono text-2xl text-emerald mt-1">{formatPHP(balance?.totalIncome ?? 0)}</div>
        </div>
      </header>

      <form onSubmit={submit} className="surface-lift p-8 md:p-10 space-y-10">
        <Section num="01" title="Transaction" hint="When and how much.">
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-2">
            <FloatField label="Date" value={date}>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </FloatField>
            <FloatField label="Amount (PHP)" value={amount}>
              <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </FloatField>
          </div>
        </Section>

        <div className="hairline-b" />

        <Section num="02" title="Attribution" hint="Where the money came from and why.">
          <div className="space-y-2">
            <FloatField label="Source of income" value={source}>
              <input value={source} onChange={(e) => setSource(e.target.value)} />
            </FloatField>
            <FloatField label="Purpose" value={purpose}>
              <input value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={120} />
            </FloatField>
          </div>
        </Section>

        <div className="hairline-b" />

        <Section num="03" title="Notes" hint="Optional — any extra context for the record.">
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
            {submitting ? "Saving…" : "Save income"} <ArrowRight className="h-4 w-4" />
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
