import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import * as api from "@/shared/api";
import { EG_FALLBACK } from "@/shared/markets";

import { MARKET_STORAGE_KEY, MarketProvider, useMarket } from "../market";

jest.mock("@/auth/AuthProvider", () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: "u1" } }),
}));

const US = { ...EG_FALLBACK, code: "US" as const, currency: "USD", name: "United States" };
const wrapper = ({ children }: { children: React.ReactNode }) => <MarketProvider>{children}</MarketProvider>;

beforeEach(async () => {
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
