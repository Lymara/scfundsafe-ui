import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { useAuth } from "@/lib/auth-context";
import { PwInput } from "@/components/pw-input";
import { api, ApiError, type Role, type UserListItemDto, type ActivityLogDto } from "@/lib/api";
import {
  SlidersHorizontal,
  ArrowRight,
  KeySquare,
  UsersRound,
  ScrollText,
  UserRoundPlus,
  UserRoundX,
  RotateCcw,
  UserRoundMinus,
  UserRoundCheck,
  X,
  Search,
  ShieldCheck,
  CircleUserRound,
  BadgeCheck,
  AtSign,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { SearchClearButton } from "@/components/search-clear";
import { Highlight } from "@/components/highlight";
import { matchesSearch } from "@/lib/search";
import { cn } from "@/lib/utils";
import { Pagination, paginate, DEFAULT_PAGE_SIZE } from "@/components/pagination";
import { PrintTable } from "@/components/print-table";
import { SelectPicker } from "@/components/select-picker";
import { DatePicker } from "@/components/date-picker";
import bitsLogo from "@/assets/bits-logo.png";

type Tab = "account" | "members" | "activity";

function roleLabel(role: string) {
  return role === "ClassRepresentative" ? "Class Representative" : role;
}

/** Every distinct `action` string the API logs, grouped under the page it
 * belongs to. Order matters - more specific phrases (e.g. "fee payment")
 * are checked before the generic ones ("fee") they'd otherwise collide
 * with. Falls back to "Members" since everything left over is an
 * admin-on-account action (create/remove/deactivate/reset password). */
const ACTIVITY_MODULES = ["All", "Account", "Members", "Students", "Payments", "Fees", "Records"] as const;
type ActivityModule = (typeof ACTIVITY_MODULES)[number];

function activityModule(action: string): Exclude<ActivityModule, "All"> {
  const a = action.toLowerCase();
  if (a.includes("signed in") || a.includes("own password")) return "Account";
  if (a.includes("fee payment") || a.includes("refund") || a.includes("receipt")) return "Payments";
  if (a.includes("student")) return "Students";
  if (a.includes("fee")) return "Fees";
  if (a.includes("income") || a.includes("expense") || a.includes("record")) return "Records";
  return "Members";
}

export default function SettingsPage() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "Admin";
  const [tab, setTab] = useState<Tab>("account");

  const tabs: { id: Tab; label: string; hint: string; icon: typeof KeySquare; adminOnly?: boolean }[] = [
    { id: "account", label: "Account", hint: "Personal credentials", icon: CircleUserRound },
    { id: "members", label: "Members", hint: "Directory & roles", icon: UsersRound, adminOnly: true },
    { id: "activity", label: "Audit trail", hint: "System activity", icon: ScrollText, adminOnly: true },
  ];
  const visible = tabs.filter((t) => !t.adminOnly || isAdmin);

  return (
    <AppLayout>
      <div className="space-y-10 pb-16">
        <header className="flex items-start justify-between gap-6 flex-wrap print:hidden">
          <div>
            <div className="eyebrow flex items-center gap-2">
              <SlidersHorizontal className="h-3 w-3 text-amber" />
              {isAdmin ? "Admin console" : "Personal preferences"}
            </div>
            <h1 className="display text-4xl md:text-5xl mt-3">Settings.</h1>
            <p className="text-muted-foreground mt-3 max-w-lg text-sm leading-relaxed">
              {isAdmin
                ? "Provision council accounts, review the audit trail, and manage your credentials."
                : "Manage your personal credentials for IT FundSafe."}
            </p>
          </div>
        </header>

        {visible.length > 1 && (
          <nav className="grid gap-2 sm:grid-cols-3 print:hidden">
            {visible.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "group text-left surface p-4 transition-all duration-200 relative overflow-hidden",
                    active
                      ? "ring-1 ring-emerald/40 shadow-[0_0_0_1px_var(--emerald)/10,0_8px_30px_-12px_var(--emerald-glow)]"
                      : "hover:ring-1 hover:ring-border hover:-translate-y-0.5",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={cn(
                        "h-9 w-9 rounded-lg grid place-items-center transition",
                        active
                          ? "bg-emerald/15 text-emerald ring-1 ring-emerald/30"
                          : "bg-muted text-muted-foreground group-hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    {active && <span className="mono text-[9px] uppercase tracking-widest text-emerald">Active</span>}
                  </div>
                  <div className="mt-3 text-sm font-semibold">{t.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{t.hint}</div>
                </button>
              );
            })}
          </nav>
        )}

        {tab === "account" && <AccountSection />}
        {tab === "members" && isAdmin && <MembersSection />}
        {tab === "activity" && isAdmin && <ActivitySection />}
      </div>
    </AppLayout>
  );
}

/* ---------------- Account ---------------- */

function AccountSection() {
  const { currentUser } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirmPw) return toast.error("New passwords do not match");
    if (next.length < 6) return toast.error("New password must be at least 6 characters");

    setSubmitting(true);
    try {
      await api.changePassword({ currentPassword: current, newPassword: next });
      toast.success("Password updated");
      setCurrent("");
      setNext("");
      setConfirmPw("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update password");
    } finally {
      setSubmitting(false);
    }
  };

  const initials = currentUser?.fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <aside className="surface-lift p-6 space-y-6 h-fit">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full grid place-items-center text-sm font-semibold text-primary-foreground gradient-emerald shrink-0 ring-1 ring-emerald/30">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold truncate">{currentUser?.fullName}</div>
            <div className="text-[11px] uppercase tracking-widest text-amber mt-0.5 flex items-center gap-1">
              <BadgeCheck className="h-3 w-3" /> {currentUser ? roleLabel(currentUser.role) : ""}
            </div>
          </div>
        </div>
        <div className="hairline-b" />
        <dl className="space-y-3 text-xs">
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <AtSign className="h-3.5 w-3.5" /> Email
            </dt>
            <dd className="mono text-foreground truncate max-w-[160px]">{currentUser?.email}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Access
            </dt>
            <dd className="mono text-emerald">{currentUser ? roleLabel(currentUser.role) : ""}</dd>
          </div>
        </dl>
      </aside>

      <form onSubmit={submit} className="surface-lift p-8 md:p-10 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg grid place-items-center bg-amber/10 text-amber ring-1 ring-amber/30">
              <KeySquare className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">Change password</div>
              <div className="text-xs text-muted-foreground">Use at least 6 characters. Hold the eye to reveal.</div>
            </div>
          </div>
          <span className="mono text-[10px] uppercase tracking-widest text-muted-foreground hidden sm:inline">
            Section 01
          </span>
        </div>
        <div className="hairline-b" />
        <div className="space-y-2">
          <FloatField label="Current password" value={current}>
            <PwInput value={current} onChange={setCurrent} autoComplete="current-password" />
          </FloatField>
          <FloatField label="New password" value={next}>
            <PwInput value={next} onChange={setNext} autoComplete="new-password" />
          </FloatField>
          <FloatField label="Confirm new password" value={confirmPw}>
            <PwInput value={confirmPw} onChange={setConfirmPw} autoComplete="new-password" />
          </FloatField>
        </div>
        <div className="flex items-center justify-between pt-2">
          <p className="text-[11px] text-muted-foreground">You will remain signed in on this device.</p>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? "Updating…" : "Update password"} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- Members ---------------- */

function MembersSection() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserListItemDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserListItemDto | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => matchesSearch(q, u.fullName, u.email, u.role, roleLabel(u.role)));
  }, [users, q]);

  const roleCounts = useMemo(() => {
    const map: Record<string, number> = {};
    (users ?? []).forEach((u) => (map[u.role] = (map[u.role] ?? 0) + 1));
    return map;
  }, [users]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-emerald" /> Account directory
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            Create, remove, and reset passwords for council members. Admins cannot record income or expenses.
          </p>
        </div>
        <button onClick={() => setCreating(true)} className="btn btn-primary shrink-0">
          <UserRoundPlus className="h-4 w-4" /> Add account
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatChip label="Total members" value={users?.length ?? 0} tone="emerald" />
        <StatChip label="Admins" value={roleCounts["Admin"] ?? 0} tone="amber" />
        <StatChip label="Treasurers" value={roleCounts["Treasurer"] ?? 0} />
        <StatChip label="Officers" value={roleCounts["Officer"] ?? 0} />
      </div>

      <div className="surface p-2 flex items-center gap-1">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, or role…"
            className="w-full bg-transparent pl-9 pr-9 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70"
          />
          <SearchClearButton value={q} onClear={() => setQ("")} />
        </div>
        <span className="mono text-[10px] text-muted-foreground pr-3">{filtered.length} shown</span>
      </div>

      <div className="surface overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-5 py-3 hairline-b text-[10px] uppercase tracking-widest text-muted-foreground mono">
          <span className="w-6">#</span>
          <span>Member</span>
          <span>Role</span>
          <span>Email</span>
          <span className="w-32 text-right">Actions</span>
        </div>

        {loading ? (
          <div className="p-14 text-center">
            <div className="mono text-xs text-muted-foreground">LOADING…</div>
          </div>
        ) : (
          <div className="divide-y divide-border/70">
            {filtered.map((u, i) => {
              const self = u.userId === currentUser?.userId;
              const initials = u.fullName
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              return (
                <div
                  key={u.userId}
                  className={cn(
                    "grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-5 py-4 hover:bg-muted/40 transition group",
                    !u.isActive && "opacity-50",
                  )}
                >
                  <span className="mono text-[10px] text-muted-foreground w-6">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full grid place-items-center text-[10px] font-semibold bg-muted text-foreground/80 ring-1 ring-border shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate flex items-center gap-2">
                        <Highlight text={u.fullName} query={q} />
                        {self && (
                          <span className="mono text-[9px] text-emerald border border-emerald/30 rounded px-1.5 py-0.5">
                            YOU
                          </span>
                        )}
                        {!u.isActive && (
                          <span className="mono text-[9px] text-muted-foreground border border-border rounded px-1.5 py-0.5">
                            DEACTIVATED
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest mono ring-1",
                        u.role === "Admin" ? "text-amber ring-amber/30 bg-amber/5" : "text-emerald ring-emerald/30 bg-emerald/5",
                      )}
                    >
                      <Highlight text={roleLabel(u.role)} query={q} />
                    </span>
                  </div>
                  <div className="text-xs mono text-muted-foreground truncate"><Highlight text={u.email} query={q} /></div>
                  <div className="flex gap-1 justify-end w-32">
                    <button
                      onClick={() => setResetTarget(u)}
                      className="p-2 rounded-md hover:bg-amber/10 text-muted-foreground hover:text-amber transition"
                      title="Reset password"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      disabled={self}
                      onClick={async () => {
                        const action = u.isActive ? "Deactivate" : "Reactivate";
                        if (!confirm(`${action} account for ${u.fullName}?`)) return;
                        try {
                          if (u.isActive) {
                            await api.deactivateUser(u.userId);
                            toast.success("Account deactivated");
                          } else {
                            await api.reactivateUser(u.userId);
                            toast.success("Account reactivated");
                          }
                          load();
                        } catch (err) {
                          toast.error(err instanceof ApiError ? err.message : `Failed to ${action.toLowerCase()} account`);
                        }
                      }}
                      className="p-2 rounded-md hover:bg-amber/10 text-muted-foreground hover:text-amber transition disabled:opacity-30 disabled:pointer-events-none"
                      title={self ? "You cannot deactivate your own account" : u.isActive ? "Deactivate" : "Reactivate"}
                    >
                      {u.isActive ? <UserRoundMinus className="h-3.5 w-3.5" /> : <UserRoundCheck className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      disabled={self}
                      onClick={async () => {
                        if (!confirm(`Permanently remove account for ${u.fullName}? This cannot be undone.`)) return;
                        try {
                          await api.deleteUser(u.userId);
                          toast.success("Account removed");
                          load();
                        } catch (err) {
                          toast.error(err instanceof ApiError ? err.message : "Failed to remove account");
                        }
                      }}
                      className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition disabled:opacity-30 disabled:pointer-events-none"
                      title={self ? "You cannot remove your own account" : "Permanently remove"}
                    >
                      <UserRoundX className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-12 text-center">
                <div className="mono text-xs text-muted-foreground">NO MATCHES</div>
                <div className="mt-2 text-sm text-muted-foreground">Try a different search term.</div>
              </div>
            )}
          </div>
        )}
      </div>

      {creating && (
        <CreateModal
          onClose={() => setCreating(false)}
          onSubmit={async (payload) => {
            try {
              await api.createUser(payload);
              toast.success("Account created");
              setCreating(false);
              load();
            } catch (err) {
              toast.error(err instanceof ApiError ? err.message : "Failed to create account");
            }
          }}
        />
      )}

      {resetTarget && (
        <ResetModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
          onSubmit={async (pw) => {
            try {
              await api.resetUserPassword(resetTarget.userId, pw);
              toast.success("Password reset");
              setResetTarget(null);
            } catch (err) {
              toast.error(err instanceof ApiError ? err.message : "Failed to reset password");
            }
          }}
        />
      )}
    </div>
  );
}

function StatChip({ label, value, tone }: { label: string; value: number; tone?: "emerald" | "amber" }) {
  return (
    <div className="surface p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mono">{label}</div>
      <div
        className={cn("display text-2xl mt-1", tone === "emerald" && "text-emerald", tone === "amber" && "text-amber")}
      >
        {String(value).padStart(2, "0")}
      </div>
    </div>
  );
}

function CreateModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (u: { fullName: string; email: string; password: string; role: Role }) => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("Treasurer");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      return toast.error("Fill all fields (password must be at least 6 characters)");
    }
    setSubmitting(true);
    await onSubmit({ fullName: fullName.trim(), email: email.trim(), password, role });
    setSubmitting(false);
  };

  return (
    <ModalShell title="Add account" subtitle="Issue credentials for a council member." onClose={onClose}>
      <form onSubmit={submit} className="space-y-2">
        <FloatField label="Full name" value={fullName}>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </FloatField>
        <FloatField label="Email" value={email}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </FloatField>
        <FloatField label="Temporary password" value={password}>
          <PwInput value={password} onChange={setPassword} />
        </FloatField>
        <SelectPicker
          label="Role"
          value={role}
          options={[
            { value: "Treasurer", label: "Treasurer" },
            { value: "Officer", label: "Officer" },
            { value: "ClassRepresentative", label: "Class Representative" },
            { value: "Adviser", label: "Adviser" },
            { value: "Admin", label: "Admin" },
          ]}
          onChange={(v) => setRole(v as Role)}
        />
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? "Creating…" : "Create account"} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ResetModal({
  user,
  onClose,
  onSubmit,
}: {
  user: UserListItemDto;
  onClose: () => void;
  onSubmit: (pw: string) => void;
}) {
  const [pw, setPw] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Password must be at least 6 characters");
    setSubmitting(true);
    await onSubmit(pw);
    setSubmitting(false);
  };

  return (
    <ModalShell title="Reset password" subtitle={`New password for ${user.fullName} (${user.email})`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-2">
        <FloatField label="New password" value={pw}>
          <PwInput value={pw} onChange={setPw} />
        </FloatField>
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? "Resetting…" : "Reset password"} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4 bg-foreground/30 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="surface-lift max-w-md w-full p-8 space-y-6 animate-scale-in">
        <div className="flex items-start justify-between">
          <div>
            <div className="eyebrow">Admin action</div>
            <h3 className="display text-2xl mt-1">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -m-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="hairline-b" />
        {children}
      </div>
    </div>
  );
}

/* ---------------- Activity ---------------- */

function ActivitySection() {
  const [logs, setLogs] = useState<ActivityLogDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [module, setModule] = useState<ActivityModule>("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await api.getActivityLogs();
        setLogs(data);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Failed to load activity");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const results = useMemo(() => {
    if (!logs) return [];
    const fromDt = from ? new Date(`${from}T00:00:00`) : null;
    const toDt = to ? new Date(`${to}T23:59:59.999`) : null;

    return logs.filter((l) => {
      if (module !== "All" && activityModule(l.action) !== module) return false;
      if (fromDt || toDt) {
        const created = new Date(l.createdAt);
        if (fromDt && created < fromDt) return false;
        if (toDt && created > toDt) return false;
      }
      if (!matchesSearch(q, l.action, l.userName, l.detail)) return false;
      return true;
    });
  }, [logs, q, module, from, to]);

  useEffect(() => {
    setPage(1);
  }, [q, module, from, to]);

  const hasFilters = !!q || module !== "All" || !!from || !!to;
  const clearFilters = () => {
    setQ("");
    setModule("All");
    setFrom("");
    setTo("");
  };

  const dateRangeLabel = (() => {
    if (!from && !to) return "";
    const fmt = (v: string) => new Date(`${v}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
    if (from && to) return `${fmt(from)} – ${fmt(to)}`;
    if (from) return `Since ${fmt(from)}`;
    return `Through ${fmt(to)}`;
  })();

  return (
    <div className="space-y-6">
      {/* Print-only letterhead - mirrors the Reports page so a printed audit
          trail looks like an official document, not a screenshot. Reflects
          whatever search/module/date filters are active on screen, so the
          printout always matches what was on screen when Print was pressed. */}
      <div className="hidden print:block space-y-1 pb-4 mb-2 border-b-2 border-black/80">
        <div className="flex items-center gap-3">
          <img src={bitsLogo} alt="BSIT Department" className="h-10 w-10 object-contain" />
          <div>
            <div className="text-lg font-bold leading-none">IT FundSafe</div>
            <div className="text-[10px] text-black/60 mt-0.5">BSIT Department Council · Audit Trail</div>
          </div>
        </div>
        <div className="flex items-baseline justify-between pt-2 text-[11px] text-black/70">
          <span>
            {results.length} entr{results.length === 1 ? "y" : "ies"}
            {module !== "All" ? ` · ${module}` : ""}
            {dateRangeLabel ? ` · ${dateRangeLabel}` : ""}
            {q ? ` · matching "${q}"` : ""}
          </span>
          <span>Generated {new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" })}</span>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap print:hidden">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ScrollText className="h-4 w-4 text-emerald" /> Audit trail
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            A tamper-evident record of every action taken in IT FundSafe.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground surface px-3 py-2">
            {logs?.length ?? 0} total entries
          </div>
          <button
            onClick={() => window.print()}
            disabled={loading || results.length === 0}
            title={hasFilters ? `Print ${results.length} filtered entr${results.length === 1 ? "y" : "ies"}` : "Print the audit trail"}
            className="btn btn-primary disabled:opacity-40 disabled:pointer-events-none"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>
      </div>

      {/* Filter bar: free-text search, module, and date range all narrow
          `results` together - and whatever is left is exactly what Print
          sends to the printer below. */}
      <div className="surface p-2 flex flex-wrap items-center gap-1 print:hidden">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search action, user, detail…"
            className="w-full bg-transparent pl-9 pr-9 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70"
          />
          <SearchClearButton value={q} onClear={() => setQ("")} />
        </div>
        <div className="flex items-center gap-1 pl-2 border-l border-border/70">
          <DatePicker value={from} onChange={setFrom} dense placeholder="From" />
          <span className="text-muted-foreground text-xs">→</span>
          <DatePicker value={to} onChange={setTo} dense placeholder="To" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/40 border border-border/70 flex-wrap print:hidden">
          {ACTIVITY_MODULES.map((m) => (
            <button
              key={m}
              onClick={() => setModule(m)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] transition",
                module === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 print:hidden">
          {hasFilters && (
            <button onClick={clearFilters} className="link-hover text-xs">
              Clear filters
            </button>
          )}
          <span className="mono text-[10px] text-muted-foreground">{results.length} shown</span>
        </div>
      </div>

      {/* On-screen: paginated, page-by-page. Hidden entirely when printing. */}
      <div className="surface overflow-hidden print:hidden">
        {loading ? (
          <div className="p-14 text-center">
            <div className="mono text-xs text-muted-foreground">LOADING…</div>
          </div>
        ) : results.length === 0 ? (
          <div className="p-14 text-center">
            <div className="mono text-xs text-muted-foreground">NO ACTIVITY</div>
            <div className="mt-2 text-sm text-muted-foreground">Actions will appear here as they happen.</div>
          </div>
        ) : (
          <ol className="relative">
            {paginate(results, page).map((l, i) => {
              const d = new Date(l.createdAt);
              return (
                <li
                  key={l.logId}
                  className="grid grid-cols-[auto_1fr_auto] gap-4 px-5 py-4 items-start hover:bg-muted/40 transition border-b border-border/70 last:border-b-0"
                >
                  <div className="flex flex-col items-center pt-0.5">
                    <div className="h-8 w-8 rounded-full grid place-items-center bg-muted text-muted-foreground ring-1 ring-border">
                      <ScrollText className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium flex items-center gap-2 flex-wrap">
                      <Highlight text={l.action} query={q} />
                      {l.detail && <span className="text-muted-foreground font-normal">· <Highlight text={l.detail} query={q} /></span>}
                      <span className="mono text-[9px] uppercase tracking-widest text-muted-foreground border border-border rounded px-1.5 py-0.5">
                        {activityModule(l.action)}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mono mt-1 flex items-center gap-2">
                      <span>by <Highlight text={l.userName} query={q} /></span>
                      <span className="opacity-50">·</span>
                      <span>#{String(results.length - ((page - 1) * DEFAULT_PAGE_SIZE + i)).padStart(3, "0")}</span>
                    </div>
                  </div>
                  <div className="mono text-[11px] text-muted-foreground text-right whitespace-nowrap">
                    {d.toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "Asia/Manila" })}
                    <div className="text-[10px] opacity-70">
                      {d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila" })}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      {!loading && results.length > 0 && (
        <div className="print:hidden">
          <Pagination page={page} totalItems={results.length} onPageChange={setPage} />
        </div>
      )}

      {/* Print: every matching entry in full, regardless of the on-screen page. Never shown on screen. */}
      {!loading && results.length > 0 && (
        <div className="hidden print:block">
          <PrintTable
            dense
            head={["#", "Action", "Module", "User", "Detail", "Date", "Time"]}
            rows={results.map((l, i) => {
              const d = new Date(l.createdAt);
              return [
                String(results.length - i).padStart(3, "0"),
                l.action,
                activityModule(l.action),
                l.userName,
                l.detail ?? "",
                d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }),
                d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Manila" }),
              ];
            })}
            align={["right", "left", "left", "left", "left", "right", "right"]}
          />
        </div>
      )}
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

