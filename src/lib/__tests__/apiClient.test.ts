import { saveSession } from "@/auth/tokenStore";
import { setupApi } from "@/lib/apiSetup";
import { fetchTickers, LoginError, loginRequest } from "@/shared/api";
import { fetchCalls, mockFetch } from "@/test-utils/fetch";

describe("shared API client on mobile", () => {
  it("calls the configured base URL with the stored bearer token", async () => {
    const onUnauthorized = jest.fn();
    setupApi(onUnauthorized);
    await saveSession("tok-9", { id: "u1", email: "alice@example.com", name: "Alice", role: "user" });
    mockFetch("GET", "/tickers", [{ symbol: "COMI" }]);

    await expect(fetchTickers()).resolves.toEqual([{ symbol: "COMI" }]);
    expect(fetchCalls()[0].url).toBe("https://api.test/api/tickers?market=EG");
    expect(fetchCalls()[0].headers.authorization).toBe("Bearer tok-9");
  });

  it("runs the 401 handler when a data call is rejected", async () => {
    const onUnauthorized = jest.fn();
    setupApi(onUnauthorized);
    mockFetch("GET", "/tickers", { detail: "expired" }, 401);

    await expect(fetchTickers()).rejects.toThrow("expired");
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("reports a wrong password as a LoginError without signing anyone out", async () => {
    const onUnauthorized = jest.fn();
    setupApi(onUnauthorized);
    mockFetch("POST", "/auth/login", { detail: "Invalid email or password" }, 401);

    const attempt = loginRequest("alice@example.com", "nope");
    await expect(attempt).rejects.toBeInstanceOf(LoginError);
    await expect(attempt).rejects.toThrow("Invalid email or password");
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("maps a successful login to a token and a typed user", async () => {
    setupApi(jest.fn());
    mockFetch("POST", "/auth/login", {
      access_token: "tok-new",
      user: { id: "u7", email: "admin1@example.com", name: "Admin", role: "admin" },
    });
    await expect(loginRequest("admin1@example.com", "pw")).resolves.toEqual({
      token: "tok-new",
      user: { id: "u7", email: "admin1@example.com", name: "Admin", role: "admin" },
    });
    expect(fetchCalls()[0].body).toEqual({ email: "admin1@example.com", password: "pw" });
  });
});
