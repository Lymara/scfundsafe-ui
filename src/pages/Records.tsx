import { useEffect, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { useAuth, formatPHP } from "@/lib/auth-context";
import { api, type FundRecordDto, type UpdateRecordPayload, PAYMENT_METHODS } from "@/lib/api";
import { Search, Pencil, X, ArrowUpRight, ArrowDownRight, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { SelectPicker } from "@/components/select-picker";
import { DatePicker } from "@/components/date-picker";
import { ReferenceNumberField } from "@/components/reference-field";
import { Pagination, paginate, DEFAULT_PAGE_SIZE } from "@/components/pagination";

export default function RecordsPage() {
  return (
    <AppLayout>
      <RecordsView />
    </AppLayout>
  );
}

function RecordsView() {
  const { currentUser } = useAuth();
  const canEdit = currentUser?.role === "Treasurer";

  const [records, setRecords] = useState<FundRecordDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "Income" | "Expense">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<FundRecordDto | null>(null);
  const [page, setPage] = useState(1);

  async function runSearch() {
    setLoading(true);
    try {
      const result = await api.searchRecords({
        keyword: q || undefined,
        dateFrom: from || undefined,
        dateTo: to || undefined,
        recordType: type === "all" ? undefined : type,
      });
      const list = Array.isArray(result) ? result : result.data;
      setRecords(list);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(runSearch, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type, from, to]);

  useEffect(() => {
    setPage(1);
  }, [q, type, from, to]);

  const handleSave = async (id: number, payload: UpdateRecordPayload) => {
    try {
      await api.updateRecord(id, payload);
      toast.success("Record updated");
      setEditing(null);
      runSearch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const clearFilters = () => {
    setQ("");
    setType("all");
    setFrom("");
    setTo("");
  };

  return (
    <div className="space-y-8">
      <header>
        <div className="eyebrow flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber" /> Records
        </div>
        <h1 className="display text-4xl md:text-5xl mt-3">Search records.</h1>
        <p className="text-muted-foreground mt-3 max-w-md text-sm leading-relaxed">
          Find or edit any income or expense entry. Filterable by type, date range, and free-text.
        </p>
      </header>

      {/* Filter bar */}
      <div className="surface p-2 flex flex-wrap items-center gap-1">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search purpose, source, notes…"
            className="w-full bg-transparent pl-9 pr-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70"
          />
        </div>
        <div className="flex items-center gap-1 pl-2 border-l border-border/70">
          {(["all", "Income", "Expense"] as const).map((o) => (
            <button
              key={o}
              onClick={() => setType(o)}
              className={`px-3 py-1.5 rounded-md text-xs capitalize transition ${
                type === o ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 pl-2 border-l border-border/70">
          <DatePicker value={from} onChange={setFrom} dense placeholder="From" />
          <span className="text-muted-foreground text-xs">→</span>
          <DatePicker value={to} onChange={setTo} dense placeholder="To" />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="mono">
          {records.length} result{records.length === 1 ? "" : "s"}
        </span>
        {(q || type !== "all" || from || to) && (
          <button onClick={clearFilters} className="link-hover">
            Clear filters
          </button>
        )}
      </div>

      <div className="surface overflow-hidden">
        {!loading && records.length === 0 ? (
          <div className="p-14 text-center">
            <div className="mono text-xs text-muted-foreground">NO MATCHES</div>
            <div className="mt-2 text-sm text-muted-foreground">Try adjusting your filters.</div>
          </div>
        ) : (
          <div className="divide-y divide-border/70">
            {paginate(records, page).map((t, i) => (
              <div
                key={t.recordId}
                className="group grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-5 py-4 hover:bg-muted/40 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="mono text-[10px] text-muted-foreground w-6">{String((page - 1) * DEFAULT_PAGE_SIZE + i + 1).padStart(2, "0")}</span>
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
                  <div className="text-[11px] text-muted-foreground mono mt-0.5 truncate">
                    {t.recordDate.slice(0, 10)} · {t.recordType === "Income" ? t.source ?? "Income" : "Expense"}
                    {t.paymentMethod ? ` · via ${t.paymentMethod}` : ""}
                    {t.notes ? ` · ${t.notes}` : ""}
                    {t.createdByName ? ` · by ${t.createdByName}` : ""}
                  </div>
                </div>
                <div className={`mono font-medium ${t.recordType === "Income" ? "text-emerald" : "text-destructive"}`}>
                  {t.recordType === "Income" ? "+" : "−"}
                  {formatPHP(t.amount)}
                </div>
                {canEdit && (
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => setEditing(t)}
                      className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {!loading && records.length > 0 && <Pagination page={page} totalItems={records.length} onPageChange={setPage} />}

      {editing && (
        <EditModal record={editing} onClose={() => setEditing(null)} onSave={(payload) => handleSave(editing.recordId, payload)} />
      )}
    </div>
  );
}

function EditModal({
  record,
  onClose,
  onSave,
}: {
  record: FundRecordDto;
  onClose: () => void;
  onSave: (payload: UpdateRecordPayload) => void;
}) {
  const [date, setDate] = useState(record.recordDate.slice(0, 10));
  const [amount, setAmount] = useState(String(record.amount));
  const [source, setSource] = useState(record.source ?? "");
  const [purpose, setPurpose] = useState(record.purpose ?? "");
  const [notes, setNotes] = useState(record.notes ?? "");
  const [paymentMethod, setPaymentMethod] = useState(record.paymentMethod ?? "");
  const [bankName, setBankName] = useState("");
  const [bankRef, setBankRef] = useState("");

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!date || !amt || amt <= 0) return toast.error("Please complete all required fields.");
    if (paymentMethod === "Bank Transfer" && !bankName.trim()) return toast.error("Specify the bank");
    const combinedNotes =
      paymentMethod === "Bank Transfer" && (bankName.trim() || bankRef.trim())
        ? [notes.trim(), `Bank transfer: ${bankName.trim()}${bankRef.trim() ? ` — ${bankRef.trim()}` : ""}`]
            .filter(Boolean)
            .join(" — ")
        : notes.trim();
    onSave({
      recordDate: date,
      amount: amt,
      source: record.recordType === "Income" ? source.trim() : undefined,
      purpose: purpose.trim() || undefined,
      notes: combinedNotes || undefined,
      paymentMethod: paymentMethod || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-foreground/30 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="surface-lift max-w-lg w-full p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">Edit entry</div>
            <h3 className="display text-2xl mt-1 capitalize">Update {record.recordType.toLowerCase()}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 -m-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="hairline-b" />
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <DatePicker label="Date" value={date} onChange={setDate} />
            <FloatField label="Amount" value={amount}>
              <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </FloatField>
          </div>
          {record.recordType === "Income" && (
            <FloatField label="Source" value={source}>
              <input value={source} onChange={(e) => setSource(e.target.value)} />
            </FloatField>
          )}
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
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <FloatField label="Bank name / type" value={bankName}>
                <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="BDO, BPI, Metrobank…" />
              </FloatField>
              <ReferenceNumberField label="Reference number (optional)" value={bankRef} onChange={setBankRef} />
            </div>
          )}
          <FloatField label="Notes" value={notes}>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </FloatField>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save changes <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
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
