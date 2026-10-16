import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { consumeColdStartTap, getPushToken, isExpoGo, onAlertTap, parseTap, requestPermission } from "../push";

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
    expect(parseTap({ type: "score_alert", symbol: "AAPL", session: "2026-10-16", market: "US" })).toEqual({
      symbol: "AAPL",
      market: "US",
    });
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
      notification: { request: { identifier: "cold-1", content: { data: { type: "score_alert", symbol: "FWRY" } } } },
    } as never);
    await expect(consumeColdStartTap()).resolves.toEqual({ symbol: "FWRY" });
    expect(N.clearLastNotificationResponseAsync).toHaveBeenCalled();
  });

  describe("tap replay", () => {
    const response = (identifier: string, symbol = "COMI") =>
      ({ notification: { request: { identifier, content: { data: { type: "score_alert", symbol } } } } }) as never;
    const registerListener = () => {
      const cb = jest.fn();
      onAlertTap(cb);
      const handler = N.addNotificationResponseReceivedListener.mock.calls.at(-1)![0] as unknown as (r: never) => void;
      return { cb, handler };
    };

    it("a live tap is delivered once and clears the native last response", () => {
      const { cb, handler } = registerListener();
      handler(response("live-1"));
      handler(response("live-1"));
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenCalledWith({ symbol: "COMI" });
      expect(N.clearLastNotificationResponseAsync).toHaveBeenCalled();
    });

    it("a cold-start read skips a tap the listener already handled", async () => {
      const { handler } = registerListener();
      handler(response("same-2"));
      N.getLastNotificationResponseAsync.mockResolvedValueOnce(response("same-2"));
      await expect(consumeColdStartTap()).resolves.toBeNull();
    });

    it("a cold-start read does not replay the previous cold-start tap", async () => {
      N.getLastNotificationResponseAsync.mockResolvedValue(response("cold-3", "ETEL"));
      await expect(consumeColdStartTap()).resolves.toEqual({ symbol: "ETEL" });
      await expect(consumeColdStartTap()).resolves.toBeNull();
      N.getLastNotificationResponseAsync.mockResolvedValue(null);
    });

    it("a different notification is still delivered", async () => {
      const { cb, handler } = registerListener();
      handler(response("a-4"));
      handler(response("b-4", "FWRY"));
      expect(cb).toHaveBeenCalledTimes(2);
    });
  });
});
