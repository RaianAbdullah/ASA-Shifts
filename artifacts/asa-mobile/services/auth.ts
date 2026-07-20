/**
 * ASA Workforce — Auth state management
 *
 * Stores tokens in expo-secure-store on native (hardware-encrypted keychain/keystore).
 * Falls back to in-memory only on web (never localStorage — XSS risk).
 *
 * Keys stored:
 *   asa_jwt         — current short-lived access token
 *   asa_refresh     — rotating refresh token (raw value, only ever on client)
 *   asa_role        — employee role
 *   asa_name        — Arabic display name
 *   asa_eid         — employee UUID
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY   = 'asa_jwt';
const REFRESH_KEY = 'asa_refresh';
const ROLE_KEY    = 'asa_role';
const NAME_KEY    = 'asa_name';
const EID_KEY     = 'asa_eid';

// ── In-memory fallback for web ────────────────────────────────────────────────
const memStore: Record<string, string> = {};

async function save(key: string, value: string) {
  if (Platform.OS === 'web') { memStore[key] = value; return; }
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function load(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return memStore[key] ?? null;
  return SecureStore.getItemAsync(key);
}

async function remove(key: string) {
  if (Platform.OS === 'web') { delete memStore[key]; return; }
  await SecureStore.deleteItemAsync(key);
}

// ── Session ──────────────────────────────────────────────────────────────────

export interface Session {
  token:        string;
  refreshToken: string;
  role:         'SYSTEM_ADMIN' | 'MAIN_MANAGER' | 'DEPARTMENT_MANAGER' | 'EMPLOYEE' | 'RESPONSIBLE_OFFICER';
  nameAr:       string;
  employeeId:   string;
}

export async function saveSession(session: Session): Promise<void> {
  await Promise.all([
    save(TOKEN_KEY,   session.token),
    save(REFRESH_KEY, session.refreshToken),
    save(ROLE_KEY,    session.role),
    save(NAME_KEY,    session.nameAr),
    save(EID_KEY,     session.employeeId),
  ]);
}

/** Updates only the access and refresh tokens (called after a silent token refresh). */
export async function updateTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    save(TOKEN_KEY,   accessToken),
    save(REFRESH_KEY, refreshToken),
  ]);
}

export async function loadSession(): Promise<Session | null> {
  const [token, refreshToken, role, nameAr, employeeId] = await Promise.all([
    load(TOKEN_KEY),
    load(REFRESH_KEY),
    load(ROLE_KEY),
    load(NAME_KEY),
    load(EID_KEY),
  ]);
  if (!token || !role) return null;
  return {
    token,
    refreshToken: refreshToken ?? '',
    role: role as Session['role'],
    nameAr: nameAr ?? '',
    employeeId: employeeId ?? '',
  };
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    remove(TOKEN_KEY),
    remove(REFRESH_KEY),
    remove(ROLE_KEY),
    remove(NAME_KEY),
    remove(EID_KEY),
  ]);
}

/** Parse JWT payload without verifying signature (signature is verified server-side). */
export function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  // Consider expired 30s before actual expiry to avoid edge-case races
  return Date.now() / 1000 > payload.exp - 30;
}
