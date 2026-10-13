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
  type PaymentMethod,
  type FundRecordDto,
  type FundRecordAttachmentDto,
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
  Paperclip,
  ImageOff,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { SearchClearButton } from "@/components/search-clear";
import { Highlight } from "@/components/highlight";
import { matchesSearch } from "@/lib/search";
import { cn, toTitleCase, isMeaningfulPurpose } from "@/lib/utils";
import { emitRecordsChanged } from "@/lib/events";
import { SelectPicker } from "@/components/select-picker";
import { DatePicker } from "@/components/date-picker";
import { ReferenceNumberField } from "@/components/reference-field";
import { Pagination, paginate } from "@/components/pagination";
import { SectionNav, type SectionNavItem } from "@/components/section-nav";

export default function ExpensePage() {
  const { currentUser } = useAuth();
  const canRefund = currentUser?.role === "Treasurer";
  const canManage = currentUser?.role === "Treasurer";
  const [tab, setTab] = useState<"expense" | "refunds" | "manage">("expense");

  const navItems: SectionNavItem<"expense" | "refunds" | "manage">[] = [
    { key: "expense", label: "Record Expense", icon: TrendingDown },
    ...(canRefund ? [{ key: "refunds" as const, label: "Fees & Sources (Refunds)", icon: Undo2 }] : []),
    ...(canManage ? [{ key: "manage" as const, label: "Edit Expenses", icon: Pencil }] : []),
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <SectionNav items={navItems} active={tab} onChange={setTab} />
        {tab === "expense" ? <ExpenseForm /> : tab === "refunds" ? <RefundsView /> : <ManageExpensesView />}
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
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getBalance().then(setBalance).catch(() => {});
  }, []);

  const amt = parseFloat(amount) || 0;
  const currentBalance = balance?.currentBalance ?? 0;
  const overBalance = amt > 0 && amt > currentBalance;

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    // Materialize the array right away — the browser clears the underlying
    // FileList once the <input>'s value is reset after this call, so we
    // can't wait until React actually applies the state update to read it.
    const newFiles = Array.from(list);
    setFiles((prev) => [...prev, ...newFiles]);
  };
  const removeFile = (index: number) => setFiles((prev) => prev.filter((_, i) => i !== index));
  const clearFiles = () => setFiles([]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !amt || amt <= 0 || !purpose.trim()) return toast.error("Please complete all required fields.");
    if (!isMeaningfulPurpose(purpose)) {
      return toast.error("Purpose needs to actually describe the expense, not just a placeholder like \".\"");
    }
    if (overBalance) {
      const proceed = confirm(
        `This expense (${formatPHP(amt)}) exceeds the balance (${formatPHP(currentBalance)}). Save anyway?`,
      );
      if (!proceed) return;
    }
    setSubmitting(true);
    try {
      const result = await api.recordExpense({
        recordDate: date,
        amount: amt,
        purpose: purpose.trim(),
      });
      let attachNote = "";
      if (files.length > 0) {
        try {
          await api.uploadAttachments(result.data.recordId, files);
        } catch {
          attachNote = " — but the receipt photos couldn't be attached";
        }
      }
      toast.success(`Expense recorded successfully${attachNote}`);
      emitRecordsChanged();
      navigate("/records");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record expense");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
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
          <FloatField label="Purpose" value={purpose}>
            <input value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={120} />
          </FloatField>
        </Section>

        <div className="hairline-b" />

        <Section num="03" title="Receipt" hint="Attach one or more photos of the receipt or proof of payment (optional).">
          <ReceiptUploader files={files} onAdd={addFiles} onRemove={removeFile} onClearAll={clearFiles} />
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

/**
 * Multiple-photo receipt picker for expenses (income and student
 * payments/refunds keep their own single-photo receipt elsewhere - this is
 * specific to the Record Expense form). Files aren't uploaded until the
 * expense itself is saved, since the attachment endpoint needs a real
 * RecordId to attach to.
 */
function ReceiptUploader({
  files,
  onAdd,
  onRemove,
  onClearAll,
}: {
  files: File[];
  onAdd: (list: FileList | null) => void;
  onRemove: (index: number) => void;
  onClearAll: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => inputRef.current?.click();

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      multiple
      className="hidden"
      onChange={(e) => {
        onAdd(e.target.files);
        e.target.value = "";
      }}
    />
  );

  if (files.length === 0) {
    return (
      <div
        onClick={openPicker}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onAdd(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-9 text-center cursor-pointer transition",
          dragging ? "border-emerald bg-emerald/5" : "border-border/70 hover:border-border hover:bg-muted/30",
        )}
      >
        <div
          className={cn(
            "grid place-items-center h-10 w-10 rounded-full border transition",
            dragging ? "border-emerald/40 bg-emerald/10" : "border-border/70 bg-muted/50",
          )}
        >
          <Paperclip className={cn("h-4.5 w-4.5", dragging ? "text-emerald" : "text-muted-foreground")} />
        </div>
        <div className="text-sm">
          <span className="text-emerald font-medium">Click to upload</span>{" "}
          <span className="text-muted-foreground">or drag photos here</span>
        </div>
        <div className="text-[11px] text-muted-foreground">JPG or PNG · you can attach more than one</div>
        {hiddenInput}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onAdd(e.dataTransfer.files);
      }}
      className={cn(
        "rounded-xl border transition",
        dragging ? "border-emerald bg-emerald/5" : "border-border/70",
      )}
    >
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <div className="eyebrow">
          {files.length} photo{files.length === 1 ? "" : "s"} attached
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={openPicker} className="text-[11px] text-emerald hover:text-emerald/80 transition font-medium">
            + Add more
          </button>
          <button type="button" onClick={onClearAll} className="text-[11px] text-muted-foreground hover:text-destructive transition">
            Clear all
          </button>
        </div>
        {hiddenInput}
      </div>

      <div className="divide-y divide-border/60 border-t border-border/60 max-h-64 overflow-y-auto">
        {files.map((file, i) => (
          <FileRow key={`${file.name}-${i}`} file={file} onRemove={() => onRemove(i)} />
        ))}
      </div>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileRow({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5">
      <div className="h-10 w-10 shrink-0 rounded-md overflow-hidden bg-muted/40 border border-border/60">
        {url ? (
          <img src={url} alt={file.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full grid place-items-center">
            <ImageOff className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm truncate" title={file.name}>
          {file.name}
        </div>
        <div className="text-[11px] text-muted-foreground">{formatBytes(file.size)}</div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
        title="Remove"
        aria-label={`Remove ${file.name}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
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
    return fees.filter((f) => matchesSearch(q, f.name, f.category));
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
            className="w-full bg-transparent pl-9 pr-9 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70"
          />
          <SearchClearButton value={q} onClear={() => setQ("")} />
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
                  <div className="font-medium truncate"><Highlight text={f.name} query={q} /></div>
                  <div className="mono text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> <Highlight text={f.category} query={q} /> · due{" "}
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
    return rows.filter((s) => matchesSearch(q, s.fullName, s.studentNumber));
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
            className="w-full bg-transparent border-b border-border/70 pl-9 pr-9 py-2 text-sm outline-none placeholder:text-muted-foreground/70"
          />
          <SearchClearButton value={q} onClear={() => setQ("")} />
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
                    <div className="text-sm font-medium truncate"><Highlight text={toTitleCase(s.fullName)} query={q} /></div>
                    <div className="text-[11px] text-muted-foreground mono">
                      <Highlight text={s.studentNumber} query={q} /> · Year {s.yearLevel}
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
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
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
      const result = await api.recordRefund(student.studentId, {
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
      let photoAttached = false;
      if (capturedFile) {
        try {
          await api.uploadReceipt(result.paymentId, capturedFile);
          photoAttached = true;
        } catch {
          toast.error("Refund saved, but the receipt photo couldn't be attached.");
        }
      }
      toast.success(photoAttached ? "Refund recorded — photo attached" : "Refund recorded");
      emitRecordsChanged();
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
          <DatePicker label="Date" value={date} onChange={setDate} disablePast />
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
          <ReferenceNumberField
            label="Reference number"
            value={reference}
            onChange={setReference}
            onFileCaptured={setCapturedFile}
            required
          />
        )}
        {method !== "Cash" && (
          <div className={cn("text-xs flex items-center gap-1.5", capturedFile ? "text-emerald" : "text-muted-foreground")}>
            {capturedFile ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Photo ready to attach: {capturedFile.name}</span>
                <button
                  type="button"
                  onClick={() => setCapturedFile(null)}
                  className="ml-1 p-0.5 rounded text-muted-foreground hover:text-destructive transition shrink-0"
                  title="Remove photo"
                  aria-label="Remove attached photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>No photo attached yet — click the paperclip above to add one.</>
            )}
          </div>
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

/* ---------------- Edit Expenses (UC-07, manually-entered expenses only) ---------------- */

function ManageExpensesView() {
  const [records, setRecords] = useState<FundRecordDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "refund" | "direct">("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<FundRecordDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const all = await api.getAllRecords();
      // Every expense is editable here now, whichever way it was posted:
      // typed directly on this page, or a refund issued from the Students
      // page (identifiable by isStudentPayment + paymentId). Which edit
      // form opens on click branches on that same flag below - a refund
      // still has to go through api.updatePayment so the student's roster
      // total and the ledger entry stay in sync, not the plain
      // api.updateRecord used for a directly-typed expense.
      const editable = all
        .filter((r) => r.recordType === "Expense")
        .sort((a, b) => new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime());
      setRecords(editable);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const results = useMemo(() => {
    let list = records;
    if (kind !== "all") {
      list = list.filter((r) => (kind === "refund" ? r.isStudentPayment : !r.isStudentPayment));
    }
    if (q) list = list.filter((r) => matchesSearch(q, r.purpose));
    return list;
  }, [records, q, kind]);

  useEffect(() => {
    setPage(1);
  }, [q, kind]);

  return (
    <div className="space-y-6">
      <header>
        <div className="eyebrow flex items-center gap-2">
          <Pencil className="h-3 w-3 text-amber" /> Edit Expenses
        </div>
        <h1 className="display text-4xl md:text-5xl mt-3">Fix a mistake.</h1>
        <p className="text-muted-foreground mt-3 max-w-lg text-sm leading-relaxed">
          Correct the date, amount, purpose or payment method on a direct expense, or the amount, date,
          method, reference, and receipt photo on a refund. Editing a refund keeps the student's roster
          total in sync automatically.
        </p>
      </header>

      <div className="surface p-2 flex items-center gap-1">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by purpose…"
            className="w-full bg-transparent pl-9 pr-9 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70"
          />
          <SearchClearButton value={q} onClear={() => setQ("")} />
        </div>
        <span className="mono text-[10px] text-muted-foreground pr-3">{results.length} expenses</span>
      </div>

      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/40 border border-border/70 w-fit">
        {(
          [
            { value: "all", label: "All expenses" },
            { value: "direct", label: "Direct expenses" },
            { value: "refund", label: "Refunds" },
          ] as const
        ).map((k) => (
          <button
            key={k.value}
            type="button"
            onClick={() => setKind(k.value)}
            className={cn(
              "px-2.5 py-1 rounded-md text-[11px] transition",
              kind === k.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="surface overflow-hidden">
        {loading ? (
          <div className="p-14 text-center">
            <div className="mono text-xs text-muted-foreground">LOADING…</div>
          </div>
        ) : results.length === 0 ? (
          <div className="p-14 text-center">
            <div className="mono text-xs text-muted-foreground">NO EXPENSES YET</div>
            <div className="mt-2 text-sm text-muted-foreground">
              {kind === "refund"
                ? "Refunds issued from the Students page will show up here."
                : kind === "direct"
                  ? "Expenses typed on this page will show up here once you save one."
                  : "Expenses and refunds will show up here once there's at least one."}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/70">
            {paginate(results, page).map((r) => (
              <div
                key={r.recordId}
                onClick={() => setEditing(r)}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/40 transition"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-2">
                    <span className="truncate">{r.purpose ? <Highlight text={r.purpose} query={q} /> : "—"}</span>
                    {r.isStudentPayment && (
                      <span className="mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber/10 text-amber shrink-0">
                        Refund
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground mono mt-0.5 truncate">
                    {r.recordDate.slice(0, 10)}
                    {r.paymentMethod ? ` · via ${r.paymentMethod}` : ""}
                    {r.isStudentPayment
                      ? r.hasReceipt
                        ? " · 1 photo"
                        : ""
                      : r.attachmentCount > 0
                        ? ` · ${r.attachmentCount} photo${r.attachmentCount === 1 ? "" : "s"}`
                        : ""}
                  </div>
                </div>
                <div className="mono font-medium text-destructive">−{formatPHP(r.amount)}</div>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
      {!loading && results.length > 0 && <Pagination page={page} totalItems={results.length} onPageChange={setPage} />}

      {editing &&
        (editing.isStudentPayment ? (
          <EditRefundModal
            record={editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        ) : (
          <EditExpenseModal
            record={editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        ))}
    </div>
  );
}

function EditExpenseModal({
  record,
  onClose,
  onSaved,
}: {
  record: FundRecordDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(record.recordDate.slice(0, 10));
  const [amount, setAmount] = useState(String(record.amount));
  const [purpose, setPurpose] = useState(record.purpose ?? "");
  const [paymentMethod, setPaymentMethod] = useState(record.paymentMethod ?? "");
  const [submitting, setSubmitting] = useState(false);

  const [attachments, setAttachments] = useState<FundRecordAttachmentDto[] | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadAttachments = () => {
    api
      .getAttachments(record.recordId)
      .then(setAttachments)
      .catch(() => setAttachments([]));
  };

  useEffect(() => {
    loadAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.recordId]);

  const addFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const newFiles = Array.from(list);
    setUploading(true);
    try {
      await api.uploadAttachments(record.recordId, newFiles);
      loadAttachments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to attach the photo(s)");
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = async (attachmentId: number) => {
    setAttachments((prev) => (prev ? prev.filter((a) => a.attachmentId !== attachmentId) : prev));
    try {
      await api.deleteAttachment(attachmentId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove the photo");
      loadAttachments();
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount) || 0;
    if (!date || !amt || amt <= 0 || !purpose.trim()) return toast.error("Please complete all required fields.");
    if (!isMeaningfulPurpose(purpose)) {
      return toast.error("Purpose needs to actually describe the expense, not just a placeholder like \".\"");
    }
    setSubmitting(true);
    try {
      await api.updateRecord(record.recordId, {
        recordDate: date,
        amount: amt,
        purpose: purpose.trim(),
        paymentMethod: paymentMethod || undefined,
        notes: record.notes ?? undefined,
      });
      toast.success("Expense updated");
      emitRecordsChanged();
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update expense");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-foreground/30 backdrop-blur-sm" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="surface-lift max-w-2xl w-full p-8 md:p-10 space-y-8 animate-scale-in max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow">Edit expense</div>
            <h3 className="display text-3xl md:text-4xl mt-2">Correct the details.</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-muted transition shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Same three sections as the Record Expense form, so editing looks
            and behaves exactly like creating one. */}
        <Section num="01" title="Transaction" hint="When the money went out and how much.">
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-2">
            <DatePicker label="Date" value={date} onChange={setDate} />
            <FloatField label="Amount (PHP)" value={amount}>
              <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </FloatField>
          </div>
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
          </div>
        </Section>

        <div className="hairline-b" />

        <Section num="03" title="Receipt" hint="Attach one or more photos of the receipt or proof of payment (optional).">
          <ExistingReceiptManager
            attachments={attachments}
            uploading={uploading}
            onAdd={addFiles}
            onRemove={removeAttachment}
          />
        </Section>

        <div className="flex items-center justify-between pt-4 hairline-t -mx-8 md:-mx-10 px-8 md:px-10 pt-6">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Edits a refund that was issued from the Students page. Unlike
 * EditExpenseModal (which only ever touches this record's own FundRecords
 * row via api.updateRecord), a refund also has to keep the student's roster
 * total in sync - so this goes through api.updatePayment instead, the same
 * endpoint the edit-mode in the Students page receipt drawer uses. The
 * fields here match what you'd set issuing the refund in the first place:
 * amount, date, payment method, reference, and its one receipt photo.
 */
function EditRefundModal({
  record,
  onClose,
  onSaved,
}: {
  record: FundRecordDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const paymentId = record.paymentId!;
  const [amount, setAmount] = useState(String(record.amount));
  const [date, setDate] = useState(record.recordDate.slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>((record.paymentMethod as PaymentMethod) || "Cash");
  const [bankName, setBankName] = useState("");
  const [reference, setReference] = useState(record.reference ?? "");
  const [submitting, setSubmitting] = useState(false);

  // The receipt is a single photo tied straight to the payment row (same
  // upload/delete/fetch endpoints as the Students page), not the
  // multi-photo attachment system EditExpenseModal uses. Same as on the
  // refund form itself, it's only relevant once a non-Cash method is picked.
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoStatus, setPhotoStatus] = useState<"loading" | "ready" | "empty">(record.hasReceipt ? "loading" : "empty");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoVersion, setPhotoVersion] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (photoVersion === 0 && !record.hasReceipt) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    setPhotoStatus("loading");
    api
      .fetchReceiptBlob(paymentId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setPhotoUrl(objectUrl);
        setPhotoStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setPhotoStatus("empty");
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, photoVersion]);

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    try {
      await api.uploadReceipt(paymentId, file);
      setPhotoVersion((v) => v + 1);
      toast.success("Receipt photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update the receipt photo");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm("Remove the attached receipt photo? This can't be undone.")) return;
    setPhotoBusy(true);
    try {
      await api.deleteReceipt(paymentId);
      setPhotoUrl(null);
      setPhotoStatus("empty");
      toast.success("Receipt photo removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove the receipt photo");
    } finally {
      setPhotoBusy(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (method !== "Cash" && !reference.trim()) return toast.error("Enter a reference number for this payment method");

    // Mirrors how the refund form itself composes these two fields into one
    // stored value. Bank name starts blank here even for an existing
    // Bank Transfer refund (its reference may already have the bank folded
    // into it from creation) - only re-compose if the treasurer actually
    // types a bank name, otherwise leave the existing reference untouched.
    const composedReference =
      method === "Bank Transfer" && bankName.trim()
        ? `${bankName.trim()} — ${reference.trim()}`
        : method !== "Cash"
          ? reference.trim()
          : undefined;

    setSubmitting(true);
    try {
      await api.updatePayment(paymentId, {
        amount: amt,
        paymentDate: date,
        paymentMethod: method,
        reference: composedReference,
      });
      toast.success("Refund updated");
      emitRecordsChanged();
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update this refund");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-foreground/30 backdrop-blur-sm" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="surface-lift max-w-md w-full p-8 space-y-6 animate-scale-in"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">Edit refund</div>
            <h3 className="display text-xl mt-1">{record.purpose}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 -m-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="hairline-b" />

        {/* Same field set as issuing a refund in the first place (RefundFormModal):
            amount + date, payment method, a bank name when it's a bank transfer,
            and a reference number + photo whenever it isn't cash. */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <FloatField label="Refund amount (PHP)" value={amount}>
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </FloatField>
          <DatePicker label="Date" value={date} onChange={setDate} />
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
            <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={50} />
          </FloatField>
        )}
        {method !== "Cash" && (
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-muted/40 border border-border/60 grid place-items-center">
              {photoStatus === "ready" && photoUrl ? (
                <img src={photoUrl} alt="Receipt" className="h-full w-full object-cover" />
              ) : (
                <ImageOff className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoBusy}
                className="btn btn-ghost flex-1 justify-center !gap-1.5 !px-2 text-xs whitespace-nowrap"
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0" /> {photoStatus === "ready" ? "Change photo" : "Add photo"}
              </button>
              {photoStatus === "ready" && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  disabled={photoBusy}
                  className="btn btn-ghost flex-1 justify-center !gap-1.5 !px-2 text-xs whitespace-nowrap text-destructive disabled:opacity-40"
                >
                  <X className="h-3.5 w-3.5 shrink-0" /> Remove
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelected} />
            </div>
          </div>
        )}

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

/**
 * Receipt manager for an expense that already exists (Edit Expenses flow) -
 * unlike ReceiptUploader (used on the brand-new Record Expense form), files
 * here are uploaded/removed immediately since there's already a real
 * RecordId to attach them to.
 */
function ExistingReceiptManager({
  attachments,
  uploading,
  onAdd,
  onRemove,
}: {
  attachments: FundRecordAttachmentDto[] | null;
  uploading: boolean;
  onAdd: (list: FileList | null) => void;
  onRemove: (attachmentId: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => inputRef.current?.click();

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      multiple
      className="hidden"
      onChange={(e) => {
        onAdd(e.target.files);
        e.target.value = "";
      }}
    />
  );

  const loading = attachments === null;
  const hasFiles = !loading && attachments.length > 0;

  if (!hasFiles) {
    return (
      <div
        onClick={loading || uploading ? undefined : openPicker}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onAdd(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !loading && !uploading) {
            e.preventDefault();
            openPicker();
          }
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-9 text-center transition",
          loading || uploading ? "cursor-wait opacity-60" : "cursor-pointer",
          dragging ? "border-emerald bg-emerald/5" : "border-border/70 hover:border-border hover:bg-muted/30",
        )}
      >
        <div
          className={cn(
            "grid place-items-center h-10 w-10 rounded-full border transition",
            dragging ? "border-emerald/40 bg-emerald/10" : "border-border/70 bg-muted/50",
          )}
        >
          <Paperclip className={cn("h-4.5 w-4.5", dragging ? "text-emerald" : "text-muted-foreground")} />
        </div>
        <div className="text-sm">
          {loading ? (
            <span className="text-muted-foreground">Loading photos…</span>
          ) : uploading ? (
            <span className="text-muted-foreground">Uploading…</span>
          ) : (
            <>
              <span className="text-emerald font-medium">Click to upload</span>{" "}
              <span className="text-muted-foreground">or drag photos here</span>
            </>
          )}
        </div>
        {!loading && !uploading && <div className="text-[11px] text-muted-foreground">JPG or PNG · you can attach more than one</div>}
        {hiddenInput}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onAdd(e.dataTransfer.files);
      }}
      className={cn("rounded-xl border transition", dragging ? "border-emerald bg-emerald/5" : "border-border/70")}
    >
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <div className="eyebrow">
          {attachments.length} photo{attachments.length === 1 ? "" : "s"} attached
        </div>
        <button
          type="button"
          onClick={openPicker}
          disabled={uploading}
          className="text-[11px] text-emerald hover:text-emerald/80 transition font-medium disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "+ Add more"}
        </button>
        {hiddenInput}
      </div>

      <div className="divide-y divide-border/60 border-t border-border/60 max-h-64 overflow-y-auto">
        {attachments.map((a) => (
          <ExistingAttachmentRow key={a.attachmentId} attachment={a} onRemove={() => onRemove(a.attachmentId)} />
        ))}
      </div>
    </div>
  );
}

function ExistingAttachmentRow({
  attachment,
  onRemove,
}: {
  attachment: FundRecordAttachmentDto;
  onRemove: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    api
      .fetchAttachmentBlob(attachment.attachmentId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.attachmentId]);

  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5">
      <div className="h-10 w-10 shrink-0 rounded-md overflow-hidden bg-muted/40 border border-border/60">
        {url ? (
          <img src={url} alt={attachment.fileName ?? "Receipt"} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full grid place-items-center">
            <ImageOff className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm truncate" title={attachment.fileName ?? undefined}>
          {attachment.fileName || "Photo"}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {new Date(attachment.uploadedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
        title="Remove"
        aria-label={`Remove ${attachment.fileName ?? "photo"}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
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
