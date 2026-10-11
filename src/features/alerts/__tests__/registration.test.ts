import * as SecureStore from "expo-secure-store";

import { fetchCalls, mockFetch, mockFetchNetworkError } from "@/test-utils/fetch";
import { configureApi } from "@/shared/apiConfig";
import * as push from "../push";
import { deviceRegistered, enableAlertsOnDevice, PUSH_TOKEN_KEY, syncRegistration, unregisterOnLogout } from "../registration";

jest.mock("../push", () => ({
  isExpoGo: jest.fn(() => false),
  configureNotifications: jest.fn(),
  requestPermission: jest.fn(),
  permissionStatus: jest.fn(),
  getPushToken: jest.fn(),
  devicePlatform: jest.fn(() => "android"),
}));
const P = push as jest.Mocked<typeof push>;

beforeEach(() => {
  configureApi({ baseUrl: "https://api.test/api", getToken: () => "jwt", onUnauthorized: () => {} });
  jest.clearAllMocks();
  P.isExpoGo.mockReturnValue(false);
});

describe("enableAlertsOnDevice", () => {
  it("refuses in Expo Go without touching permissions", async () => {
    P.isExpoGo.mockReturnValue(true);
    await expect(enableAlertsOnDevice()).resolves.toEqual({ ok: false, reason: "expo-go" });
    expect(P.requestPermission).not.toHaveBeenCalled();
  });

  it("reports denied permission", async () => {
    P.requestPermission.mockResolvedValue("denied");
    await expect(enableAlertsOnDevice()).resolves.toEqual({ ok: false, reason: "denied" });
  });

  it("reports unavailable when there is no token (simulator / no project id)", async () => {
    P.requestPermission.mockResolvedValue("granted");
    P.getPushToken.mockResolvedValue(null);
    await expect(enableAlertsOnDevice()).resolves.toEqual({ ok: false, reason: "unavailable" });
  });

  it("registers the token and remembers it", async () => {
    P.requestPermission.mockResolvedValue("granted");
    P.getPushToken.mockResolvedValue("ExponentPushToken[abc]");
    mockFetch("POST", "/push/devices", { token: "ExponentPushToken[abc]" }, 201);
    await expect(enableAlertsOnDevice()).resolves.toEqual({ ok: true });
    const [call] = fetchCalls().filter((c) => c.url.endsWith("/push/devices"));
    expect(call.body).toEqual({ token: "ExponentPushToken[abc]", platform: "android" });
    await expect(SecureStore.getItemAsync(PUSH_TOKEN_KEY)).resolves.toBe("ExponentPushToken[abc]");
  });

  it("reports network when registration fails", async () => {
    P.requestPermission.mockResolvedValue("granted");
    P.getPushToken.mockResolvedValue("ExponentPushToken[abc]");
    mockFetchNetworkError("POST", "/push/devices");
    await expect(enableAlertsOnDevice()).resolves.toEqual({ ok: false, reason: "network" });
  });
});

describe("syncRegistration", () => {
  it("re-registers when alerts are on and permission is granted", async () => {
    mockFetch("GET", "/alerts/preferences", { enabled: true, scope: "all", rise_threshold: 10, fall_threshold: 10 });
    mockFetch("POST", "/push/devices", {}, 201);
    P.permissionStatus.mockResolvedValue("granted");
    P.getPushToken.mockResolvedValue("ExponentPushToken[abc]");
    await syncRegistration();
    expect(fetchCalls().some((c) => c.method === "POST" && c.url.endsWith("/push/devices"))).toBe(true);
  });

  it("does nothing when alerts are off and this phone has no stored token", async () => {
    mockFetch("GET", "/alerts/preferences", { enabled: false, scope: "watchlist", rise_threshold: 10, fall_threshold: 10 });
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
    await syncRegistration();
    expect(P.getPushToken).not.toHaveBeenCalled();
    expect(fetchCalls().some((c) => c.method === "POST")).toBe(false);
  });

  it("re-binds a stored token to the current user even when their alerts are off", async () => {
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, "ExponentPushToken[abc]");
    mockFetch("GET", "/alerts/preferences", { enabled: false, scope: "watchlist", rise_threshold: 10, fall_threshold: 10 });
    mockFetch("POST", "/push/devices", {}, 201);
    P.permissionStatus.mockResolvedValue("granted");
    P.getPushToken.mockResolvedValue("ExponentPushToken[abc]");
    await syncRegistration();
    const [call] = fetchCalls().filter((c) => c.method === "POST" && c.url.endsWith("/push/devices"));
    expect(call.body).toEqual({ token: "ExponentPushToken[abc]", platform: "android" });
  });

  it("swallows every failure", async () => {
    mockFetchNetworkError("GET", "/alerts/preferences");
    await expect(syncRegistration()).resolves.toBeUndefined();
  });
});

describe("unregisterOnLogout", () => {
  it("deletes the remembered token and forgets it", async () => {
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, "ExponentPushToken[abc]");
    mockFetch("DELETE", "/push/devices", { deleted: true });
    await unregisterOnLogout();
    const [call] = fetchCalls().filter((c) => c.method === "DELETE");
    expect(call.url).toContain("token=ExponentPushToken%5Babc%5D");
    await expect(SecureStore.getItemAsync(PUSH_TOKEN_KEY)).resolves.toBeNull();
  });

  it("is silent when nothing was registered", async () => {
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
    await expect(unregisterOnLogout()).resolves.toBeUndefined();
  });

  it("keeps the stored token when the DELETE fails, so it can be retried", async () => {
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, "ExponentPushToken[abc]");
    mockFetchNetworkError("DELETE", "/push/devices");
    await expect(unregisterOnLogout()).resolves.toBeUndefined();
    await expect(SecureStore.getItemAsync(PUSH_TOKEN_KEY)).resolves.toBe("ExponentPushToken[abc]");
  });
});

describe("deviceRegistered", () => {
  it("is true only with a stored token and granted permission", async () => {
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, "ExponentPushToken[abc]");
    P.permissionStatus.mockResolvedValue("granted");
    await expect(deviceRegistered()).resolves.toBe(true);
    P.permissionStatus.mockResolvedValue("denied");
    await expect(deviceRegistered()).resolves.toBe(false);
    P.permissionStatus.mockResolvedValue("granted");
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
    await expect(deviceRegistered()).resolves.toBe(false);
  });

  it("is false (not thrown) when the check itself fails", async () => {
    P.permissionStatus.mockRejectedValue(new Error("boom"));
    await expect(deviceRegistered()).resolves.toBe(false);
  });
});
