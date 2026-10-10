import { createElement } from "react";
import { router, Stack } from "expo-router";
import { act, fireEvent, renderRouter, screen } from "expo-router/testing-library";
import DashboardRoute from "@/app/(tabs)/index";
import StockRoute from "@/app/stock/[symbol]";

// Screens are replaced by stubs that print what the route passed them.
jest.mock("@/features/market/DashboardScreen", () => {
  const { createElement: h } = jest.requireActual("react");
  const { Text } = jest.requireActual("react-native");
  return { DashboardScreen: () => h(Text, null, "dashboard-screen") };
});
jest.mock("@/features/market/StockDetailScreen", () => {
  const { createElement: h } = jest.requireActual("react");
  const { Text } = jest.requireActual("react-native");
  return {
    // Holds a tap count so a test can see whether the screen was remounted.
    StockDetailScreen: ({ symbol, initialInterval }: { symbol: string; initialInterval: string }) => {
      const [taps, setTaps] = jest.requireActual("react").useState(0);
      return h(Text, { onPress: () => setTaps(taps + 1) }, `${symbol}|${initialInterval}|${taps}`);
    },
  };
});

const layout = () => createElement(Stack);

it("mounts the dashboard on the index route", async () => {
  await renderRouter({ _layout: layout, index: DashboardRoute }, { initialUrl: "/" });
  expect(await screen.findByText("dashboard-screen")).toBeTruthy();
});

it("upper-cases the symbol and keeps a valid interval", async () => {
  await renderRouter({ _layout: layout, "stock/[symbol]": StockRoute }, { initialUrl: "/stock/comi?interval=Weekly" });
  expect(await screen.findByText("COMI|Weekly|0")).toBeTruthy();
});

it("falls back to Daily for an unknown interval", async () => {
  await renderRouter({ _layout: layout, "stock/[symbol]": StockRoute }, { initialUrl: "/stock/COMI?interval=Hourly" });
  expect(await screen.findByText("COMI|Daily|0")).toBeTruthy();
});

it("starts fresh state when the same route moves to another stock", async () => {
  await renderRouter({ _layout: layout, "stock/[symbol]": StockRoute }, { initialUrl: "/stock/COMI" });
  await fireEvent.press(await screen.findByText("COMI|Daily|0"));
  expect(await screen.findByText("COMI|Daily|1")).toBeTruthy();
  await act(async () => router.setParams({ symbol: "ETEL" }));
  expect(await screen.findByText("ETEL|Daily|0")).toBeTruthy();
});
