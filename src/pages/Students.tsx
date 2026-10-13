import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AppLayout } from "@/components/app-layout";
import { useAuth, formatPHP } from "@/lib/auth-context";
import { SelectPicker } from "@/components/select-picker";
import { DatePicker } from "@/components/date-picker";
import { ReferenceNumberField, extractReferenceNumber } from "@/components/reference-field";
import { Pagination, paginate, DEFAULT_PAGE_SIZE } from "@/components/pagination";
import { EyeGlyph } from "@/components/pw-input";
import {
  api,
  ApiError,
  PAYMENT_METHODS,
  type StudentDto,
  type StudentFeeStatusDto,
  type StudentFeePaymentDto,
  type YearLevel,
  type DuesStatus,
  type PaymentMethod,
  type ImportStudentsResultDto,
} from "@/lib/api";
import {
  GraduationCap,
  Search,
  UserPlus,
  Upload,
  Download,
  X,
  ArrowRight,
  Wallet,
  CheckCircle2,
  CircleDashed,
  CircleDot,
  Pencil,
  Trash2,
  AlertTriangle,
  ImageOff,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { SearchClearButton } from "@/components/search-clear";
import { Highlight } from "@/components/highlight";
import { matchesSearch } from "@/lib/search";
import { cn, toTitleCase, formatStudentName, parseStudentName, studentInitials } from "@/lib/utils";
import { emitRecordsChanged } from "@/lib/events";
import { studentsToCsv, downloadCsv } from "@/lib/export-csv";

export default function StudentsPage() {
  return (
    <AppLayout>
      <StudentsView />
    </AppLayout>
  );
}

type YearTab = "all" | YearLevel;

const YEAR_LEVEL_OPTIONS = [
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" },
  { value: "4", label: "4th Year" },
];

function StudentsView() {
  const { currentUser } = useAuth();
  const canRecordPayment = currentUser?.role === "Treasurer";
  const canManageStudents = currentUser?.role === "Admin";

  const [yearTab, setYearTab] = useState<YearTab>("all");
  const [status, setStatus] = useState<DuesStatus | "">("");
  const [keyword, setKeyword] = useState("");
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [allStudents, setAllStudents] = useState<StudentDto[]>([]); // unfiltered, for the chart
  const [loading, setLoading] = useState(true);

  const [payingStudent, setPayingStudent] = useState<StudentDto | null>(null);
  const [editingStudent, setEditingStudent] = useState<StudentDto | null>(null);
  const [viewingStudent, setViewingStudent] = useState<StudentDto | null>(null);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [page, setPage] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const [roster, all] = await Promise.all([
        api.getStudents({
          yearLevel: yearTab === "all" ? "" : yearTab,
          status,
        }),
        api.getStudents({}),
      ]);
      setStudents(roster);
      setAllStudents(all);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearTab, status]);

  // Search filters the loaded roster as you type (every word must match, in any
  // order), so clearing the box always brings the full list straight back.
  const visibleStudents = useMemo(
    () => students.filter((s) => matchesSearch(keyword, s.fullName, s.studentNumber, s.section, s.email)),
    [students, keyword],
  );
  useEffect(() => {
    setPage(1);
  }, [keyword]);

  // Exports exactly the rows currently listed in the table (year tab + status + last search).
  const handleExportCsv = () => {
    if (visibleStudents.length === 0) return toast.error("No students to export.");
    const parts = ["student-dues-roster", yearTab === "all" ? null : `year-${yearTab}`, status ? status.toLowerCase() : null];
    const filename = `${parts.filter(Boolean).join("-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(filename, studentsToCsv(visibleStudents));
    toast.success(`Exported ${visibleStudents.length} student${visibleStudents.length === 1 ? "" : "s"}.`);
  };

  const yearTabs: { id: YearTab; label: string }[] = [
    { id: "all", label: "All Years" },
    { id: 1, label: "1st Year" },
    { id: 2, label: "2nd Year" },
    { id: 3, label: "3rd Year" },
    { id: 4, label: "4th Year" },
  ];

  return (
    <div className="space-y-10 pb-16">
      <header className="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="eyebrow flex items-center gap-2">
            <GraduationCap className="h-3 w-3 text-amber" /> BSIT Department
          </div>
          <h1 className="display text-4xl md:text-5xl mt-3">Students.</h1>
          <p className="text-muted-foreground mt-3 max-w-lg text-sm leading-relaxed">
            The full roster across all four year levels — who's paid their fees, who hasn't, and how.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleExportCsv} disabled={loading || visibleStudents.length === 0} className="btn btn-ghost disabled:opacity-50">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          {canManageStudents && (
            <>
              <button onClick={() => setImporting(true)} className="btn btn-ghost">
                <Upload className="h-3.5 w-3.5" /> Import CSV
              </button>
              <button onClick={() => setAdding(true)} className="btn btn-primary">
                <UserPlus className="h-3.5 w-3.5" /> Add student
              </button>
            </>
          )}
        </div>
      </header>

      {allStudents.length > 0 && <RosterOverview students={allStudents} />}

      <nav className="flex flex-wrap gap-2">
        {yearTabs.map((t) => (
          <button
            key={String(t.id)}
            onClick={() => setYearTab(t.id)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-medium transition surface",
              yearTab === t.id ? "ring-1 ring-emerald/40 text-emerald bg-emerald/5" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <form onSubmit={(e) => e.preventDefault()} className="surface p-2 flex flex-wrap items-center gap-1">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search name, student number, section…"
            className="w-full bg-transparent pl-9 pr-9 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70"
          />
          <SearchClearButton value={keyword} onClear={() => setKeyword("")} />
        </div>
        <div className="flex items-center gap-1 pl-2 border-l border-border/70">
          {(["", "Paid", "Partial", "Unpaid"] as (DuesStatus | "")[]).map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs transition",
                status === s ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </form>

      <RosterTable
        students={visibleStudents}
        query={keyword}
        loading={loading}
        canRecordPayment={canRecordPayment}
        canManageStudents={canManageStudents}
        onRecordPayment={setPayingStudent}
        onEdit={setEditingStudent}
        onView={setViewingStudent}
        onDeleted={load}
        page={page}
        onPageChange={setPage}
      />

      {payingStudent && (
        <RecordPaymentModal
          student={payingStudent}
          onClose={() => setPayingStudent(null)}
          onSaved={() => {
            setPayingStudent(null);
            load();
          }}
        />
      )}
      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSaved={() => {
            setEditingStudent(null);
            load();
          }}
        />
      )}
      {viewingStudent && (
        <StudentDetailModal
          student={viewingStudent}
          onClose={() => setViewingStudent(null)}
          canRecordPayment={canRecordPayment}
          onCollectPayment={() => {
            setViewingStudent(null);
            setPayingStudent(viewingStudent);
          }}
        />
      )}
      {adding && (
        <AddStudentModal
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            load();
          }}
        />
      )}
      {importing && (
        <ImportModal
          onClose={() => setImporting(false)}
          onImported={() => {
            load();
          }}
        />
      )}
    </div>
  );
}

/* ---------------- Analytics / Charts ---------------- */

function RosterOverview({ students }: { students: StudentDto[] }) {
  const byYear = ([1, 2, 3, 4] as YearLevel[]).map((yl) => {
    const rows = students.filter((s) => s.yearLevel === yl);
    return {
      yearLevel: yl,
      total: rows.length,
      paid: rows.filter((r) => r.status === "Paid").length,
      partial: rows.filter((r) => r.status === "Partial").length,
      unpaid: rows.filter((r) => r.status === "Unpaid").length,
      collected: rows.reduce((s, r) => s + r.totalPaid, 0),
      expected: rows.reduce((s, r) => s + r.totalDue, 0),
    };
  });

  const totalStudents = students.length;
  const paidCount = students.filter((s) => s.status === "Paid").length;
  const totalCollected = students.reduce((s, r) => s + r.totalPaid, 0);
  const totalExpected = students.reduce((s, r) => s + r.totalDue, 0);
  const paidPct = totalStudents > 0 ? Math.round((paidCount / totalStudents) * 100) : 0;
  const collectedPct = totalExpected > 0 ? Math.min(100, Math.round((totalCollected / totalExpected) * 100)) : 0;

  const lowest = [...byYear].sort((a, b) => {
    const rateA = a.total ? a.paid / a.total : 1;
    const rateB = b.total ? b.paid / b.total : 1;
    return rateA - rateB;
  })[0];

  return (
    <section className="grid lg:grid-cols-[1.3fr_1fr_1fr] gap-4">
      <div className="surface-lift p-6">
        <div className="eyebrow mb-4">Paid vs. unpaid by year level</div>
        <BarChart rows={byYear} />
      </div>
      <div className="surface-lift p-6 flex flex-col items-center justify-center text-center">
        <div className="eyebrow mb-3 self-start">Overall collection</div>
        <Donut percent={paidPct} />
        <div className="mt-3 text-xs text-muted-foreground">
          {paidCount} of {totalStudents} students fully paid
        </div>
      </div>
      <div className="surface-lift p-6 flex flex-col gap-4">
        <div>
          <div className="eyebrow mb-2">Collected vs. expected</div>
          <div className="mono text-2xl gradient-text">{formatPHP(totalCollected)}</div>
          <div className="text-[11px] text-muted-foreground mono mt-0.5">of {formatPHP(totalExpected)} expected</div>
          <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full gradient-emerald rounded-full transition-all" style={{ width: `${collectedPct}%` }} />
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground mono">{collectedPct}% collected</div>
        </div>
        {lowest && lowest.total > 0 && (
          <div className="hairline-t pt-3 text-xs">
            <div className="text-muted-foreground">Needs the most follow-up</div>
            <div className="mt-1 font-medium">
              Year {lowest.yearLevel} · {lowest.paid}/{lowest.total} paid
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

interface YearRow {
  yearLevel: YearLevel;
  total: number;
  paid: number;
  partial: number;
  unpaid: number;
}

function BarChart({ rows }: { rows: YearRow[] }) {
  const width = 560;
  const height = 200;
  const padding = { top: 10, right: 10, bottom: 28, left: 10 };
  const maxTotal = Math.max(1, ...rows.map((r) => r.total));
  const groupWidth = (width - padding.left - padding.right) / rows.length;
  const barWidth = Math.min(34, groupWidth * 0.28);
  const chartH = height - padding.top - padding.bottom;
  const scale = (n: number) => (n / maxTotal) * chartH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[200px]">
      {rows.map((r, i) => {
        const cx = padding.left + groupWidth * i + groupWidth / 2;
        const paidH = scale(r.paid);
        const partialH = scale(r.partial);
        const unpaidH = scale(r.unpaid);
        const gap = 4;
        const x1 = cx - barWidth * 1.5 - gap;
        const x2 = cx - barWidth / 2;
        const x3 = cx + barWidth / 2 + gap;

        return (
          <g key={r.yearLevel}>
            <rect x={x1} y={padding.top + chartH - paidH} width={barWidth} height={paidH} rx={3} fill="var(--emerald)" />
            <rect x={x2} y={padding.top + chartH - partialH} width={barWidth} height={partialH} rx={3} fill="var(--amber)" />
            <rect
              x={x3}
              y={padding.top + chartH - unpaidH}
              width={barWidth}
              height={unpaidH}
              rx={3}
              fill="var(--muted-foreground)"
              opacity={0.35}
            />
            <text x={cx} y={height - 8} textAnchor="middle" fontSize="11" fill="var(--muted-foreground)" className="mono">
              Year {r.yearLevel}
            </text>
          </g>
        );
      })}
      <line x1={padding.left} y1={padding.top + chartH} x2={width - padding.right} y2={padding.top + chartH} stroke="var(--border)" />
      <g transform={`translate(${width - 190}, 4)`} className="mono" fontSize="10">
        <rect width="9" height="9" rx="2" fill="var(--emerald)" />
        <text x="14" y="8" fill="var(--muted-foreground)">Paid</text>
        <rect x="52" width="9" height="9" rx="2" fill="var(--amber)" />
        <text x="66" y="8" fill="var(--muted-foreground)">Partial</text>
        <rect x="118" width="9" height="9" rx="2" fill="var(--muted-foreground)" opacity={0.35} />
        <text x="132" y="8" fill="var(--muted-foreground)">Unpaid</text>
      </g>
    </svg>
  );
}

function Donut({ percent }: { percent: number }) {
  const size = 132;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--emerald)"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="mono text-2xl font-semibold">{percent}%</div>
      </div>
    </div>
  );
}

/* ---------------- Roster table ---------------- */

function statusPill(status: DuesStatus) {
  const map: Record<DuesStatus, { icon: typeof CheckCircle2; cls: string }> = {
    Paid: { icon: CheckCircle2, cls: "text-emerald ring-emerald/30 bg-emerald/5" },
    Partial: { icon: CircleDot, cls: "text-amber ring-amber/30 bg-amber/5" },
    Unpaid: { icon: CircleDashed, cls: "text-muted-foreground ring-border bg-muted/40" },
  };
  const { icon: Icon, cls } = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest mono ring-1", cls)}>
      <Icon className="h-3 w-3" /> {status}
    </span>
  );
}

function RosterTable({
  students,
  query,
  loading,
  canRecordPayment,
  canManageStudents,
  onRecordPayment,
  onEdit,
  onView,
  onDeleted,
  page,
  onPageChange,
}: {
  students: StudentDto[];
  query: string;
  loading: boolean;
  canRecordPayment: boolean;
  canManageStudents: boolean;
  onRecordPayment: (s: StudentDto) => void;
  onEdit: (s: StudentDto) => void;
  onView: (s: StudentDto) => void;
  onDeleted: () => void;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StudentDto | null>(null);
  const pageItems = paginate(students, page);

  const handleDelete = async (s: StudentDto) => {
    setDeletingId(s.studentId);
    try {
      await api.deleteStudent(s.studentId);
      toast.success("Student removed");
      setPendingDelete(null);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove student");
      setPendingDelete(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="eyebrow text-left hairline-b">
              <th className="px-5 py-3 font-semibold w-10">#</th>
              <th className="px-4 py-3 font-semibold">Student</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">Year</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">Fees settled</th>
              <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Paid</th>
              <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Balance</th>
              <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
              <th className="px-5 py-3 font-semibold text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {loading ? (
              <tr>
                <td colSpan={8} className="p-12 text-center">
                  <div className="mono text-xs text-muted-foreground">LOADING…</div>
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-12 text-center">
                  <div className="mono text-xs text-muted-foreground">NO MATCHES</div>
                  <div className="mt-2 text-sm text-muted-foreground">Try a different search or filter.</div>
                </td>
              </tr>
            ) : (
              pageItems.map((s, i) => {
                const displayName = toTitleCase(s.fullName);
                const initials = studentInitials(s.fullName);
                return (
                  <tr key={s.studentId} className="hover:bg-muted/40 transition group">
                    <td className="px-5 py-4 mono text-[10px] text-muted-foreground">
                      {String((page - 1) * DEFAULT_PAGE_SIZE + i + 1).padStart(2, "0")}
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={() => onView(s)} className="min-w-0 flex items-center gap-3 text-left group/name">
                        <div className="h-8 w-8 rounded-full grid place-items-center text-[10px] font-semibold bg-muted text-foreground/80 ring-1 ring-border shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate group-hover/name:text-emerald transition">
                            <Highlight text={displayName} query={query} />
                          </div>
                          <div className="text-[11px] text-muted-foreground mono truncate">
                            <Highlight text={s.studentNumber} query={query} />
                          </div>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground whitespace-nowrap">
                      Year {s.yearLevel}
                      {s.section ? <> · <Highlight text={s.section} query={query} /></> : ""}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden shrink-0">
                          <div
                            className="h-full rounded-full gradient-emerald"
                            style={{ width: `${s.feeCount ? Math.min(100, (s.paidFeeCount / s.feeCount) * 100) : 0}%` }}
                          />
                        </div>
                        <span className="mono text-[10px] text-muted-foreground whitespace-nowrap">
                          {s.paidFeeCount}/{s.feeCount}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 mono text-xs text-emerald text-right whitespace-nowrap">{formatPHP(s.totalPaid)}</td>
                    <td className="px-4 py-4 mono text-xs text-right whitespace-nowrap">
                      {s.balance > 0 ? (
                        <span className="text-destructive">{formatPHP(s.balance)}</span>
                      ) : (
                        <span className="text-muted-foreground">₱0.00</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">{statusPill(s.status)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onView(s)}
                          className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
                          title="View student"
                        >
                          <EyeGlyph className="h-3.5 w-3.5" />
                        </button>
                        {canRecordPayment && s.status !== "Paid" && (
                          <button
                            onClick={() => onRecordPayment(s)}
                            className="p-2 rounded-md hover:bg-emerald/10 text-muted-foreground hover:text-emerald transition"
                            title="Record payment"
                          >
                            <Wallet className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canManageStudents && (
                          <>
                            <button
                              onClick={() => onEdit(s)}
                              className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
                              title="Edit student"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setPendingDelete(s)}
                              disabled={deletingId === s.studentId}
                              className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition disabled:opacity-40"
                              title="Remove student"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalItems={students.length} onPageChange={onPageChange} />
      {pendingDelete && (
        <ConfirmDeleteStudentModal
          student={pendingDelete}
          busy={deletingId === pendingDelete.studentId}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleDelete(pendingDelete)}
        />
      )}
    </div>
  );
}

function ConfirmDeleteStudentModal({
  student,
  busy,
  onCancel,
  onConfirm,
}: {
  student: StudentDto;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const name = toTitleCase(student.fullName);
  const hasPayments = student.totalPaid > 0 || student.paidFeeCount > 0;

  // Close on Escape (unless the delete request is in flight).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  // Rendered into <body> via a portal: the roster table sits inside a container
  // with overflow/backdrop styles, which would otherwise trap a fixed overlay.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={busy ? undefined : onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="surface-lift w-full max-w-sm p-7 text-center animate-scale-in"
      >
        <div className="mx-auto h-12 w-12 grid place-items-center rounded-full bg-destructive/10 ring-1 ring-destructive/30 text-destructive">
          <Trash2 className="h-5 w-5" />
        </div>

        <h3 id="confirm-delete-title" className="display text-xl mt-5">
          Remove student?
        </h3>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          <span className="text-foreground font-semibold">{name}</span> will be removed from the roster. This
          can't be undone.
        </p>
        <p className="mono text-[11px] text-muted-foreground/80 mt-2">
          {student.studentNumber} · Year {student.yearLevel}
          {student.section ? ` · ${student.section}` : ""}
        </p>

        {hasPayments && (
          <div className="mt-5 flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-left text-xs leading-relaxed bg-amber/10 ring-1 ring-amber/30 text-amber">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-px" />
            <span>
              This student has recorded payments ({formatPHP(student.totalPaid)}), so removal will be blocked.
            </span>
          </div>
        )}

        <div className="mt-7 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} disabled={busy} className="btn btn-ghost w-full">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className="btn btn-danger w-full">
            {busy ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}


function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-foreground/30 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn("surface-lift w-full p-8 space-y-6 animate-scale-in max-h-[86vh] overflow-y-auto", wide ? "max-w-xl" : "max-w-md")}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">Students</div>
            <h3 className="display text-2xl mt-1">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="p-2 -m-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="hairline-b" />
        {children}
      </div>
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

function StudentDetailModal({
  student,
  onClose,
  canRecordPayment,
  onCollectPayment,
}: {
  student: StudentDto;
  onClose: () => void;
  canRecordPayment: boolean;
  onCollectPayment: () => void;
}) {
  const [fees, setFees] = useState<StudentFeeStatusDto[] | null>(null);
  const [history, setHistory] = useState<StudentFeePaymentDto[] | null>(null);

  // The receipt photo opens as its own drawer pinned to the right edge of
  // the screen, next to the modal, instead of swapping out the modal's own
  // content. `receiptPayment` is which payment (if any) the drawer is
  // showing - it stays mounted for the ~300ms of the close animation so it
  // can visibly slide back out, rather than vanishing instantly. `receiptOpen`
  // is just the on/off switch for the slide position itself.
  const [receiptPayment, setReceiptPayment] = useState<StudentFeePaymentDto | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Tracks the edit-photo affordance in the receipt drawer: `photoVersion`
  // is bumped after a successful change/remove to force ReceiptPhoto to
  // refetch (via its `key`), `photoStatus` mirrors what ReceiptPhoto is
  // currently showing so "Remove photo" can be disabled when there's
  // nothing to remove.
  const [photoVersion, setPhotoVersion] = useState(0);
  const [photoStatus, setPhotoStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [photoBusy, setPhotoBusy] = useState(false);
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  // Full edit mode (amount + reference, on top of the photo itself) for the
  // currently-open payment/refund row. Editing the amount is re-validated
  // server-side and, on success, cascades into the roster total (roster's
  // AmountPaid) and the linked Fees & Sources ledger entry.
  const [editMode, setEditMode] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editReference, setEditReference] = useState("");
  const [editMethod, setEditMethod] = useState<PaymentMethod>("Cash");
  const [savingEdit, setSavingEdit] = useState(false);

  const openReceipt = (p: StudentFeePaymentDto) => {
    setReceiptPayment(p);
    setPhotoVersion(0);
    setPhotoStatus("loading");
    setEditMode(false);
    setEditAmount(String(p.amount));
    setEditReference(p.reference ?? "");
    setEditMethod(p.paymentMethod);
    // Double rAF: guarantees the browser has painted one frame with the
    // drawer already mounted off-screen before we flip it to open -
    // otherwise the browser can collapse the "closed -> open" change into a
    // single frame and the slide never visibly animates.
    requestAnimationFrame(() => requestAnimationFrame(() => setReceiptOpen(true)));
  };
  const closeReceipt = () => setReceiptOpen(false);
  const handleDismiss = () => {
    if (receiptPayment) closeReceipt();
    onClose();
  };

  const handleChangePhotoClick = () => {
    photoFileInputRef.current?.click();
  };

  const handlePhotoFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  e.target.value = "";
  if (!file || !receiptPayment) return;
  setPhotoBusy(true);
  try {
    let scannedReference: string | undefined;
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      try {
        const { data } = await worker.recognize(file);
        scannedReference = extractReferenceNumber(data.text) ?? undefined;
      } finally {
        await worker.terminate();
      }
    } catch {
      // Scan failed - fall through and just swap the photo, keeping the existing reference.
    }

    await api.uploadReceipt(receiptPayment.paymentId, file, scannedReference);
    setPhotoVersion((v) => v + 1);
    if (scannedReference) {
      setReceiptPayment((p) => (p ? { ...p, reference: scannedReference! } : p));
      setHistory((h) => h?.map((p) => (p.paymentId === receiptPayment.paymentId ? { ...p, reference: scannedReference! } : p)) ?? h);
      toast.success(`Receipt photo updated — reference set to ${scannedReference}`);
    } else {
      toast.success("Receipt photo updated");
    }
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed to update the receipt photo");
  } finally {
    setPhotoBusy(false);
  }
};

  const handleRemovePhoto = async () => {
    if (!receiptPayment) return;
    if (!window.confirm("Remove the attached receipt photo? This can't be undone.")) return;
    setPhotoBusy(true);
    try {
      await api.deleteReceipt(receiptPayment.paymentId);
      setPhotoVersion((v) => v + 1);
      toast.success("Receipt photo removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove the receipt photo");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!receiptPayment) return;
    const amountNum = parseFloat(editAmount);
    if (!editAmount || Number.isNaN(amountNum) || amountNum <= 0) {
      toast.error("Enter a valid amount greater than 0");
      return;
    }
    setSavingEdit(true);
    try {
      const { data } = await api.updatePayment(receiptPayment.paymentId, {
        amount: amountNum,
        reference: editReference.trim() || undefined,
        paymentDate: receiptPayment.paymentDate,
        paymentMethod: editMethod,
      });
      // Reflects everywhere at once: this drawer, the payment-history list
      // behind it, and (via the fee refetch) the fee-breakdown / roster
      // totals shown in the rest of the modal.
      setReceiptPayment(data);
      setHistory((h) => h?.map((p) => (p.paymentId === data.paymentId ? data : p)) ?? h);
      api.getStudentFees(student.studentId).then(setFees).catch(() => {});
      setEditMode(false);
      toast.success(receiptPayment.isRefund ? "Refund updated" : "Payment updated");
      emitRecordsChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update this entry");
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    api
      .getStudentFees(student.studentId)
      .then(setFees)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load fees"));
    api
      .getPayments({ studentId: student.studentId })
      .then(setHistory)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load payment history"));
  }, [student.studentId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receiptPayment]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-foreground/30 backdrop-blur-sm animate-fade-in"
      onClick={handleDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="surface-lift w-full max-w-xl p-8 animate-scale-in max-h-[86vh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="eyebrow">Students</div>
            <h3 className="display text-2xl mt-1 truncate">{toTitleCase(student.fullName)}</h3>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {student.studentNumber} · Year {student.yearLevel}
              {student.section ? ` · ${student.section}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleDismiss}
              className="p-2 -m-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="hairline-b mt-6 shrink-0" />

        <div className="overflow-y-auto flex-1 -mx-8 px-8 mt-6">
          <div className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="surface p-4">
                  <div className="eyebrow">Due</div>
                  <div className="mono mt-2">{formatPHP(student.totalDue)}</div>
                </div>
                <div className="surface p-4">
                  <div className="eyebrow">Paid</div>
                  <div className="mono mt-2 text-emerald">{formatPHP(student.totalPaid)}</div>
                </div>
                <div className="surface p-4">
                  <div className="eyebrow">Balance</div>
                  <div className={cn("mono mt-2", student.balance > 0 ? "text-destructive" : "text-muted-foreground")}>
                    {formatPHP(student.balance)}
                  </div>
                </div>
              </div>

              <div>
                <div className="eyebrow mb-2">Fee breakdown</div>
                {fees === null ? (
                  <div className="text-xs text-muted-foreground">Loading…</div>
                ) : fees.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No fees apply to this student yet.</div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {fees.map((f) => {
                      const settled = f.status === "Paid";
                      const partial = f.status === "Partial";
                      return (
                        <div key={f.feeId} className="flex items-center justify-between rounded-lg border border-border/70 px-3.5 py-2.5">
                          <div className="flex items-center gap-2.5 text-sm min-w-0">
                            {settled ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald shrink-0" />
                            ) : partial ? (
                              <CircleDot className="h-4 w-4 text-amber shrink-0" />
                            ) : (
                              <CircleDashed className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="truncate">{f.feeName}</span>
                          </div>
                          <div className="mono text-xs shrink-0 ml-2">
                            {formatPHP(f.amountPaid)} <span className="text-muted-foreground">/ {formatPHP(f.amountDue)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <div className="eyebrow mb-2">Payment history</div>
                {history === null ? (
                  <div className="text-xs text-muted-foreground">Loading…</div>
                ) : history.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No payments yet.</div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {history.map((p) => (
                      <div
                        key={p.paymentId}
                        onClick={() => openReceipt(p)}
                        className="flex items-center justify-between rounded-lg bg-muted/40 px-3.5 py-2.5 transition cursor-pointer hover:bg-muted/70"
                      >
                        <div className="min-w-0">
                          <div className="text-sm truncate">
                            {p.feeName}
                            {p.isRefund && (
                              <span className="mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive ml-2">
                                Refund
                              </span>
                            )}
                          </div>
                          <div className="mono text-[10px] text-muted-foreground mt-0.5">
                            {new Date(p.paymentDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })} ·{" "}
                            {p.paymentMethod}
                            {p.reference ? ` · ${p.reference}` : ""}
                          </div>
                        </div>
                        <span className={cn("mono text-sm shrink-0 ml-2", p.isRefund ? "text-destructive" : "text-emerald")}>
                          {p.isRefund ? "−" : ""}
                          {formatPHP(p.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {canRecordPayment && student.status !== "Paid" && (
                <button onClick={onCollectPayment} className="btn btn-primary w-full">
                  <Wallet className="h-4 w-4" /> Collect payment
                </button>
              )}
          </div>
        </div>
      </div>

      {/* Receipt drawer - pinned to the right edge of the screen, beside the
          modal rather than inside it. It stays mounted for the ~300ms of the
          close animation so it can visibly slide back out, rather than
          vanishing instantly. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "fixed inset-y-0 right-0 z-[60] w-full max-w-sm p-6 sm:p-8 flex flex-col",
          "surface-lift !rounded-none !border-y-0 !border-r-0 shadow-2xl",
          "transition-transform duration-300 ease-out",
          receiptOpen ? "translate-x-0" : "translate-x-full",
        )}
        onTransitionEnd={(e) => {
          if (e.propertyName === "transform" && !receiptOpen) setReceiptPayment(null);
        }}
      >
        {receiptPayment && (
          <>
            <div className="flex items-start justify-between gap-4 shrink-0">
              <div className="min-w-0">
                <button onClick={closeReceipt} className="eyebrow flex items-center gap-1 hover:text-foreground transition">
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <h3 className="display text-2xl mt-1 truncate">{receiptPayment.feeName}</h3>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {new Date(receiptPayment.paymentDate).toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  · {receiptPayment.paymentMethod}
                  {receiptPayment.reference ? ` · ${receiptPayment.reference}` : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex items-center gap-3">
                  <span className={cn("mono text-sm font-semibold", receiptPayment.isRefund ? "text-destructive" : "text-emerald")}>
                    {receiptPayment.isRefund ? "−" : ""}
                    {formatPHP(receiptPayment.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={closeReceipt}
                    className="p-2 -m-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setEditMode((o) => !o)}
                  disabled={photoBusy || savingEdit}
                  className={cn(
                    "p-2 rounded-md border transition disabled:opacity-50",
                    editMode
                      ? "border-primary/50 text-primary bg-primary/10"
                      : "border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                  title={receiptPayment.isRefund ? "Edit refund" : "Edit payment"}
                  aria-label={receiptPayment.isRefund ? "Edit refund" : "Edit payment"}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {editMode && (
              <div className="mt-4 p-5 rounded-xl border border-border/70 bg-muted/30 space-y-5 shrink-0">
                <div className="space-y-3">
                  <div className="eyebrow">Details</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <label className="field is-filled">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                      />
                      <span className="field-label">Amount</span>
                    </label>
                    <label className={"field" + (editReference ? " is-filled" : "")}>
                      <input
                        value={editReference}
                        onChange={(e) => setEditReference(e.target.value)}
                        maxLength={50}
                        placeholder="REF-000123"
                      />
                      <span className="field-label">Reference</span>
                    </label>
                    <div className="col-span-2">
                      <SelectPicker
                        label="Payment method"
                        value={editMethod}
                        options={[...PAYMENT_METHODS]}
                        onChange={(v) => setEditMethod(v as PaymentMethod)}
                      />
                    </div>
                  </div>
                </div>

                <div className="hairline-b" />

                <div className="space-y-3">
                  <div className="eyebrow">Receipt photo</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleChangePhotoClick}
                      disabled={photoBusy}
                      className="btn btn-ghost flex-1 justify-center !gap-1.5 !px-2 text-xs whitespace-nowrap"
                    >
                      <Pencil className="h-3.5 w-3.5 shrink-0" /> Change photo
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={photoBusy || photoStatus !== "ready"}
                      className="btn btn-ghost flex-1 justify-center !gap-1.5 !px-2 text-xs whitespace-nowrap text-destructive disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" /> Remove photo
                    </button>
                    <input
                      ref={photoFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoFileSelected}
                    />
                  </div>
                </div>

                <div className="hairline-b" />

                <div className="flex items-center justify-end gap-3">
                  <button type="button" onClick={() => setEditMode(false)} className="btn btn-ghost">
                    Cancel
                  </button>
                  <button type="button" onClick={handleSaveEdit} disabled={savingEdit} className="btn btn-primary">
                    {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save changes"}
                  </button>
                </div>
              </div>
            )}

            <div className="hairline-b mt-6 shrink-0" />
            <div className="overflow-y-auto flex-1 mt-6">
              <ReceiptPhoto
                key={photoVersion}
                paymentId={receiptPayment.paymentId}
                feeName={receiptPayment.feeName}
                onStatusChange={setPhotoStatus}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Just the photo-loading body used inside the StudentDetailModal's receipt drawer. */
function ReceiptPhoto({
  paymentId,
  feeName,
  onStatusChange,
}: {
  paymentId: number;
  feeName: string;
  onStatusChange?: (status: "loading" | "ready" | "missing" | "error") => void;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setState("loading");
    setImgUrl(null);
    onStatusChange?.("loading");
    (async () => {
      try {
        const blob = await api.fetchReceiptBlob(paymentId);
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setImgUrl(objectUrl);
          setState("ready");
          onStatusChange?.("ready");
        }
      } catch (err) {
        if (cancelled) return;
        // A 404 here means this specific payment just never had a photo
        // attached - that's a normal, expected outcome, not a failure.
        const next = err instanceof ApiError && err.status === 404 ? "missing" : "error";
        setState(next);
        onStatusChange?.(next);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  return (
    <div className="bg-black/30 rounded-xl min-h-[16rem] grid place-items-center p-4">
      {state === "missing" ? (
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
      ) : state === "ready" && imgUrl ? (
        <img src={imgUrl} alt={`Receipt for ${feeName}`} className="max-h-[60vh] w-full object-contain rounded-lg" />
      ) : (
        <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
          <div className="h-6 w-6 rounded-full border-2 border-current border-t-transparent animate-spin" />
          <div className="text-xs">Loading photo…</div>
        </div>
      )}
    </div>
  );
}

function RecordPaymentModal({
  student,
  onClose,
  onSaved,
}: {
  student: StudentDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fees, setFees] = useState<StudentFeeStatusDto[] | null>(null);
  const [feeSearch, setFeeSearch] = useState("");
  const [feeId, setFeeId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [reference, setReference] = useState("");
  const [bankName, setBankName] = useState("");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .getStudentFees(student.studentId)
      .then((data) => {
        setFees(data);
        const firstUnpaid = data.find((f) => f.status !== "Paid");
        if (firstUnpaid) {
          setFeeId(firstUnpaid.feeId);
          setAmount(String(firstUnpaid.balance));
        }
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load fees"));
  }, [student.studentId]);

  const selectedFee = fees?.find((f) => f.feeId === feeId) ?? null;

  const visibleFees =
    fees === null
      ? null
      : fees.filter((f) => {
          return matchesSearch(feeSearch, f.feeName, f.feeCategory);
        });

  const pickFee = (f: StudentFeeStatusDto) => {
    setFeeId(f.feeId);
    setAmount(String(f.balance));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeId) return toast.error("Select a fee to pay");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    if (method === "Bank Transfer" && !bankName.trim()) return toast.error("Specify the bank");
    if (method !== "Cash" && !reference.trim()) return toast.error("Enter a reference number for this payment method");

    setSubmitting(true);
    try {
      const result = await api.recordFeePayment(student.studentId, {
        feeId,
        amount: amt,
        paymentDate: date,
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
          toast.error("Payment saved, but the receipt photo couldn't be attached.");
        }
      }
      toast.success(photoAttached ? "Payment recorded — photo attached" : "Payment recorded");
      emitRecordsChanged();
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="Collect payment" subtitle={`${toTitleCase(student.fullName)} (${student.studentNumber}) · Year ${student.yearLevel}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={feeSearch}
            onChange={(e) => setFeeSearch(e.target.value)}
            placeholder="Search fees…"
            className="w-full bg-transparent border border-border/70 rounded-lg pl-9 pr-9 py-2 text-sm outline-none placeholder:text-muted-foreground/70 focus:border-emerald/50 transition"
          />
          <SearchClearButton value={feeSearch} onClear={() => setFeeSearch("")} />
        </div>
        <div>
          <span className="eyebrow">Fee</span>
          <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1">
            {fees === null ? (
              <div className="text-xs text-muted-foreground">Loading fees…</div>
            ) : fees.length === 0 ? (
              <div className="text-xs text-muted-foreground">No fees apply to this student yet.</div>
            ) : visibleFees !== null && visibleFees.length === 0 ? (
              <div className="text-xs text-muted-foreground">No fees match "{feeSearch.trim()}".</div>
            ) : (
              (visibleFees ?? []).map((f) => (
                <button
                  key={f.feeId}
                  type="button"
                  onClick={() => pickFee(f)}
                  className={cn(
                    "w-full flex items-center justify-between rounded-lg border px-3.5 py-3 text-left transition",
                    feeId === f.feeId ? "border-emerald/50 bg-emerald/8" : "border-border/70 hover:bg-muted/50",
                    f.status === "Paid" && "opacity-50",
                  )}
                >
                  <div>
                    <div className="text-sm font-medium"><Highlight text={f.feeName} query={feeSearch} /></div>
                    <div className="mono text-[10px] text-muted-foreground mt-0.5">
                      <Highlight text={f.feeCategory} query={feeSearch} /> · due {new Date(f.feeDueDate).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="mono text-sm">{formatPHP(f.amountDue)}</div>
                    <div className={cn("mono text-[10px]", f.status === "Paid" ? "text-emerald" : "text-amber")}>
                      {f.status === "Paid" ? "SETTLED" : `${formatPHP(f.balance)} left`}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <FloatField label="Amount (PHP)" value={amount}>
            <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
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
          <button type="submit" disabled={submitting || !selectedFee} className="btn btn-primary">
            {submitting ? "Saving…" : "Save payment"} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function EditStudentModal({
  student,
  onClose,
  onSaved,
}: {
  student: StudentDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const parsed = useMemo(() => parseStudentName(student.fullName), [student.fullName]);
  const [lastName, setLastName] = useState(parsed.lastName);
  const [firstName, setFirstName] = useState(parsed.firstName);
  const [middleInitial, setMiddleInitial] = useState(parsed.middleInitial);
  const [yearLevel, setYearLevel] = useState<YearLevel>(student.yearLevel);
  const [section, setSection] = useState(student.section ?? "");
  const [email, setEmail] = useState(student.email ?? "");
  const [isActive, setIsActive] = useState(student.isActive);
  const [submitting, setSubmitting] = useState(false);

  const preview = formatStudentName(lastName, firstName, middleInitial);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lastName.trim() || !firstName.trim()) return toast.error("Last name and first name are required");

    setSubmitting(true);
    try {
      await api.updateStudent(student.studentId, {
        fullName: preview,
        yearLevel,
        section: section.trim() || undefined,
        email: email.trim() || undefined,
        isActive,
      });
      toast.success("Student updated");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update student");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="Edit student" subtitle={`${student.studentNumber} · currently Year ${student.yearLevel}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-2" autoComplete="off">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <FloatField label="Last name" value={lastName}>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
                            autoComplete="new-password"
              name="student-last-name"
            />
          </FloatField>
          <FloatField label="First name" value={firstName}>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
                            autoComplete="new-password"
              name="student-first-name"
            />
          </FloatField>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <FloatField label="Middle initial (optional)" value={middleInitial}>
            <input
              value={middleInitial}
              onChange={(e) => setMiddleInitial(e.target.value.slice(0, 1))}
                            maxLength={1}
              autoComplete="new-password"
              name="student-middle-initial"
            />
          </FloatField>
          <SelectPicker
            label="Year level"
            value={String(yearLevel)}
            options={YEAR_LEVEL_OPTIONS}
            onChange={(v) => setYearLevel(Number(v) as YearLevel)}
          />
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <FloatField label="Section (optional)" value={section}>
            <input value={section} onChange={(e) => setSection(e.target.value)} placeholder="BSIT-3A" />
          </FloatField>
          <FloatField label="Email (optional)" value={email}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FloatField>
        </div>
        {lastName.trim() && firstName.trim() && (
          <p className="text-[11px] text-muted-foreground pt-1">
            Will appear as <span className="text-foreground">{toTitleCase(preview)}</span>
          </p>
        )}
        <label className="flex items-center gap-2 pt-3 text-sm cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" />
          Active (uncheck to mark this student inactive without deleting their history)
        </label>
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? "Saving…" : "Save changes"} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function AddStudentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [studentNumber, setStudentNumber] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [yearLevel, setYearLevel] = useState<YearLevel>(1);
  const [section, setSection] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const preview = formatStudentName(lastName, firstName, middleInitial);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNumber.trim() || !lastName.trim() || !firstName.trim())
      return toast.error("Student number, last name, and first name are required");

    setSubmitting(true);
    try {
      await api.createStudent({
        studentNumber: studentNumber.trim(),
        fullName: preview,
        yearLevel,
        section: section.trim() || undefined,
        email: email.trim() || undefined,
      });
      toast.success("Student added");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add student");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="Add student" subtitle="Enroll one student and set up their fee records." onClose={onClose}>
      <form onSubmit={submit} className="space-y-2" autoComplete="off">
        <FloatField label="Student number" value={studentNumber}>
          <input value={studentNumber} onChange={(e) => setStudentNumber(e.target.value)} placeholder="2026-0123" />
        </FloatField>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <FloatField label="Last name" value={lastName}>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
                            autoComplete="new-password"
              name="student-last-name"
            />
          </FloatField>
          <FloatField label="First name" value={firstName}>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
                            autoComplete="new-password"
              name="student-first-name"
            />
          </FloatField>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <FloatField label="Middle initial (optional)" value={middleInitial}>
            <input
              value={middleInitial}
              onChange={(e) => setMiddleInitial(e.target.value.slice(0, 1))}
                            maxLength={1}
              autoComplete="new-password"
              name="student-middle-initial"
            />
          </FloatField>
          <SelectPicker
            label="Year level"
            value={String(yearLevel)}
            options={YEAR_LEVEL_OPTIONS}
            onChange={(v) => setYearLevel(Number(v) as YearLevel)}
          />
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <FloatField label="Section (optional)" value={section}>
            <input value={section} onChange={(e) => setSection(e.target.value)} placeholder="BSIT-3A" />
          </FloatField>
          <FloatField label="Email (optional)" value={email}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FloatField>
        </div>
        {lastName.trim() && firstName.trim() && (
          <p className="text-[11px] text-muted-foreground pt-1">
            Will appear as <span className="text-foreground">{toTitleCase(preview)}</span>
          </p>
        )}
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? "Adding…" : "Add student"} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportStudentsResultDto | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error("Choose a CSV file first");

    setSubmitting(true);
    try {
      const res = await api.importStudents(file);
      setResult(res.data);
      onImported();
      if (res.data.importedCount > 0) toast.success(`Imported ${res.data.importedCount} student(s)`);
      if (res.data.skippedCount > 0) toast.error(`${res.data.skippedCount} row(s) were skipped`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      title="Import students"
      subtitle="Upload a CSV: StudentNumber, FullName, YearLevel, Section, Email"
      onClose={onClose}
      wide
    >
      <div className="space-y-5">
        <a
          href={api.downloadImportTemplateUrl()}
          className="inline-flex items-center gap-1.5 text-xs text-emerald hover:underline"
        >
          <Download className="h-3.5 w-3.5" /> Download blank CSV template
        </a>

        <form onSubmit={submit} className="space-y-4">
          <label className="surface p-6 flex flex-col items-center justify-center gap-2 border-dashed cursor-pointer hover:bg-muted/30 transition">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{file ? file.name : "Click to choose a .csv file"}</span>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Close
            </button>
            <button type="submit" disabled={submitting || !file} className="btn btn-primary">
              {submitting ? "Importing…" : "Import"} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>

        {result && (
          <div className="hairline-t pt-4 space-y-3 text-xs">
            <div className="flex gap-4">
              <span className="text-emerald font-medium">{result.importedCount} imported</span>
              <span className="text-destructive font-medium">{result.skippedCount} skipped</span>
              <span className="text-muted-foreground">of {result.totalRows} rows</span>
            </div>
            {result.skipped.length > 0 && (
              <div className="surface p-3 max-h-40 overflow-y-auto space-y-1.5">
                {result.skipped.map((s) => (
                  <div key={s.rowNumber} className="text-muted-foreground">
                    <span className="mono text-destructive">Row {s.rowNumber}:</span> {s.reason}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
