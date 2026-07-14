import { Link, useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Search,
  FileBarChart,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/api";
import dmcLogo from "@/assets/dmc-logo.png";

const nav: { to: string; label: string; icon: typeof LayoutDashboard; roles?: Role[] }[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/income", label: "Record Income", icon: TrendingUp, roles: ["Treasurer"] },
  { to: "/expenses", label: "Record Expense", icon: TrendingDown, roles: ["Treasurer"] },
  { to: "/records", label: "Records", icon: Search },
  { to: "/reports", label: "Reports", icon: FileBarChart },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  useEffect(() => {
    if (!currentUser) navigate("/auth");
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const visibleNav = nav.filter((item) => !item.roles || item.roles.includes(currentUser.role));

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

  return (
    <div className="h-screen flex text-foreground overflow-hidden">
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
              <img src={dmcLogo} alt="DMC College Foundation" className="h-8 w-8 object-contain" loading="eager" />
              <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber ring-2 ring-sidebar grid place-items-center">
                <ShieldCheck className="h-2 w-2 text-[oklch(0.18_0.03_60)]" />
              </span>
            </div>
            <div className="min-w-0">
              <div className="display text-xl leading-none">
                SC <span className="gradient-text">FundSafe</span>
              </div>
              <div className="mono text-[10px] text-muted-foreground/80 mt-1 truncate">DMC College Foundation</div>
            </div>
          </div>
        </div>

        <div className="mx-6 hairline-b" />

        {/* Nav */}
        <div className="relative px-4 pt-5 flex-1 overflow-y-auto">
          <div className="eyebrow px-2 mb-2">Menu</div>
          <nav className="space-y-0.5">
            {visibleNav.map((item, i) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} className={cn("rail-item group", active && "is-active")}>
                  <span className="rail-num">{String(i + 1).padStart(2, "0")}</span>
                  <Icon className={cn("h-4 w-4 transition-transform group-hover:-translate-y-px", active && "text-emerald")} />
                  <span className="flex-1">{item.label}</span>
                </Link>
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
          <img src={dmcLogo} alt="DMC" className="h-7 w-7 object-contain" />
          <span className="display text-lg">
            SC <span className="gradient-text">FundSafe</span>
          </span>
        </div>
        <button onClick={handleLogout} className="text-xs text-muted-foreground hover:text-destructive transition">
          Sign out
        </button>
      </div>

      <main className="flex-1 min-w-0 pt-16 md:pt-0 overflow-y-auto">
        <div className="px-5 md:px-10 lg:px-14 py-8 md:py-12 max-w-6xl mx-auto">{children}</div>

        {/* Mobile bottom nav */}
        <div className="md:hidden print:hidden fixed bottom-0 inset-x-0 bg-sidebar/95 backdrop-blur-md hairline-t grid grid-cols-4 z-40">
          {visibleNav.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] transition",
                  active ? "text-emerald" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label.split(" ")[0]}
              </Link>
            );
          })}
        </div>
        <div className="md:hidden h-16" />
      </main>
    </div>
  );
}
