import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import * as api from "@/shared/api";
import { EG_FALLBACK } from "@/shared/markets";
import { MarketProvider, useMarket } from "../market";
import { TickersProvider, useTickers } from "../tickers";

jest.mock("@/auth/AuthProvider", () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: "u1" } }),
}));

const US = { ...EG_FALLBACK, code: "US" as const, currency: "USD" };
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MarketProvider>
    <TickersProvider>{children}</TickersProvider>
  </MarketProvider>
);

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
  api.setApiMarket("EG");
  jest.spyOn(api, "fetchMarkets").mockResolvedValue({ markets: [EG_FALLBACK, US], default: "EG" });
  jest.spyOn(api, "fetchMarketPref").mockResolvedValue({ market: "EG" });
  jest.spyOn(api, "putMarketPref").mockResolvedValue({ market: "US" });
});

it("refetches tickers when the market changes", async () => {
  const spy = jest.spyOn(api, "fetchTickers").mockImplementation(async () =>
    api.getApiMarket() === "US" ? [{ symbol: "AAPL" } as never] : [{ symbol: "COMI" } as never]
  );
  const { result } = await renderHook(() => ({ t: useTickers(), m: useMarket() }), { wrapper });
  await waitFor(() => expect(result.current.t.tickers[0]?.symbol).toBe("COMI"));
  await act(async () => result.current.m.setMarket("US"));
  await waitFor(() => expect(result.current.t.tickers[0]?.symbol).toBe("AAPL"));
  expect(spy).toHaveBeenCalledTimes(2);
});

it("discards a response from the previous market", async () => {
  let resolveEg: (v: never[]) => void = () => {};
  jest.spyOn(api, "fetchTickers").mockImplementation(() =>
    api.getApiMarket() === "EG"
      ? new Promise((r) => { resolveEg = r as never; })
      : Promise.resolve([{ symbol: "AAPL" } as never])
  );
  const { result } = await renderHook(() => ({ t: useTickers(), m: useMarket() }), { wrapper });
  await waitFor(() => expect(result.current.m.loading).toBe(false));
  await act(async () => result.current.m.setMarket("US"));
  await waitFor(() => expect(result.current.t.tickers[0]?.symbol).toBe("AAPL"));
  await act(async () => resolveEg([{ symbol: "COMI" } as never]));
  expect(result.current.t.tickers[0]?.symbol).toBe("AAPL");
});
