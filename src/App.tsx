import { useEffect, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import type { Role } from "@/lib/api";
import { Toaster } from "@/components/ui/sonner";
import AuthPage from "@/pages/Auth";
import DashboardPage from "@/pages/Dashboard";
import IncomePage from "@/pages/Income";
import ExpensePage from "@/pages/Expenses";
import RecordsPage from "@/pages/Records";
import ReportsPage from "@/pages/Reports";
import SettingsPage from "@/pages/Settings";
import StudentsPage from "@/pages/Students";
import PaymentsPage from "@/pages/Payments";
import CalculatorPage from "@/pages/Calculator";

function IndexRedirect() {
  const { currentUser, hydrated } = useAuth();
  if (!hydrated) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-muted-foreground text-sm">Loading IT FundSafe…</div>
      </div>
    );
  }
  return <Navigate to={currentUser ? "/dashboard" : "/auth"} replace />;
}

/**
 * Route-level role guard. Renders `children` only when the signed-in user has
 * one of `allowedRoles`; otherwise redirects (unauthenticated -> /auth,
 * unauthorized -> /dashboard with an error toast) before the page mounts.
 */
function RoleRoute({ allowedRoles, children }: { allowedRoles: Role[]; children: ReactNode }) {
  const { currentUser, hydrated } = useAuth();
  const allowed = !!currentUser && allowedRoles.includes(currentUser.role);

  useEffect(() => {
    if (hydrated && currentUser && !allowed) {
      // Fixed id so React StrictMode's double-invoked effects show a single toast.
      toast.error("You don't have permission to access that page.", { id: "route-forbidden" });
    }
  }, [hydrated, currentUser, allowed]);

  if (!hydrated) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-muted-foreground text-sm">Loading IT FundSafe…</div>
      </div>
    );
  }
  if (!currentUser) return <Navigate to="/auth" replace />;
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<IndexRedirect />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route
            path="/income"
            element={
              <RoleRoute allowedRoles={["Treasurer"]}>
                <IncomePage />
              </RoleRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <RoleRoute allowedRoles={["Treasurer"]}>
                <ExpensePage />
              </RoleRoute>
            }
          />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  );
}
