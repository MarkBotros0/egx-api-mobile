import { render } from "@testing-library/react-native";
import { router } from "expo-router";

import { routes, stockHref } from "@/lib/links";
import * as push from "../push";
import * as registration from "../registration";
import { NotificationRouter } from "../NotificationRouter";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("../push", () => ({
  isExpoGo: jest.fn(() => false),
  configureNotifications: jest.fn(),
  onAlertTap: jest.fn(),
  consumeColdStartTap: jest.fn(),
}));
jest.mock("../registration", () => ({ syncRegistration: jest.fn().mockResolvedValue(undefined) }));
const P = push as jest.Mocked<typeof push>;

let tap: ((t: { symbol: string; market?: string }) => void) | undefined;
const unsubscribe = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  P.isExpoGo.mockReturnValue(false);
  P.onAlertTap.mockImplementation((cb) => {
    tap = cb;
    return unsubscribe;
  });
  P.consumeColdStartTap.mockResolvedValue(null);
});

it("a tapped alert opens that stock", async () => {
  await render(<NotificationRouter />);
  tap?.({ symbol: "COMI" });
  expect(router.push).toHaveBeenCalledWith(stockHref("COMI"));
});

it("a US alert opens the stock on the US market", async () => {
  await render(<NotificationRouter />);
  tap?.({ symbol: "AAPL", market: "US" });
  expect(router.push).toHaveBeenCalledWith({ pathname: "/stock/[symbol]", params: { symbol: "AAPL", market: "US" } });
});

it("the daily summary opens the dashboard", async () => {
  await render(<NotificationRouter />);
  tap?.({ symbol: "*" });
  expect(router.push).toHaveBeenCalledWith(routes.dashboard);
});

it("a cold-start tap is routed once", async () => {
  P.consumeColdStartTap.mockResolvedValue({ symbol: "FWRY" });
  await render(<NotificationRouter />);
  await new Promise((r) => setImmediate(r));
  expect(router.push).toHaveBeenCalledWith(stockHref("FWRY"));
  expect(router.push).toHaveBeenCalledTimes(1);
});

it("re-registers on boot and unsubscribes on unmount", async () => {
  const view = await render(<NotificationRouter />);
  expect(registration.syncRegistration).toHaveBeenCalled();
  await view.unmount();
  expect(unsubscribe).toHaveBeenCalled();
});

it("does nothing in Expo Go", async () => {
  P.isExpoGo.mockReturnValue(true);
  await render(<NotificationRouter />);
  expect(P.onAlertTap).not.toHaveBeenCalled();
  expect(registration.syncRegistration).not.toHaveBeenCalled();
});
