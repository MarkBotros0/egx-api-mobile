import { act, render, screen, waitFor } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { Text } from "react-native";

import { AuthProvider, BOOT_AUTH_TIMEOUT_MS, useAuth } from "@/auth/AuthProvider";
import { unregisterOnLogout } from "@/features/alerts/registration";
import { fetchTickers } from "@/shared/api";
import { mockFetch, mockFetchHandler, mockFetchNetworkError } from "@/test-utils/fetch";

jest.mock("@/features/alerts/registration", () => ({
  unregisterOnLogout: jest.fn().mockResolvedValue(undefined),
}));

let auth: ReturnType<typeof useAuth>;

function Probe() {
  const current = useAuth();
  // Publish to the test from an effect, not during render (react-hooks/globals).
  useEffect(() => {
    auth = current;
  });
  const view = current;
  return (
    <Text testID="state">
      {view.isLoading ? "loading" : view.isAuthenticated ? `in:${view.user?.username}:${view.user?.role}` : "out"}
    </Text>
  );
}

const renderAuth = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

async function storeSession(user = { id: "u1", username: "alice", role: "user" }) {
  await SecureStore.setItemAsync("egx.auth.token", "tok-1");
  await SecureStore.setItemAsync("egx.auth.user", JSON.stringify(user));
}

describe("AuthProvider", () => {
  beforeEach(() => (unregisterOnLogout as jest.Mock).mockClear());

  it("is signed out with no stored token and makes no request", async () => {
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("out"));
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("restores a stored session and takes the role fresh from /auth/me", async () => {
    await storeSession();
    mockFetch("GET", "/auth/me", { id: "u1", username: "alice", role: "admin" });
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("in:alice:admin"));
    expect(auth.isAdmin).toBe(true);
    expect(JSON.parse((await SecureStore.getItemAsync("egx.auth.user"))!).role).toBe("admin");
  });

  it("signs out and wipes the store when /auth/me rejects the token", async () => {
    await storeSession();
    mockFetch("GET", "/auth/me", { detail: "expired" }, 401);
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("out"));
    expect(await SecureStore.getItemAsync("egx.auth.token")).toBeNull();
  });

  it("keeps the cached session when the backend is unreachable at boot", async () => {
    await storeSession();
    mockFetchNetworkError("GET", "/auth/me");
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("in:alice:user"));
  });

  it("signs in, persists the session, and authenticates later calls", async () => {
    mockFetch("POST", "/auth/login", { access_token: "tok-new", user: { id: "u2", username: "bob", role: "user" } });
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("out"));

    await act(() => auth.login("bob", "pw"));
    expect(screen.getByTestId("state")).toHaveTextContent("in:bob:user");
    expect(await SecureStore.getItemAsync("egx.auth.token")).toBe("tok-new");

    mockFetch("GET", "/tickers", []);
    await fetchTickers();
    const last = (globalThis.fetch as jest.Mock).mock.calls.at(-1)!;
    expect(new Headers(last[1].headers).get("Authorization")).toBe("Bearer tok-new");
  });

  it("surfaces the backend's message on a failed sign-in", async () => {
    mockFetch("POST", "/auth/login", { detail: "Account disabled" }, 403);
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("out"));

    await act(async () => {
      await expect(auth.login("bob", "pw")).rejects.toThrow("Account disabled");
    });
    expect(auth.error).toBe("Account disabled");
    expect(screen.getByTestId("state")).toHaveTextContent("out");
  });

  it("explains an unreachable server on sign-in", async () => {
    mockFetchNetworkError("POST", "/auth/login");
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("out"));
    await act(async () => {
      await expect(auth.login("bob", "pw")).rejects.toThrow();
    });
    expect(auth.error).toMatch(/reach the server/);
  });

  it("signs out when any API call is later rejected with 401", async () => {
    await storeSession();
    mockFetch("GET", "/auth/me", { id: "u1", username: "alice", role: "user" });
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("in:alice:user"));

    mockFetch("GET", "/tickers", { detail: "expired" }, 401);
    await act(async () => {
      await expect(fetchTickers()).rejects.toThrow();
    });
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("out"));
    expect(await SecureStore.getItemAsync("egx.auth.token")).toBeNull();
  });

  it("logout clears the session", async () => {
    await storeSession();
    mockFetch("GET", "/auth/me", { id: "u1", username: "alice", role: "user" });
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("in:alice:user"));
    await act(() => auth.logout());
    expect(screen.getByTestId("state")).toHaveTextContent("out");
    expect(await SecureStore.getItemAsync("egx.auth.user")).toBeNull();
  });

  it("unregisters this device from push alerts on logout", async () => {
    await storeSession();
    mockFetch("GET", "/auth/me", { id: "u1", username: "alice", role: "user" });
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("in:alice:user"));
    await act(() => auth.logout());
    expect(unregisterOnLogout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("state")).toHaveTextContent("out");
  });

  describe("boot timeout", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("keeps the cached session and stops loading when /auth/me never answers", async () => {
      await storeSession();
      mockFetchHandler("GET", "/auth/me", () => new Promise(() => {}));
      await renderAuth();
      expect(screen.getByTestId("state")).toHaveTextContent("loading");
      await act(async () => {
        await jest.advanceTimersByTimeAsync(BOOT_AUTH_TIMEOUT_MS);
      });
      expect(screen.getByTestId("state")).toHaveTextContent("in:alice:user");
    });

    it("signs out after 3s even if unregistering never settles", async () => {
      (unregisterOnLogout as jest.Mock).mockReturnValueOnce(new Promise(() => {}));
      await storeSession();
      mockFetch("GET", "/auth/me", { id: "u1", username: "alice", role: "user" });
      await renderAuth();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByTestId("state")).toHaveTextContent("in:alice:user");
      await act(async () => {
        const done = auth.logout();
        await jest.advanceTimersByTimeAsync(3000);
        await done;
      });
      expect(screen.getByTestId("state")).toHaveTextContent("out");
      expect(await SecureStore.getItemAsync("egx.auth.token")).toBeNull();
    });

    it("ignores a late /auth/me reply after the user logged out", async () => {
      await storeSession();
      let release!: () => void;
      const gate = new Promise<void>((r) => (release = r));
      mockFetchHandler("GET", "/auth/me", async () => {
        await gate;
        return { status: 200, body: { id: "u1", username: "alice", role: "admin" } };
      });
      await renderAuth();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(BOOT_AUTH_TIMEOUT_MS);
      });
      expect(screen.getByTestId("state")).toHaveTextContent("in:alice:user");
      await act(() => auth.logout());
      await act(async () => {
        release();
        await jest.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByTestId("state")).toHaveTextContent("out");
      expect(await SecureStore.getItemAsync("egx.auth.token")).toBeNull();
    });
  });
});
