import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import * as api from "@/shared/api";
import { EG_FALLBACK } from "@/shared/markets";

import { MARKET_STORAGE_KEY, MarketProvider, useMarket } from "../market";

let mockAuth = { isAuthenticated: true, user: { id: "u1" } };
jest.mock("@/auth/AuthProvider", () => ({
  useAuth: () => mockAuth,
}));

const US = { ...EG_FALLBACK, code: "US" as const, currency: "USD", name: "United States" };
const wrapper = ({ children }: { children: React.ReactNode }) => <MarketProvider>{children}</MarketProvider>;

beforeEach(async () => {
  mockAuth = { isAuthenticated: true, user: { id: "u1" } };
  await AsyncStorage.clear();
  jest.restoreAllMocks();
  api.setApiMarket("EG");
});

it("boots from storage, then the server wins", async () => {
  await AsyncStorage.setItem(MARKET_STORAGE_KEY, "US");
  jest.spyOn(api, "fetchMarkets").mockResolvedValue({ markets: [EG_FALLBACK, US], default: "EG" });
  jest.spyOn(api, "fetchMarketPref").mockResolvedValue({ market: "EG" });
  const { result } = await renderHook(() => useMarket(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.market.code).toBe("EG");
  expect(api.getApiMarket()).toBe("EG");
  expect(await AsyncStorage.getItem(MARKET_STORAGE_KEY)).toBe("EG");
});

it("falls back to EG when /markets fails", async () => {
  jest.spyOn(api, "fetchMarkets").mockRejectedValue(new Error("offline"));
  jest.spyOn(api, "fetchMarketPref").mockRejectedValue(new Error("offline"));
  const { result } = await renderHook(() => useMarket(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.market.code).toBe("EG");
  expect(result.current.markets).toHaveLength(1);
});

it("ignores a stored market that is not enabled", async () => {
  await AsyncStorage.setItem(MARKET_STORAGE_KEY, "US");
  jest.spyOn(api, "fetchMarkets").mockResolvedValue({ markets: [EG_FALLBACK], default: "EG" });
  jest.spyOn(api, "fetchMarketPref").mockResolvedValue({ market: "EG" });
  const { result } = await renderHook(() => useMarket(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.market.code).toBe("EG");
});

it("setMarket persists locally and remotely", async () => {
  jest.spyOn(api, "fetchMarkets").mockResolvedValue({ markets: [EG_FALLBACK, US], default: "EG" });
  jest.spyOn(api, "fetchMarketPref").mockResolvedValue({ market: "EG" });
  const put = jest.spyOn(api, "putMarketPref").mockResolvedValue({ market: "US" });
  const { result } = await renderHook(() => useMarket(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => result.current.setMarket("US"));
  expect(result.current.market.code).toBe("US");
  expect(api.getApiMarket()).toBe("US");
  expect(put).toHaveBeenCalledWith("US");
  await waitFor(async () => expect(await AsyncStorage.getItem(MARKET_STORAGE_KEY)).toBe("US"));
});

it("keeps the local choice when the remote save fails", async () => {
  jest.spyOn(api, "fetchMarkets").mockResolvedValue({ markets: [EG_FALLBACK, US], default: "EG" });
  jest.spyOn(api, "fetchMarketPref").mockResolvedValue({ market: "EG" });
  jest.spyOn(api, "putMarketPref").mockRejectedValue(new Error("500"));
  const { result } = await renderHook(() => useMarket(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => result.current.setMarket("US"));
  await waitFor(() => expect(result.current.market.code).toBe("US"));
  expect(api.getApiMarket()).toBe("US");
});

it("outside a provider returns the EG fallback", async () => {
  const { result } = await renderHook(() => useMarket());
  expect(result.current.market).toEqual(EG_FALLBACK);
  expect(result.current.markets).toEqual([EG_FALLBACK]);
  expect(result.current.loading).toBe(false);
});

it("ignores a market that is not enabled", async () => {
  jest.spyOn(api, "fetchMarkets").mockResolvedValue({ markets: [EG_FALLBACK], default: "EG" });
  jest.spyOn(api, "fetchMarketPref").mockResolvedValue({ market: "EG" });
  const put = jest.spyOn(api, "putMarketPref").mockResolvedValue({ market: "US" });
  const { result } = await renderHook(() => useMarket(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(async () => result.current.setMarket("US"));
  expect(result.current.market.code).toBe("EG");
  expect(api.getApiMarket()).toBe("EG");
  expect(put).not.toHaveBeenCalled();
});

it("is loading again while a newly signed-in user's preference loads", async () => {
  jest.spyOn(api, "fetchMarkets").mockResolvedValue({ markets: [EG_FALLBACK, US], default: "EG" });
  let resolvePref: (v: { market: "EG" | "US" }) => void = () => {};
  jest
    .spyOn(api, "fetchMarketPref")
    .mockResolvedValueOnce({ market: "EG" })
    .mockImplementationOnce(() => new Promise((r) => { resolvePref = r; }));
  const { result, rerender } = await renderHook(() => useMarket(), { wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  mockAuth = { isAuthenticated: true, user: { id: "u2" } };
  await rerender({});
  await waitFor(() => expect(result.current.loading).toBe(true));
  await act(async () => resolvePref({ market: "US" }));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.market.code).toBe("US");
});

it("before the market list answers, a stored US choice reads as US, never as EG", async () => {
  await AsyncStorage.setItem(MARKET_STORAGE_KEY, "US");
  let release: (v: unknown) => void = () => {};
  jest.spyOn(api, "fetchMarkets").mockReturnValue(new Promise((r) => (release = r)) as never);
  jest.spyOn(api, "fetchMarketPref").mockResolvedValue({ market: "US" });
  const { result } = await renderHook(() => useMarket(), { wrapper });
  await waitFor(() => expect(result.current.market.code).toBe("US"));
  expect(result.current.market.currency).toBe("USD");
  expect(result.current.market.benchmark_label).toBe("S&P 500");
  await act(async () => release({ markets: [EG_FALLBACK], default: "EG" }));
  // The list is authoritative: US not enabled -> EG.
  await waitFor(() => expect(result.current.market.code).toBe("EG"));
});
