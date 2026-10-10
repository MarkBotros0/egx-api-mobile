import { render, screen, waitFor, type RenderResult } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { View } from "react-native";
import type { ReactElement, ReactNode } from "react";

import { AuthProvider, useAuth } from "@/auth/AuthProvider";
import { AppProviders } from "@/providers/AppProviders";
import type { AuthUser } from "@/shared/auth";

import { prependMockFetch } from "./fetch";
import { TestSafeArea } from "./safeArea";

const DEFAULT_USER: AuthUser = { id: "u1", username: "tester", role: "user" };
const DEFAULT_WEIGHTS = { trend: 18, momentum: 15, volume: 12, volatility: 10, divergence: 8, quality: 12, risk_adjusted: 13, relative_strength: 12 };

// Mirrors the app's BootGate: nothing mounts until the session restore settles.
function AuthGate({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth();
  if (isLoading) return null;
  return (
    <>
      <View testID="auth-gate-open" />
      {children}
    </>
  );
}

function Providers({ children }: { children: ReactNode }) {
  return (
    <TestSafeArea>
      <AuthProvider>
        <AuthGate>
          <AppProviders>{children}</AppProviders>
        </AuthGate>
      </AuthProvider>
    </TestSafeArea>
  );
}

/**
 * Render a screen the way the app mounts it: real AuthProvider + AppProviders
 * over the fetch mock. Background endpoints get valid empty defaults, put at
 * the FRONT of the mock list so any mockFetch a test registers — before or
 * after this call — takes precedence.
 */
export async function renderWithProviders(ui: ReactElement, opts: { user?: AuthUser | null } = {}): Promise<RenderResult> {
  const user = opts.user === undefined ? DEFAULT_USER : opts.user;

  prependMockFetch("GET", "/tickers", []);
  prependMockFetch("GET", "/watchlist", { symbols: [] });
  prependMockFetch("GET", "/settings", { weights: DEFAULT_WEIGHTS, raw: DEFAULT_WEIGHTS, presets: {} });
  if (user) {
    prependMockFetch("GET", "/auth/me", user);
    await SecureStore.setItemAsync("egx.auth.token", "test-token");
    await SecureStore.setItemAsync("egx.auth.user", JSON.stringify(user));
  }

  // `wrapper` (not inline JSX) so `rerender(ui)` keeps the providers mounted.
  const result = await render(ui, { wrapper: Providers });
  // Resolve only once the auth gate has opened (signed in or out).
  await waitFor(() => expect(screen.getByTestId("auth-gate-open")).toBeTruthy());
  return result;
}
