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

// ── Notification endpoints ────────────────────────────────────────────────────

export const notificationApi = {
  registerToken: (token: string, platform: 'ios' | 'android' | 'unknown') =>
    request<{ status: string }>(
      '/v1/notifications/push-token',
      { method: 'POST', body: JSON.stringify({ token, platform }) },
      true
    ),
};
