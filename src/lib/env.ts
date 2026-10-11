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

/**
 * The web app's address (its login page), put in front of every credential
 * block an admin copies — credentials with no address are a login the
 * recipient cannot use. Same value as the web's FE_BASE_URL. Optional: when
 * unset the admin is told to send the address separately.
 */
export function feBaseUrl(): string {
  // Static dot access: Expo inlines EXPO_PUBLIC_* only when spelled like this.
  return normalizeBaseUrl(process.env.EXPO_PUBLIC_FE_BASE_URL);
}
