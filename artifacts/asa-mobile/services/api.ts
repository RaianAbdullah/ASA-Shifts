/**
 * ASA Workforce — API service layer (Stage 3)
 *
 * Base URL: the api-server artifact proxies /api → Spring Boot :8080.
 * EXPO_PUBLIC_DOMAIN is injected by the dev script as $REPLIT_DEV_DOMAIN.
 */

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : '/api';

// ─── Generic helpers ────────────────────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  timestamp: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const json: ApiResponse<T> = await res.json();

  if (!res.ok || !json.success) {
    const msg =
      json.error?.message ??
      `Request failed with status ${res.status}`;
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

// ─── Auth endpoints ──────────────────────────────────────────────────────────

export interface RegisterRequest {
  nationalId: string;
  firstNameAr: string;
  lastNameAr: string;
  phoneNumber: string;
  password: string;
}

export interface RegisterResponse {
  employeeId: string;
  nationalId: string;   // masked
  status: string;
  message: string;
  maskedPhone: string;
  otpHint?: string;
}

export interface VerifyOtpRequest {
  nationalId: string;
  otpCode: string;
}

export interface VerifyOtpResponse {
  employeeId: string;
  nationalId: string;
  status: string;
  message: string;
  accessGranted: boolean;
}

export const authApi = {
  register: (body: RegisterRequest) =>
    request<RegisterResponse>('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  verifyOtp: (body: VerifyOtpRequest) =>
    request<VerifyOtpResponse>('/v1/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getStatus: (nationalId: string) =>
    request<{ status: string; message: string }>(`/v1/auth/status/${nationalId}`),
};
