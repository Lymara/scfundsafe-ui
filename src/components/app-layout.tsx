import { Link, useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Search,
  FileBarChart,
  LogOut,
  ShieldCheck,
  Settings as SettingsIcon,
  GraduationCap,
  Receipt,
  Wallet,
  Calculator,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/api";
import bitsLogo from "@/assets/bits-logo.png";

type NavLeaf = { to: string; label: string; icon: typeof LayoutDashboard; roles?: Role[] };
type NavGroup = { key: string; label: string; icon: typeof LayoutDashboard; standalone?: boolean; items: NavLeaf[] };

const navGroups: NavGroup[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, standalone: true, items: [{ to: "/dashboard", label: "Overview", icon: LayoutDashboard }] },
  {
    key: "students",
    label: "Students",
    icon: GraduationCap,
    items: [
      { to: "/students", label: "Roster", icon: GraduationCap },
      { to: "/payments", label: "Payments", icon: Receipt },
    ],
  },
  {
    key: "treasury",
    label: "Treasury",
    icon: Wallet,
    items: [
      { to: "/income", label: "Record Income", icon: TrendingUp, roles: ["Treasurer"] },
      { to: "/expenses", label: "Record Expense", icon: TrendingDown, roles: ["Treasurer"] },
      { to: "/records", label: "Records", icon: Search },
    ],
  },
  {
    key: "insights",
    label: "Insights",
    icon: FileBarChart,
    items: [
      { to: "/reports", label: "Reports", icon: FileBarChart },
      { to: "/calculator", label: "Calculator", icon: Calculator },
    ],
  },
  { key: "settings", label: "Settings", icon: SettingsIcon, standalone: true, items: [{ to: "/settings", label: "Settings", icon: SettingsIcon }] },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  useEffect(() => {
    if (!currentUser) navigate("/auth");
  }, [currentUser, navigate]);

  // Groups visible to this role (a group with zero visible items after role
  // filtering - e.g. "Treasury" for a non-Treasurer, minus its Treasurer-only
  // leaves - still shows if at least one item remains, like Records).
  const visibleGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((item) => !item.roles || (currentUser && item.roles.includes(currentUser.role))) }))
    .filter((g) => g.items.length > 0);

  // The group containing the current page starts expanded; the rest start
  // collapsed, so the sidebar stays compact without hiding where you are.
  const activeGroupKey = visibleGroups.find((g) => g.items.some((item) => item.to === pathname))?.key;
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(activeGroupKey ? [activeGroupKey] : []));

  useEffect(() => {
    if (activeGroupKey) {
      setOpenGroups((prev) => (prev.has(activeGroupKey) ? prev : new Set(prev).add(activeGroupKey)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  if (!currentUser) return null;

  const flatMobileItems = visibleGroups.flatMap((g) => g.items);

  const initials = currentUser.fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  let rowNumber = 0;

  return (
    <div id="app-shell" className="h-screen flex text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex w-[272px] shrink-0 flex-col h-screen overflow-hidden border-r border-border/60 bg-sidebar relative">
        {/* backdrop glow */}
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-emerald/10 blur-3xl" />
          <div className="absolute bottom-0 -right-16 h-72 w-72 rounded-full bg-amber/5 blur-3xl" />
        </div>

        {/* Brand */}
        <div className="relative px-6 pt-7 pb-6">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 rounded-xl grid place-items-center bg-gradient-to-br from-emerald/25 to-emerald/5 ring-1 ring-emerald/30">
              <img src={bitsLogo} alt="BSIT Department" className="h-8 w-8 object-contain" loading="eager" />
              <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber ring-2 ring-sidebar grid place-items-center">
                <ShieldCheck className="h-2 w-2 text-[oklch(0.18_0.03_60)]" />
              </span>
            </div>
            <div className="min-w-0">
              <div className="display text-xl leading-none">
                IT <span className="gradient-text">FundSafe</span>
              </div>
              <div className="mono text-[10px] text-muted-foreground/80 mt-1 truncate">BSIT Department Council</div>
            </div>
          </div>
        </div>

        <div className="mx-6 hairline-b" />

        {/* Nav */}
        <div className="relative px-4 pt-5 flex-1 overflow-y-auto">
          <div className="eyebrow px-2 mb-2">Menu</div>
          <nav className="space-y-0.5">
            {visibleGroups.map((group) => {
              if (group.standalone) {
                const item = group.items[0];
                const active = pathname === item.to;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "rail-item group transition-colors hover:bg-emerald/10 rounded-md",
                      active && "is-active"
                    )}
                  >
                    {/* Icon gets the highlight color */}
                    <Icon
                      className={cn(
                        "h-4 w-4 transition-transform group-hover:-translate-y-px",
                        active && "text-yellow-400"
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              }

              const isOpen = openGroups.has(group.key);
              const GroupIcon = group.icon;
              const hasActiveChild = group.items.some((item) => item.to === pathname);

              return (
                <div key={group.key}>
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className={cn(
                      "rail-item group w-full transition-colors hover:bg-emerald/10 rounded-md",
                      hasActiveChild && !isOpen && "is-active"
                    )}
                  >
                    <GroupIcon
                      className={cn(
                        "h-4 w-4 transition-transform group-hover:-translate-y-px",
                        hasActiveChild && "text-yellow-400"
                      )}
                    />
                    <span className="flex-1 text-left">{group.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground/60 transition-transform",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="ml-4 pl-3 border-l border-border/60 space-y-0.5 mt-0.5 mb-1">
                      {group.items.map((item) => {
                        const active = pathname === item.to;
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.to}
                            to={item.to}
                            className={cn(
                              "rail-item group !pl-2 transition-colors hover:bg-emerald/10 rounded-md",
                              active && "is-active"
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-3.5 w-3.5 transition-transform group-hover:-translate-y-px",
                                active && "text-yellow-400"
                              )}
                            />
                            <span className="flex-1 text-[13px]">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="mt-8 mx-2 rounded-xl p-4 border border-border/70 bg-gradient-to-br from-emerald/10 via-transparent to-amber/5">
            <div className="eyebrow text-[9px]">Council Treasury</div>
            <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Every transaction is timestamped and attributed for full transparency.
            </div>
          </div>
        </div>


        <div className="relative p-4">
          <div className="surface p-3.5">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 rounded-full grid place-items-center text-xs font-semibold text-primary-foreground gradient-emerald">
                {initials}
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald ring-2 ring-sidebar" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{currentUser.fullName}</div>
                <div className="text-[10px] uppercase tracking-widest text-amber mt-0.5">{currentUser.role}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 text-xs py-2 rounded-md border border-destructive/40 hover:bg-destructive/10 hover:border-destructive transition text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden print:hidden fixed top-0 inset-x-0 z-40 bg-sidebar/95 backdrop-blur-md hairline-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={bitsLogo} alt="BSIT" className="h-7 w-7 object-contain" />
          <span className="display text-lg">
            IT <span className="gradient-text">FundSafe</span>
          </span>
        </div>
        <button onClick={handleLogout} className="text-xs text-muted-foreground hover:text-destructive transition">
          Sign out
        </button>
      </div>

      <main className="flex-1 min-w-0 pt-16 md:pt-0 overflow-y-auto">
        <div className="px-5 md:px-10 lg:px-14 py-8 md:py-12 max-w-6xl mx-auto">{children}</div>

        {/* Mobile bottom nav - flattened, horizontally scrollable so it holds up as items grow */}
        <div className="md:hidden print:hidden fixed bottom-0 inset-x-0 bg-sidebar/95 backdrop-blur-md hairline-t z-40 overflow-x-auto">
          <div className="flex" style={{ minWidth: "max-content" }}>
            {flatMobileItems.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 px-4 text-[10px] transition shrink-0",
                    active ? "text-emerald" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label.split(" ")[0]}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="md:hidden h-16" />
      </main>
    </div>
  );
}
