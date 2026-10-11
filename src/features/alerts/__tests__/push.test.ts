import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { consumeColdStartTap, getPushToken, isExpoGo, parseTap, requestPermission } from "../push";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { executionEnvironment: "standalone", expoConfig: { extra: { eas: { projectId: "proj-1" } } } },
  ExecutionEnvironment: { StoreClient: "storeClient", Standalone: "standalone", Bare: "bare" },
}));

const N = Notifications as jest.Mocked<typeof Notifications>;

describe("push boundary", () => {
  it("parses only score-alert taps with a symbol", () => {
    expect(parseTap({ type: "score_alert", symbol: "COMI" })).toEqual({ symbol: "COMI" });
    expect(parseTap({ type: "score_alert", symbol: "*" })).toEqual({ symbol: "*" });
    expect(parseTap({ type: "other", symbol: "COMI" })).toBeNull();
    expect(parseTap({ type: "score_alert" })).toBeNull();
    expect(parseTap(null)).toBeNull();
  });

  it("detects Expo Go from the execution environment", () => {
    expect(isExpoGo()).toBe(false);
    (Constants as unknown as { executionEnvironment: string }).executionEnvironment = "storeClient";
    expect(isExpoGo()).toBe(true);
    (Constants as unknown as { executionEnvironment: string }).executionEnvironment = "standalone";
  });

  it("creates the Android channel before asking for permission", async () => {
    Platform.OS = "android";
    N.getPermissionsAsync.mockResolvedValueOnce({ status: "undetermined" } as never);
    N.requestPermissionsAsync.mockResolvedValueOnce({ status: "granted" } as never);
    await expect(requestPermission()).resolves.toBe("granted");
    const channelOrder = N.setNotificationChannelAsync.mock.invocationCallOrder[0];
    const requestOrder = N.requestPermissionsAsync.mock.invocationCallOrder[0];
    expect(channelOrder).toBeLessThan(requestOrder);
    expect(N.setNotificationChannelAsync).toHaveBeenCalledWith("score-alerts", expect.objectContaining({ name: "Score alerts" }));
  });

  it("gets the Expo token with the EAS project id", async () => {
    N.getExpoPushTokenAsync.mockResolvedValueOnce({ data: "ExponentPushToken[abc]" } as never);
    await expect(getPushToken()).resolves.toBe("ExponentPushToken[abc]");
    expect(N.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: "proj-1" });
  });

  it("returns the cold-start tap once and clears it", async () => {
    N.getLastNotificationResponseAsync.mockResolvedValueOnce({
      notification: { request: { content: { data: { type: "score_alert", symbol: "FWRY" } } } },
    } as never);
    await expect(consumeColdStartTap()).resolves.toEqual({ symbol: "FWRY" });
    expect(N.clearLastNotificationResponseAsync).toHaveBeenCalled();
  });
});
