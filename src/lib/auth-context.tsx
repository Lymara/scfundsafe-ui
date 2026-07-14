import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  api,
  clearSession,
  loadStoredUser,
  saveSession,
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
    setCurrentUser(loadStoredUser());
    setHydrated(true);
  }, []);

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
