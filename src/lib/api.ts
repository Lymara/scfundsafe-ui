
const API_BASE = import.meta.env.VITE_API_URL || "https://localhost:7050/api";

export type Role = "Admin" | "Treasurer" | "Officer" | "ClassRepresentative" | "Adviser";

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
  paymentMethod?: string | null;
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
  paymentMethod?: string;
}

export interface RecordExpensePayload {
  recordDate: string;
  amount: number;
  purpose: string;
  notes?: string;
  paymentMethod?: string;
}

export interface UpdateRecordPayload {
  recordDate: string;
  amount: number;
  source?: string;
  purpose?: string;
  notes?: string;
  paymentMethod?: string;
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

// ---- Admin: account management + activity log ----

export interface UserListItemDto {
  userId: string;
  fullName: string;
  email: string;
  role: Role;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  password: string;
  role: Role;
}

export interface ActivityLogDto {
  logId: number;
  userName: string;
  action: string;
  detail?: string | null;
  createdAt: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// ---- Students & Fees (BSIT department roster + fee collection) ----

export type YearLevel = 1 | 2 | 3 | 4;
export type DuesStatus = "Unpaid" | "Partial" | "Paid";
export type PaymentMethod = "Cash" | "GCash" | "PayMaya" | "Bank Transfer";

export const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "GCash", "PayMaya", "Bank Transfer"];

/// Fee categories are now an editable, backend-persisted list (see api.getFeeCategories()),
/// not a fixed set - this constant is gone.

export interface StudentDto {
  studentId: number;
  studentNumber: string;
  fullName: string;
  yearLevel: YearLevel;
  section?: string | null;
  email?: string | null;
  isActive: boolean;
  totalDue: number;
  totalPaid: number;
  balance: number;
  feeCount: number;
  paidFeeCount: number;
  status: DuesStatus;
  lastPaymentMethod?: PaymentMethod | null;
  lastPaymentDate?: string | null;
}

export interface CreateStudentPayload {
  studentNumber: string;
  fullName: string;
  yearLevel: YearLevel;
  section?: string;
  email?: string;
}

export interface UpdateStudentPayload {
  fullName: string;
  yearLevel: YearLevel;
  section?: string;
  email?: string;
  isActive: boolean;
}

export interface StudentQueryParams {
  yearLevel?: YearLevel | "";
  status?: DuesStatus | "";
  keyword?: string;
}

export interface RecordFeePaymentPayload {
  feeId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  reference?: string;
}

export interface RecordRefundPayload {
  feeId: number;
  amount: number;
  refundDate: string;
  paymentMethod: PaymentMethod;
  reference?: string;
}

export interface StudentFeePaymentDto {
  paymentId: number;
  studentNumber: string;
  studentFullName: string;
  yearLevel: YearLevel;
  feeId: number;
  feeName: string;
  feeCategory: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  isRefund: boolean;
  reference?: string | null;
  notes?: string | null;
  recordedByName?: string | null;
  createdAt: string;
}

export interface PaymentsQueryParams {
  feeId?: number | "";
  yearLevel?: YearLevel | "";
  studentId?: number;
  paymentMethod?: PaymentMethod | "";
  keyword?: string;
}

export interface ImportSkippedRowDto {
  rowNumber: number;
  rawLine: string;
  reason: string;
}

export interface ImportStudentsResultDto {
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  imported: StudentDto[];
  skipped: ImportSkippedRowDto[];
}

// ---- Fees / income sources ----

export interface FeeDto {
  feeId: number;
  name: string;
  category: string;
  amount: number;
  dueDate: string;
  yearLevels: YearLevel[];
  isActive: boolean;
  createdByName?: string | null;
  createdAt: string;
  totalStudents: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  amountCollected: number;
  amountExpected: number;
}

export interface CreateFeePayload {
  name: string;
  category: string;
  amount: number;
  dueDate: string;
  yearLevels: YearLevel[];
}

export interface StudentFeeStatusDto {
  studentId: number;
  studentNumber: string;
  fullName: string;
  yearLevel: YearLevel;
  feeId: number;
  feeName: string;
  feeCategory: string;
  feeDueDate: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: DuesStatus;
  lastPaymentMethod?: PaymentMethod | null;
  paidAt?: string | null;
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

  // Settings: any signed-in user changes their own password
  changePassword: (payload: ChangePasswordPayload) =>
    request<{ message: string }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Admin: account management
  getUsers: () => request<UserListItemDto[]>("/admin/users"),

  createUser: (payload: CreateUserPayload) =>
    request<{ message: string; data: UserListItemDto }>("/admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteUser: (id: string) =>
    request<{ message: string }>(`/admin/users/${id}`, { method: "DELETE" }),

  resetUserPassword: (id: string, newPassword: string) =>
    request<{ message: string }>(`/admin/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    }),

  // Admin: activity / audit trail
  getActivityLogs: () => request<ActivityLogDto[]>("/admin/activity"),

  // Students roster
  getStudents: (params: StudentQueryParams) =>
    request<StudentDto[]>(`/students${toQuery(params as Record<string, string | undefined>)}`),

  createStudent: (payload: CreateStudentPayload) =>
    request<{ message: string; data: StudentDto }>("/students", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateStudent: (id: number, payload: UpdateStudentPayload) =>
    request<{ message: string; data: StudentDto }>(`/students/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteStudent: (id: number) =>
    request<{ message: string }>(`/students/${id}`, {
      method: "DELETE",
    }),

  importStudents: async (file: File): Promise<{ message: string; data: ImportStudentsResultDto }> => {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/students/import`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new ApiError(body?.message ?? `Import failed (${res.status})`, res.status);
    }
    return body;
  },

  downloadImportTemplateUrl: () => `${API_BASE}/students/import-template`,

  // Fee payments
  recordFeePayment: (studentId: number, payload: RecordFeePaymentPayload) =>
    request<{ message: string; data: StudentDto }>(`/students/${studentId}/payments`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  recordRefund: (studentId: number, payload: RecordRefundPayload) =>
    request<{ message: string; data: StudentDto }>(`/students/${studentId}/refunds`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getPayments: (params: PaymentsQueryParams) =>
    request<StudentFeePaymentDto[]>(
      `/students/payments${toQuery(params as unknown as Record<string, string | undefined>)}`,
    ),

  getStudentFees: (studentId: number) =>
    request<StudentFeeStatusDto[]>(`/students/${studentId}/fees`),

  // Fees / income sources
  getFees: (activeOnly?: boolean) =>
    request<FeeDto[]>(`/fees${toQuery({ activeOnly: activeOnly ? "true" : undefined })}`),

  createFee: (payload: CreateFeePayload) =>
    request<{ message: string; data: FeeDto }>("/fees", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateFee: (feeId: number, payload: CreateFeePayload) =>
    request<{ message: string; data: FeeDto }>(`/fees/${feeId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteFee: (feeId: number) =>
    request<{ message: string }>(`/fees/${feeId}`, {
      method: "DELETE",
    }),

  getStudentsForFee: (feeId: number) =>
    request<StudentFeeStatusDto[]>(`/fees/${feeId}/students`),

  // Fee categories (editable list for the dropdown)
  getFeeCategories: () => request<string[]>("/fees/categories"),

  addFeeCategory: (name: string) =>
    request<{ message: string }>("/fees/categories", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  deleteFeeCategory: (name: string) =>
    request<{ message: string }>(`/fees/categories/${encodeURIComponent(name)}`, {
      method: "DELETE",
    }),
};

export { ApiError };