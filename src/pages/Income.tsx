import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { useAuth, formatPHP } from "@/lib/auth-context";
import {
  api,
  PAYMENT_METHODS,
  type BalanceDto,
  type FeeDto,
  type StudentFeeStatusDto,
  type YearLevel,
} from "@/lib/api";
import { TrendingUp, ArrowRight, ArrowLeft, Wallet, Plus, X, Search, CheckCircle2, CircleDot, CircleDashed, Calendar, Pencil, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { cn, toTitleCase } from "@/lib/utils";
import { SelectPicker } from "@/components/select-picker";
import { Pagination, paginate } from "@/components/pagination";

export default function IncomePage() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "Admin";
  const [tab, setTab] = useState<"income" | "fees">(isAdmin ? "fees" : "income");

  return (
    <AppLayout>
      <div className="space-y-8">
        {!isAdmin && (
          <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg w-fit">
            {(["income", "fees"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-medium transition",
                  tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "income" ? "Record Income" : "Fees & Sources"}
              </button>
            ))}
          </div>
        )}
        {tab === "income" && !isAdmin ? <IncomeForm /> : <FeesAndSources canManage={currentUser?.role === "Treasurer"} />}
      </div>
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
  const [paymentMethod, setPaymentMethod] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankRef, setBankRef] = useState("");
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
    if (paymentMethod === "Bank Transfer" && !bankName.trim()) return toast.error("Specify the bank");
    const combinedNotes =
      paymentMethod === "Bank Transfer" && (bankName.trim() || bankRef.trim())
        ? [notes.trim(), `Bank transfer: ${bankName.trim()}${bankRef.trim() ? ` — ${bankRef.trim()}` : ""}`]
            .filter(Boolean)
            .join(" — ")
        : notes.trim();
    setSubmitting(true);
    try {
      await api.recordIncome({
        recordDate: date,
        amount: amt,
        source: source.trim(),
        purpose: purpose.trim() || undefined,
        notes: combinedNotes || undefined,
        paymentMethod: paymentMethod || undefined,
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

        <Section num="02" title="Attribution" hint="Where the money came from, why, and how it was paid.">
          <div className="space-y-2">
            <FloatField label="Source of income" value={source}>
              <input value={source} onChange={(e) => setSource(e.target.value)} />
            </FloatField>
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

/** A dark-themed, fully custom category dropdown - replaces the native
 * <select>, whose option list Chrome renders with OS-native (light) styling
 * that ignores our theme. Also supports adding/removing categories inline. */
function CategoryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [categories, setCategories] = useState<string[] | null>(null);
  const [open, setOpen] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingNew, setSavingNew] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      setCategories(await api.getFeeCategories());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load categories");
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setAddingNew(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pick = (c: string) => {
    onChange(c);
    setOpen(false);
    setAddingNew(false);
  };

  const confirmNew = async () => {
    const name = newName.trim();
    if (!name) return;
    setSavingNew(true);
    try {
      await api.addFeeCategory(name);
      onChange(name);
      setNewName("");
      setAddingNew(false);
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add category");
    } finally {
      setSavingNew(false);
    }
  };

  const handleDelete = async (c: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Remove "${c}" from the category list? Existing fees using it keep their category text either way.`)) return;
    try {
      await api.deleteFeeCategory(c);
      load();
      if (value === c) onChange("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove category");
    }
  };

  // Show the fee's current category even if it's been removed from the list
  // (e.g. editing an older fee) - without persisting it back as a real option.
  const displayList = categories ? (value && !categories.includes(value) ? [value, ...categories] : categories) : [];

  return (
    <div ref={containerRef} className="relative">
      <label className="field is-filled">
        <button type="button" onClick={() => setOpen((o) => !o)} className="field-trigger">
          {value || <span className="text-muted-foreground">Select a category…</span>}
        </button>
        <span className="field-label">Category</span>
      </label>

      {open && (
        <div className="absolute z-20 mt-1 w-full surface-lift p-1.5 max-h-64 overflow-y-auto">
          {categories === null ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Loading…</div>
          ) : (
            displayList.map((c) => (
              <div key={c} className="flex items-center rounded-md hover:bg-muted/60 transition group">
                <button
                  type="button"
                  onClick={() => pick(c)}
                  className={cn("flex-1 text-left px-3 py-2 text-sm truncate", c === value ? "text-emerald" : "text-foreground")}
                >
                  {c}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDelete(c, e)}
                  className="p-2 mr-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition shrink-0"
                  title="Remove category"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
          <div className="hairline-t mt-1 pt-1">
            {!addingNew ? (
              <button
                type="button"
                onClick={() => setAddingNew(true)}
                className="w-full text-left px-3 py-2 text-sm text-emerald hover:bg-emerald/10 rounded-md transition"
              >
                + Other (add new category)
              </button>
            ) : (
              <div className="flex items-center gap-1 p-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New category name"
                  className="flex-1 bg-transparent border border-border/70 rounded-md px-2.5 py-1.5 text-sm outline-none focus:border-emerald transition"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      confirmNew();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={confirmNew}
                  disabled={savingNew || !newName.trim()}
                  className="p-2 rounded-md hover:bg-emerald/10 text-emerald transition disabled:opacity-40"
                  title="Add category"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Fees & Sources ---------------- */

function FeesAndSources({ canManage }: { canManage: boolean }) {
  const [fees, setFees] = useState<FeeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeDto | null>(null);
  const [deletingFeeId, setDeletingFeeId] = useState<number | null>(null);
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

  const handleDeleteFee = async (f: FeeDto) => {
    if (!confirm(`Remove "${f.name}"? This only works if no student has paid anything against it yet.`)) return;
    setDeletingFeeId(f.feeId);
    try {
      await api.deleteFee(f.feeId);
      toast.success("Fee removed");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove fee");
    } finally {
      setDeletingFeeId(null);
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

  const totalCollected = fees.reduce((s, f) => s + f.amountCollected, 0);
  const totalExpected = fees.reduce((s, f) => s + f.amountExpected, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <Wallet className="h-3 w-3 text-amber" /> Fees & Sources
          </div>
          <h1 className="display text-4xl md:text-5xl mt-3">Every source, in one place.</h1>
          <p className="text-muted-foreground mt-3 max-w-lg text-sm leading-relaxed">
            Membership dues, event fees, uniforms, seminars — each with its own amount, due date, and
            collection status. Click a fee to see exactly who's paid, who's partial, and who hasn't.
          </p>
        </div>
        {canManage && (
          <button onClick={() => setAdding(true)} className="btn btn-primary shrink-0">
            <Plus className="h-3.5 w-3.5" /> Add fee / source
          </button>
        )}
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="surface p-5">
          <div className="eyebrow">Total collected</div>
          <div className="mono text-2xl mt-2 text-emerald">{formatPHP(totalCollected)}</div>
        </div>
        <div className="surface p-5">
          <div className="eyebrow">Total expected</div>
          <div className="mono text-2xl mt-2 gradient-text">{formatPHP(totalExpected)}</div>
        </div>
      </div>

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
          <div className="mt-2 text-sm text-muted-foreground">
            {canManage ? "Add your first fee or income source above." : "No fees have been set up yet."}
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {results.map((f) => (
            <div
              key={f.feeId}
              onClick={() => setViewing(f)}
              className="surface p-5 text-left hover:-translate-y-0.5 transition-transform duration-200 cursor-pointer"
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
              <div className="mt-3 flex flex-wrap gap-1.5">
                {f.yearLevels.map((y) => (
                  <span key={y} className="mono text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    Year {y}
                  </span>
                ))}
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
                {canManage && (
                  <div className="ml-auto flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setEditingFee(f)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
                      title="Edit fee"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteFee(f)}
                      disabled={deletingFeeId === f.feeId}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition disabled:opacity-40"
                      title="Remove fee"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <AddFeeModal
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            load();
          }}
        />
      )}
      {editingFee && (
        <EditFeeModal
          fee={editingFee}
          onClose={() => setEditingFee(null)}
          onSaved={() => {
            setEditingFee(null);
            load();
          }}
        />
      )}
      {viewing && <FeeStudentsModal fee={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function EditFeeModal({
  fee,
  onClose,
  onSaved,
}: {
  fee: FeeDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(fee.name);
  const [category, setCategory] = useState<string>(fee.category);
  const [amount, setAmount] = useState(String(fee.amount));
  const [dueDate, setDueDate] = useState(fee.dueDate.slice(0, 10));
  const [years, setYears] = useState<YearLevel[]>(fee.yearLevels);
  const [submitting, setSubmitting] = useState(false);

  const toggleYear = (y: YearLevel) => setYears((v) => (v.includes(y) ? v.filter((x) => x !== y) : [...v, y].sort()));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim() || !category.trim() || !amt || amt <= 0 || years.length === 0) {
      return toast.error("Provide a name, category, a valid amount, and at least one year level.");
    }
    setSubmitting(true);
    try {
      await api.updateFee(fee.feeId, { name: name.trim(), category, amount: amt, dueDate, yearLevels: years });
      toast.success("Fee updated");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update fee");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-foreground/30 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="surface-lift max-w-md w-full p-8 space-y-6 animate-scale-in">
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">Fees & Sources</div>
            <h3 className="display text-2xl mt-1">Edit fee / source</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 -m-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="hairline-b" />
        <div className="space-y-2">
          <FloatField label="Fee name" value={name}>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </FloatField>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <CategoryPicker value={category} onChange={setCategory} />
            <FloatField label="Amount (PHP)" value={amount}>
              <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </FloatField>
          </div>
          <FloatField label="Due date" value={dueDate}>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FloatField>
        </div>
        <div>
          <span className="eyebrow">Applies to</span>
          <p className="text-[11px] text-muted-foreground mt-1">
            Adding a year level enrolls its students at the amount above. Students already enrolled keep their
            original amount due even if you change it here.
          </p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {([1, 2, 3, 4] as YearLevel[]).map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => toggleYear(y)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-xs transition",
                  years.includes(y) ? "border-emerald/50 bg-emerald/10 text-emerald" : "border-border/70 text-muted-foreground hover:text-foreground",
                )}
              >
                Year {y}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? "Saving…" : "Save changes"} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}

function AddFeeModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [years, setYears] = useState<YearLevel[]>([1, 2, 3, 4]);
  const [submitting, setSubmitting] = useState(false);

  const toggleYear = (y: YearLevel) => setYears((v) => (v.includes(y) ? v.filter((x) => x !== y) : [...v, y].sort()));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim() || !category.trim() || !amt || amt <= 0 || years.length === 0) {
      return toast.error("Provide a name, category, a valid amount, and at least one year level.");
    }
    setSubmitting(true);
    try {
      await api.createFee({ name: name.trim(), category, amount: amt, dueDate, yearLevels: years });
      toast.success("Fee created — applicable students enrolled automatically");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create fee");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-foreground/30 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="surface-lift max-w-md w-full p-8 space-y-6 animate-scale-in">
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">Fees & Sources</div>
            <h3 className="display text-2xl mt-1">Add fee / source</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 -m-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="hairline-b" />
        <div className="space-y-2">
          <FloatField label="Fee name" value={name}>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </FloatField>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <CategoryPicker value={category} onChange={setCategory} />
            <FloatField label="Amount (PHP)" value={amount}>
              <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </FloatField>
          </div>
          <FloatField label="Due date" value={dueDate}>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </FloatField>
        </div>
        <div>
          <span className="eyebrow">Applies to</span>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {([1, 2, 3, 4] as YearLevel[]).map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => toggleYear(y)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-xs transition",
                  years.includes(y) ? "border-emerald/50 bg-emerald/10 text-emerald" : "border-border/70 text-muted-foreground hover:text-foreground",
                )}
              >
                Year {y}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? "Creating…" : "Create fee"} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}

function FeeStudentsModal({ fee, onClose }: { fee: FeeDto; onClose: () => void }) {
  const [statuses, setStatuses] = useState<StudentFeeStatusDto[] | null>(null);
  const [filter, setFilter] = useState<"all" | "Paid" | "Partial" | "Unpaid">("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    api
      .getStudentsForFee(fee.feeId)
      .then(setStatuses)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load students"));
  }, [fee.feeId]);

  const results = useMemo(() => {
    if (!statuses) return [];
    return statuses.filter((s) => {
      if (filter !== "all" && s.status !== filter) return false;
      if (q) {
        const k = q.toLowerCase();
        return s.fullName.toLowerCase().includes(k) || s.studentNumber.toLowerCase().includes(k);
      }
      return true;
    });
  }, [statuses, filter, q]);

  useEffect(() => {
    setPage(1);
  }, [filter, q]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-foreground/30 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="surface-lift max-w-2xl w-full p-8 space-y-6 animate-scale-in max-h-[86vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">Fees & Sources</div>
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

        <div className="flex flex-wrap items-center gap-1">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search student…"
              className="w-full bg-transparent border-b border-border/70 pl-9 pr-3 py-2 text-sm outline-none placeholder:text-muted-foreground/70"
            />
          </div>
          <div className="flex items-center gap-1">
            {(["all", "Paid", "Partial", "Unpaid"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs transition",
                  filter === s ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
        </div>

        {statuses === null ? (
          <div className="p-10 text-center mono text-xs text-muted-foreground">LOADING…</div>
        ) : results.length === 0 ? (
          <div className="p-10 text-center mono text-xs text-muted-foreground">NO MATCHES</div>
        ) : (
          <>
            <div className="divide-y divide-border/70 max-h-[50vh] overflow-y-auto pr-1">
              {paginate(results, page).map((s) => (
                <div key={s.studentId} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{toTitleCase(s.fullName)}</div>
                    <div className="text-[11px] text-muted-foreground mono">
                      {s.studentNumber} · Year {s.yearLevel}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="mono text-sm">{formatPHP(s.amountPaid)}</div>
                    <div className="mono text-[10px] text-muted-foreground">of {formatPHP(s.amountDue)}</div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest mono ring-1 w-fit",
                      s.status === "Paid"
                        ? "text-emerald ring-emerald/30 bg-emerald/5"
                        : s.status === "Partial"
                          ? "text-amber ring-amber/30 bg-amber/5"
                          : "text-muted-foreground ring-border bg-muted/40",
                    )}
                  >
                    {s.status}
                </span>
              </div>
              ))}
            </div>
            <Pagination page={page} totalItems={results.length} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
