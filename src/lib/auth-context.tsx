import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  api,
  clearSession,
  expireSession,
  getToken,
  hasValidSession,
  loadStoredUser,
  saveSession,
  tokenExpiresIn,
  SESSION_EXPIRED_EVENT,
  type Role,
} from "@/lib/api";

export interface CurrentUser {
  userId: string;
  fullName: string;
  email: string;
  role: Role;
}

interface AuthContextValue {
  currentUser: CurrentUser | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (payload: {
    fullName: string;
    email: string;
    password: string;
    role: Role;
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Only restore the user if the saved token is still there and not expired;
    // otherwise start logged out so the login page is shown.
    if (hasValidSession()) {
      setCurrentUser(loadStoredUser());
    } else {
      clearSession();
      setCurrentUser(null);
    }
    setHydrated(true);
  }, []);

  // Session expired / rejected (401) anywhere in the app → log out and show a message.
  useEffect(() => {
    const onExpired = () => {
      setCurrentUser((prev) => {
        if (prev) toast.error("Your session has expired. Please sign in again.", { id: "session-expired" });
        return null;
      });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  // While logged in, re-check the session when the tab regains focus, when
  // localStorage changes in another tab, and right when the token expires.
  useEffect(() => {
    if (!currentUser) return;
    const check = () => {
      if (!hasValidSession()) expireSession();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    window.addEventListener("focus", check);
    window.addEventListener("storage", check);
    document.addEventListener("visibilitychange", onVisible);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const token = getToken();
    const ms = token ? tokenExpiresIn(token) : null;
    // setTimeout can't take more than ~24.8 days; longer tokens are covered by the focus check.
    if (ms !== null && ms < 2_147_483_647) timer = setTimeout(check, Math.max(ms, 0) + 1000);

    return () => {
      window.removeEventListener("focus", check);
      window.removeEventListener("storage", check);
      document.removeEventListener("visibilitychange", onVisible);
      if (timer) clearTimeout(timer);
    };
  }, [currentUser]);

  const login: AuthContextValue["login"] = async (email, password) => {
    try {
      const auth = await api.login({ email, password });
      saveSession(auth);
      setCurrentUser({ userId: auth.userId, fullName: auth.fullName, email: auth.email, role: auth.role });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Login failed" };
    }
  };

  const register: AuthContextValue["register"] = async (payload) => {
    try {
      const auth = await api.register(payload);
      saveSession(auth);
      setCurrentUser({ userId: auth.userId, fullName: auth.fullName, email: auth.email, role: auth.role });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Registration failed" };
    }
  };

  const logout: AuthContextValue["logout"] = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors on logout - clear the local session regardless.
    }
    clearSession();
    setCurrentUser(null);
  };

  return (
    <Ctx.Provider value={{ currentUser, hydrated, login, register, logout }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function formatPHP(n: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);
}
