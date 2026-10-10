import * as SecureStore from "expo-secure-store";

import { asRole, type AuthUser } from "@/shared/auth";

// Same key names as the web's localStorage keys, for recognisability.
const TOKEN_KEY = "egx.auth.token";
const USER_KEY = "egx.auth.user";

// SecureStore is async, but the shared API client asks for the token
// synchronously on every request — so the token is mirrored in memory and
// SecureStore is only read once, at boot (loadSession).
let cachedToken: string | null = null;

export function currentToken(): string | null {
  return cachedToken;
}

export interface StoredSession {
  token: string | null;
  user: AuthUser | null;
}

function parseUser(raw: string | null): AuthUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === "string" && typeof parsed.username === "string") {
      // Optimistic only — /auth/me re-reads the role on every boot and the
      // backend enforces it regardless.
      return { id: parsed.id, username: parsed.username, role: asRole(parsed.role) };
    }
  } catch {}
  return null;
}

export async function loadSession(): Promise<StoredSession> {
  try {
    const [token, rawUser] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(USER_KEY),
    ]);
    cachedToken = token;
    return { token, user: parseUser(rawUser) };
  } catch {
    cachedToken = null;
    return { token: null, user: null };
  }
}

export async function saveSession(token: string, user: AuthUser): Promise<void> {
  cachedToken = token;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearSession(): Promise<void> {
  cachedToken = null;
  await Promise.allSettled([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
  ]);
}
