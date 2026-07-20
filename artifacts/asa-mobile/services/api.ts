/**
 * ASA Workforce — API service layer
 *
 * Base URL: the api-server artifact proxies /api → Spring Boot :8080.
 * EXPO_PUBLIC_DOMAIN is injected by the dev script as $REPLIT_DEV_DOMAIN.
 */
import { loadSession } from './auth';

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : '/api';

// ── Generic helpers ────────────────────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  timestamp: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  requiresAuth = false
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (requiresAuth) {
    const session = await loadSession();
    if (session?.token) {
      headers['Authorization'] = `Bearer ${session.token}`;
    }
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const json: ApiResponse<T> = await res.json();

  if (!res.ok || !json.success) {
    const msg = json.error?.message ?? `Request failed (${res.status})`;
    throw new ApiError(json.error?.code ?? 'UNKNOWN_ERROR', msg, res.status);
  }

  return json;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 0
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Auth endpoints ────────────────────────────────────────────────────────────

export interface RegisterRequest {
  nationalId:  string;
  firstNameAr: string;
  lastNameAr:  string;
  phoneNumber: string;
  password:    string;
}
export interface RegisterResponse {
  employeeId:  string;
  nationalId:  string;
  status:      string;
  message:     string;
  maskedPhone: string;
  otpHint?:    string;
}
export interface VerifyOtpRequest  { nationalId: string; otpCode: string; }
export interface VerifyOtpResponse { status: string; message: string; }
export interface LoginRequest      { nationalId: string; password: string; }
export interface LoginResponse {
  token:         string;
  tokenType:     string;
  expiresInHours: number;
  employeeId:    string;
  role:          string;
  nameAr:        string;
  status:        string;
}

export const authApi = {
  register: (body: RegisterRequest) =>
    request<RegisterResponse>('/v1/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  verifyOtp: (body: VerifyOtpRequest) =>
    request<VerifyOtpResponse>('/v1/auth/verify-otp', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: LoginRequest) =>
    request<LoginResponse>('/v1/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  /** Revokes the current JWT on the server side — always call before clearSession(). */
  logout: () =>
    request<void>('/v1/auth/logout', { method: 'POST' }, true),

  getStatus: (nationalId: string) =>
    request<{ status: string; message: string }>(`/v1/auth/status/${nationalId}`),
};

// ── Admin endpoints ───────────────────────────────────────────────────────────

export interface PendingEmployee {
  id:            string;
  nationalId:    string;
  firstNameAr:   string;
  lastNameAr:    string;
  maskedPhone:   string;
  status:        string;
  registeredAt:  string;
  otpVerifiedAt: string;
}
export interface PageResponse<T> {
  content:          T[];
  totalElements:    number;
  totalPages:       number;
  number:           number;
  size:             number;
  last:             boolean;
}

export const adminApi = {
  listPending: (page = 0, size = 20) =>
    request<PageResponse<PendingEmployee>>(
      `/v1/admin/registrations/pending?page=${page}&size=${size}`,
      {}, true
    ),

  approve: (employeeId: string) =>
    request<Record<string, string>>(
      `/v1/admin/registrations/${employeeId}/approve`,
      { method: 'PATCH', body: JSON.stringify({}) }, true
    ),

  reject: (employeeId: string, reason: string) =>
    request<Record<string, string>>(
      `/v1/admin/registrations/${employeeId}/reject`,
      { method: 'PATCH', body: JSON.stringify({ reason }) }, true
    ),
};

// ── Attendance endpoints ──────────────────────────────────────────────────────

export interface AttendanceResponse {
  id?:               string;
  attendanceDate:    string;
  status:            'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED' | 'HOLIDAY';
  checkInTime?:      string;
  checkInLatitude?:  number;
  checkInLongitude?: number;
  checkOutTime?:     string;
  checkOutLatitude?: number;
  checkOutLongitude?:number;
  minutesLate:       number;
  geofenceOverride:  boolean;
  shiftStart?:       string;
  shiftEnd?:         string;
  canCheckIn:        boolean;
  canCheckOut:       boolean;
  workedMinutes?:    number;
}

export interface AdminAttendanceSummary {
  date:         string;
  totalActive:  number;
  checkedIn:    number;
  late:         number;
  absent:       number;
  excused:      number;
  records:      AdminAttendanceRow[];
}

export interface AdminAttendanceRow {
  id:               string;
  employeeId:       string;
  firstNameAr:      string;
  lastNameAr:       string;
  departmentNameAr: string;
  departmentNameEn: string;
  status:           string;
  checkInTime?:     string;
  checkOutTime?:    string;
  minutesLate:      number;
  workedMinutes?:   number;
}

export const attendanceApi = {
  checkIn: (latitude: number, longitude: number, bypassGeofence = false) =>
    request<AttendanceResponse>('/v1/attendance/check-in',
      { method: 'POST', body: JSON.stringify({ latitude, longitude, bypassGeofence }) }, true),

  checkOut: (latitude: number, longitude: number) =>
    request<AttendanceResponse>('/v1/attendance/check-out',
      { method: 'POST', body: JSON.stringify({ latitude, longitude }) }, true),

  getToday: () =>
    request<AttendanceResponse>('/v1/attendance/today', {}, true),

  getHistory: (page = 0, size = 30) =>
    request<PageResponse<AttendanceResponse>>(
      `/v1/attendance/history?page=${page}&size=${size}`, {}, true),
};

export const adminAttendanceApi = {
  getTodaySummary: (departmentId?: string) =>
    request<AdminAttendanceSummary>(
      `/v1/admin/attendance/today${departmentId ? `?departmentId=${departmentId}` : ''}`,
      {}, true),
};

// ── Notification endpoints ────────────────────────────────────────────────────

export const notificationApi = {
  /** Register a push token for an already-authenticated user. */
  registerToken: (token: string, platform: 'ios' | 'android' | 'unknown') =>
    request<{ status: string }>(
      '/v1/notifications/push-token',
      { method: 'POST', body: JSON.stringify({ token, platform }) },
      true
    ),

  /**
   * Register a push token for a pending (unauthenticated) user.
   * Called from the waiting screen where no JWT exists yet.
   */
  registerPendingToken: (
    nationalId: string,
    token: string,
    platform: 'ios' | 'android' | 'unknown',
  ) =>
    request<{ status: string }>(
      '/v1/notifications/push-token/pending',
      { method: 'POST', body: JSON.stringify({ nationalId, token, platform }) },
      false
    ),
};
