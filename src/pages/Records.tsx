import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { formatPHP } from "@/lib/auth-context";
import { api, ApiError, type FundRecordDto, type FundRecordAttachmentDto } from "@/lib/api";
import { Search, X, ArrowUpRight, ArrowDownRight, ImageOff, Loader2, Paperclip, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { SearchClearButton } from "@/components/search-clear";
import { Highlight } from "@/components/highlight";
import { matchesSearch, searchTerms } from "@/lib/search";
import { DatePicker } from "@/components/date-picker";
import { Pagination, paginate, DEFAULT_PAGE_SIZE } from "@/components/pagination";

export default function RecordsPage() {
  return (
    <AppLayout>
      <RecordsView />
    </AppLayout>
  );
}

function RecordsView() {
  const [records, setRecords] = useState<FundRecordDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "Income" | "Expense">("all");
  const [origin, setOrigin] = useState<"all" | "Student" | "Manual">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  // Read-only: this is just which row's photo the person is currently viewing.
  const [viewingPhoto, setViewingPhoto] = useState<FundRecordDto | null>(null);
  const [page, setPage] = useState(1);

  async function runSearch() {
    setLoading(true);
    try {
      const result = await api.searchRecords({
        // The server only matches one phrase, so send it the longest word and
        // narrow down by every word below - this way spaces never break a search.
        keyword: [...searchTerms(q)].sort((a, b) => b.length - a.length)[0] || undefined,
        dateFrom: from || undefined,
        dateTo: to || undefined,
        recordType: type === "all" ? undefined : type,
        origin: origin === "all" ? undefined : origin,
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
  }, [q, type, origin, from, to]);

  useEffect(() => {
    setPage(1);
  }, [q, type, origin, from, to]);

  const visible = useMemo(
    () => records.filter((t) => matchesSearch(q, t.purpose, t.source, t.notes, t.paymentMethod)),
    [records, q],
  );

  const clearFilters = () => {
    setQ("");
    setType("all");
    setOrigin("all");
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
          Find any income or expense entry. Filterable by type, date range, and free-text. Records here are
          read-only — corrections are made from the Students page.
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
            className="w-full bg-transparent pl-9 pr-9 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70"
          />
          <SearchClearButton value={q} onClear={() => setQ("")} />
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

      <div className="flex items-center justify-between gap-4 flex-wrap text-xs text-muted-foreground">
        <span className="mono">
          {records.length} result{records.length === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/40 border border-border/70">
            {(
              [
                { value: "all", label: "All entries" },
                { value: "Student", label: "From student payments" },
                { value: "Manual", label: "Recorded directly" },
              ] as const
            ).map((o) => (
              <button
                key={o.value}
                onClick={() => setOrigin(o.value)}
                className={`px-2.5 py-1 rounded-md text-[11px] transition ${
                  origin === o.value ? "bg-foreground text-background" : "hover:text-foreground hover:bg-muted"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {(q || type !== "all" || origin !== "all" || from || to) && (
            <button onClick={clearFilters} className="link-hover">
              Clear filters
            </button>
          )}
        </div>
      </div>

      <div className="surface overflow-hidden">
        {!loading && visible.length === 0 ? (
          <div className="p-14 text-center">
            <div className="mono text-xs text-muted-foreground">NO MATCHES</div>
            <div className="mt-2 text-sm text-muted-foreground">Try adjusting your filters.</div>
          </div>
        ) : (
          <div className="divide-y divide-border/70">
            {paginate(visible, page).map((t, i) => {
              // Two independent kinds of photo a row can have: a single
              // reference photo from a student payment/refund, or one-to-many
              // receipt photos attached directly to a manually-recorded
              // expense. A row is only clickable if it actually has one.
              const hasReference = Boolean(t.paymentId && t.reference);
              const hasAttachments = t.attachmentCount > 0;
              const clickable = hasReference || hasAttachments;
              return (
                <div
                  key={t.recordId}
                  onClick={clickable ? () => setViewingPhoto(t) : undefined}
                  className={`grid grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4 transition ${
                    clickable ? "cursor-pointer hover:bg-muted/40" : ""
                  }`}
                  title={hasReference ? "View reference photo" : hasAttachments ? "View attached photos" : undefined}
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
                    <div className="text-sm font-medium truncate flex items-center gap-2">
                      <span className="truncate">{t.purpose || t.source ? <Highlight text={t.purpose || t.source} query={q} /> : "—"}</span>
                      {t.isStudentPayment && (
                        <span className="mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-emerald/10 text-emerald shrink-0">
                          Student
                        </span>
                      )}
                      {hasAttachments && (
                        <span className="inline-flex items-center gap-1 mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                          <Paperclip className="h-2.5 w-2.5" /> {t.attachmentCount}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mono mt-0.5 truncate">
                      {t.recordDate.slice(0, 10)} ·{" "}
                      {t.recordType === "Income" ? (t.source ? <Highlight text={t.source} query={q} /> : "Income") : "Expense"}
                      {t.paymentMethod ? <> · via <Highlight text={t.paymentMethod} query={q} /></> : ""}
                      {t.reference ? ` · ${t.reference}` : ""}
                      {t.notes ? <> · <Highlight text={t.notes} query={q} /></> : ""}
                      {t.createdByName ? ` · by ${t.createdByName}` : ""}
                    </div>
                  </div>
                  <div className={`mono font-medium ${t.recordType === "Income" ? "text-emerald" : "text-destructive"}`}>
                    {t.recordType === "Income" ? "+" : "−"}
                    {formatPHP(t.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {!loading && visible.length > 0 && <Pagination page={page} totalItems={visible.length} onPageChange={setPage} />}

      {viewingPhoto && <PhotoModal record={viewingPhoto} onClose={() => setViewingPhoto(null)} />}
    </div>
  );
}

/** Read-only photo viewer - Records page has no edit capability. Shows either
 * the single student-payment receipt, or the expense's attached photo gallery. */
function PhotoModal({ record, onClose }: { record: FundRecordDto; onClose: () => void }) {
  const hasReference = Boolean(record.paymentId && record.reference);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-foreground/30 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="surface-lift max-w-lg w-full p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="eyebrow">{hasReference ? "Reference photo" : "Attached photos"}</div>
            <h3 className="display text-2xl mt-1 truncate">{record.purpose || record.source || "Record"}</h3>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {record.recordDate.slice(0, 10)}
              {record.paymentMethod ? ` · ${record.paymentMethod}` : ""}
              {record.reference ? ` · ${record.reference}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 -m-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="hairline-b" />

        {hasReference ? <ReceiptPhotoView paymentId={record.paymentId!} /> : <AttachmentGalleryView recordId={record.recordId} />}
      </div>
    </div>
  );
}

function ReceiptPhotoView({ paymentId }: { paymentId: number }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setState("loading");
    setImgUrl(null);
    (async () => {
      try {
        const blob = await api.fetchReceiptBlob(paymentId);
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setImgUrl(objectUrl);
          setState("ready");
        }
      } catch (err) {
        if (cancelled) return;
        // A 404 just means no photo was ever attached - not a real failure.
        setState(err instanceof ApiError && err.status === 404 ? "missing" : "error");
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [paymentId]);

  return (
    <div className="bg-black/30 rounded-xl min-h-[16rem] grid place-items-center p-4">
      {state === "loading" ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      ) : state === "missing" ? (
        <div className="text-center py-10 px-4">
          <ImageOff className="h-8 w-8 text-muted-foreground/60 mx-auto mb-3" />
          <div className="text-sm text-muted-foreground">No photo available</div>
          <div className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
            This payment was recorded without an attached reference photo.
          </div>
        </div>
      ) : state === "error" ? (
        <div className="text-center py-10 px-4">
          <ImageOff className="h-8 w-8 text-destructive/60 mx-auto mb-3" />
          <div className="text-sm text-muted-foreground">Couldn't load the receipt photo.</div>
          <div className="text-xs text-muted-foreground/70 mt-1">Please try again in a moment.</div>
        </div>
      ) : imgUrl ? (
        <img src={imgUrl} alt="Receipt" className="max-h-[60vh] w-full object-contain rounded-lg" />
      ) : null}
    </div>
  );
}

/** Multi-photo gallery for an expense's attached receipts, with prev/next paging. */
function AttachmentGalleryView({ recordId }: { recordId: number }) {
  const [attachments, setAttachments] = useState<FundRecordAttachmentDto[] | null>(null);
  const [index, setIndex] = useState(0);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgState, setImgState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    api
      .getAttachments(recordId)
      .then(setAttachments)
      .catch(() => setAttachments([]));
  }, [recordId]);

  const current = attachments?.[index];

  useEffect(() => {
    if (!current) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    setImgState("loading");
    setImgUrl(null);
    (async () => {
      try {
        const blob = await api.fetchAttachmentBlob(current.attachmentId);
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setImgUrl(objectUrl);
          setImgState("ready");
        }
      } catch {
        if (!cancelled) setImgState("error");
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [current]);

  if (attachments === null) {
    return (
      <div className="bg-black/30 rounded-xl min-h-[16rem] grid place-items-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="bg-black/30 rounded-xl min-h-[16rem] grid place-items-center p-4">
        <div className="text-center py-10 px-4">
          <ImageOff className="h-8 w-8 text-muted-foreground/60 mx-auto mb-3" />
          <div className="text-sm text-muted-foreground">No photos attached</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative bg-black/30 rounded-xl min-h-[16rem] grid place-items-center p-4">
        {imgState === "loading" ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : imgState === "error" ? (
          <div className="text-center py-10 px-4">
            <ImageOff className="h-8 w-8 text-destructive/60 mx-auto mb-3" />
            <div className="text-sm text-muted-foreground">Couldn't load this photo.</div>
          </div>
        ) : imgUrl ? (
          <img src={imgUrl} alt={current?.fileName ?? "Attachment"} className="max-h-[55vh] w-full object-contain rounded-lg" />
        ) : null}

        {attachments.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + attachments.length) % attachments.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % attachments.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
              aria-label="Next photo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {attachments.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {attachments.map((a, i) => (
            <button
              key={a.attachmentId}
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${i === index ? "w-4 bg-emerald" : "w-1.5 bg-muted-foreground/40"}`}
              aria-label={`Photo ${i + 1}`}
            />
          ))}
        </div>
      )}
      <div className="text-center text-[11px] mono text-muted-foreground">
        {index + 1} of {attachments.length}
      </div>
    </div>
  );
}
