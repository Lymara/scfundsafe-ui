import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth-context";
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<IndexRedirect />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/income" element={<IncomePage />} />
          <Route path="/expenses" element={<ExpensePage />} />
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
