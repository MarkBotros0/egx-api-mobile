/**
 * The backend's /api base, from EXPO_PUBLIC_API_BASE_URL (the same value as the
 * web's NEXT_PUBLIC_API_BASE_URL). Expo inlines EXPO_PUBLIC_* at bundle time,
 * so this must stay a static `process.env.EXPO_PUBLIC_…` read.
 */
export function apiBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!url) {
    throw new Error(
      "EXPO_PUBLIC_API_BASE_URL is not set. Copy .env.example to .env, set it to the " +
        "backend's /api base URL, then restart Metro."
    );
  }
  return url.replace(/\/+$/, "");
}

/** Trim whitespace and trailing slashes; "" when unset. */
export function normalizeBaseUrl(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/\/+$/, "");
}
