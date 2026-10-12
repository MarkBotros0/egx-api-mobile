import { act, render, screen, waitFor } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { Text } from "react-native";

import { AuthProvider, BOOT_AUTH_TIMEOUT_MS, useAuth } from "@/auth/AuthProvider";
import { unregisterOnLogout } from "@/features/alerts/registration";
import { fetchTickers, LoginError } from "@/shared/api";
import { fetchCalls, mockFetch, mockFetchHandler, mockFetchNetworkError } from "@/test-utils/fetch";

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
      {view.isLoading ? "loading" : view.isAuthenticated ? `in:${view.user?.email}:${view.user?.role}` : "out"}
    </Text>
  );
}

const renderAuth = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );

async function storeSession(user = { id: "u1", email: "alice@example.com", name: "Alice", role: "user" }) {
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
    mockFetch("GET", "/auth/me", { id: "u1", email: "alice@example.com", name: "Alice", role: "admin" });
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("in:alice@example.com:admin"));
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
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("in:alice@example.com:user"));
  });

  it("signs in, persists the session, and authenticates later calls", async () => {
    mockFetch("POST", "/auth/login", { access_token: "tok-new", user: { id: "u2", email: "bob@example.com", name: "Bob", role: "user" } });
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("out"));

    await act(() => auth.login("bob@example.com", "pw"));
    expect(screen.getByTestId("state")).toHaveTextContent("in:bob@example.com:user");
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
      await expect(auth.login("bob@example.com", "pw")).rejects.toThrow("Account disabled");
    });
    expect(auth.error).toBe("Account disabled");
    expect(screen.getByTestId("state")).toHaveTextContent("out");
  });

  it("explains an unreachable server on sign-in", async () => {
    mockFetchNetworkError("POST", "/auth/login");
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("out"));
    await act(async () => {
      await expect(auth.login("bob@example.com", "pw")).rejects.toThrow();
    });
    expect(auth.error).toMatch(/reach the server/);
  });

  it("signs out when any API call is later rejected with 401", async () => {
    await storeSession();
    mockFetch("GET", "/auth/me", { id: "u1", email: "alice@example.com", name: "Alice", role: "user" });
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("in:alice@example.com:user"));

    mockFetch("GET", "/tickers", { detail: "expired" }, 401);
    await act(async () => {
      await expect(fetchTickers()).rejects.toThrow();
    });
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("out"));
    expect(await SecureStore.getItemAsync("egx.auth.token")).toBeNull();
  });

  it("logout clears the session", async () => {
    await storeSession();
    mockFetch("GET", "/auth/me", { id: "u1", email: "alice@example.com", name: "Alice", role: "user" });
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("in:alice@example.com:user"));
    await act(() => auth.logout());
    expect(screen.getByTestId("state")).toHaveTextContent("out");
    expect(await SecureStore.getItemAsync("egx.auth.user")).toBeNull();
  });

  it("unregisters this device from push alerts on logout", async () => {
    await storeSession();
    mockFetch("GET", "/auth/me", { id: "u1", email: "alice@example.com", name: "Alice", role: "user" });
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("in:alice@example.com:user"));
    await act(() => auth.logout());
    expect(unregisterOnLogout).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("state")).toHaveTextContent("out");
  });

  it("login posts email and password to /auth/login and stores the session", async () => {
    mockFetch("POST", "/auth/login", { access_token: "tok-e", user: { id: "u3", email: "eve@example.com", name: "Eve", role: "user" } });
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("out"));
    await act(() => auth.login("eve@example.com", "pw"));
    expect(fetchCalls().find((c) => c.url.endsWith("/auth/login"))?.body).toEqual({ email: "eve@example.com", password: "pw" });
    expect(await SecureStore.getItemAsync("egx.auth.token")).toBe("tok-e");
    expect(screen.getByTestId("state")).toHaveTextContent("in:eve@example.com:user");
  });

  it("rejects an unverified email with a LoginError carrying its code", async () => {
    mockFetch("POST", "/auth/login", { detail: "email_not_verified" }, 403);
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("out"));
    await act(async () => {
      const attempt = auth.login("eve@example.com", "pw");
      await expect(attempt).rejects.toBeInstanceOf(LoginError);
      await expect(attempt).rejects.toMatchObject({ code: "email_not_verified" });
    });
    expect(screen.getByTestId("state")).toHaveTextContent("out");
  });

  it("completeSignIn stores a session obtained elsewhere (sign-up, links, social)", async () => {
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("out"));
    await act(() =>
      auth.completeSignIn({ token: "tok-c", user: { id: "u4", email: "cy@example.com", name: "Cy", role: "user" } })
    );
    expect(screen.getByTestId("state")).toHaveTextContent("in:cy@example.com:user");
    expect(await SecureStore.getItemAsync("egx.auth.token")).toBe("tok-c");
  });

  it("deleteAccount sends DELETE /auth/me, signs out and skips the push unregister", async () => {
    await storeSession();
    mockFetch("GET", "/auth/me", { id: "u1", email: "alice@example.com", name: "Alice", role: "user" });
    await renderAuth();
    await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("in:alice@example.com:user"));
    mockFetch("DELETE", "/auth/me", { deleted: true });
    await act(() => auth.deleteAccount());
    expect(fetchCalls().some((c) => c.method === "DELETE" && c.url.endsWith("/auth/me"))).toBe(true);
    expect(screen.getByTestId("state")).toHaveTextContent("out");
    expect(await SecureStore.getItemAsync("egx.auth.token")).toBeNull();
    expect(unregisterOnLogout).not.toHaveBeenCalled();
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
      expect(screen.getByTestId("state")).toHaveTextContent("in:alice@example.com:user");
    });

    it("signs out after 3s even if unregistering never settles", async () => {
      (unregisterOnLogout as jest.Mock).mockReturnValueOnce(new Promise(() => {}));
      await storeSession();
      mockFetch("GET", "/auth/me", { id: "u1", email: "alice@example.com", name: "Alice", role: "user" });
      await renderAuth();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });
      expect(screen.getByTestId("state")).toHaveTextContent("in:alice@example.com:user");
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
        return { status: 200, body: { id: "u1", email: "alice@example.com", name: "Alice", role: "admin" } };
      });
      await renderAuth();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(BOOT_AUTH_TIMEOUT_MS);
      });
      expect(screen.getByTestId("state")).toHaveTextContent("in:alice@example.com:user");
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
