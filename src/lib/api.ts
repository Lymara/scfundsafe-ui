const API_BASE = import.meta.env.VITE_API_URL || "https://localhost:7050/api";

export type Role = "Treasurer" | "Officer" | "ClassRepresentative" | "Adviser";

export interface AuthResponse {
  userId: string;
  fullName: string;
  email: string;
  role: Role;
  token: string;
  expiresAt: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  role: Role;
}

export interface FundRecordDto {
  recordId: number;
  recordType: "Income" | "Expense";
  recordDate: string;
  amount: number;
  source?: string | null;
  purpose?: string | null;
  notes?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedByName?: string | null;
  updatedAt?: string | null;
}

export interface RecordIncomePayload {
  recordDate: string;
  amount: number;
  source: string;
  purpose?: string;
  notes?: string;
}

export interface RecordExpensePayload {
  recordDate: string;
  amount: number;
  purpose: string;
  notes?: string;
}

export interface UpdateRecordPayload {
  recordDate: string;
  amount: number;
  source?: string;
  purpose?: string;
  notes?: string;
}

export interface BalanceDto {
  totalIncome: number;
  totalExpense: number;
  currentBalance: number;
  asOf: string;
}

export interface SearchRecordsParams {
  keyword?: string;
  dateFrom?: string;
  dateTo?: string;
  recordType?: "Income" | "Expense" | "";
}

export interface ReportParams {
  dateFrom?: string;
  dateTo?: string;
  recordType?: "Income" | "Expense" | "";
}

export interface ReportDto {
  periodFrom?: string | null;
  periodTo?: string | null;
  totalIncome: number;
  totalExpense: number;
  remainingBalance: number;
  recordCount: number;
  records: FundRecordDto[];
}

const TOKEN_KEY = "scfundsafe_token";
const USER_KEY = "scfundsafe_user";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveSession(auth: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, auth.token);
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({
      userId: auth.userId,
      fullName: auth.fullName,
      email: auth.email,
      role: auth.role,
    }),
  );
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function loadStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { userId: string; fullName: string; email: string; role: Role };
  } catch {
    return null;
  }
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    const message =
      (body as { message?: string; title?: string })?.message ||
      (body as { message?: string; title?: string })?.title ||
      `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return body as T;
}

function toQuery(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export const api = {
  // UC-01 Login / account creation
  login: (payload: LoginPayload) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  register: (payload: RegisterPayload) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),

  // UC-08 Logout
  logout: () => request<{ message: string }>("/auth/logout", { method: "POST" }),

  // UC-02 Record Income
  recordIncome: (payload: RecordIncomePayload) =>
    request<{ message: string; data: FundRecordDto }>("/income", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // UC-03 Record Expense
  recordExpense: (payload: RecordExpensePayload) =>
    request<{ message: string; data: FundRecordDto }>("/expense", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // UC-04 View Balance
  getBalance: () => request<BalanceDto>("/balance"),

  // Supporting: list all records
  getAllRecords: () => request<FundRecordDto[]>("/records"),

  // UC-05 Search Records
  searchRecords: (params: SearchRecordsParams) =>
    request<FundRecordDto[] | { message: string; data: FundRecordDto[] }>(
      `/records/search${toQuery(params)}`,
    ),

  // UC-07 Update Entry
  updateRecord: (id: number, payload: UpdateRecordPayload) =>
    request<{ message: string; data: FundRecordDto }>(`/records/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  // UC-06 Generate Reports
  getReport: (params: ReportParams) =>
    request<ReportDto | { message: string; data: ReportDto }>(`/reports${toQuery(params)}`),
};

export { ApiError };
