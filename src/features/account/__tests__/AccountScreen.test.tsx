import * as SecureStore from "expo-secure-store";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { AuthProvider } from "@/auth/AuthProvider";
import { AccountScreen } from "@/features/account/AccountScreen";
import { EG_FALLBACK, type Market } from "@/shared/markets";
import { fetchCalls, mockFetch } from "@/test-utils/fetch";
import { TestSafeArea } from "@/test-utils/safeArea";

const US: Market = { ...EG_FALLBACK, code: "US", currency: "USD", name: "United States", flag: "🇺🇸" };
// jest.mock factories may only reference `mock`-prefixed variables.
const mockMarket = { markets: [] as Market[] };
jest.mock("@/providers/market", () => ({
  useMarket: () => ({ market: mockMarket.markets[0], markets: mockMarket.markets, setMarket: jest.fn(), loading: false }),
}));

const USER = { id: "1", email: "mark@example.com", name: "Mark", role: "user" };

const renderScreen = async () => {
  await SecureStore.setItemAsync("egx.auth.token", "tok");
  await SecureStore.setItemAsync("egx.auth.user", JSON.stringify(USER));
  mockFetch("GET", "/auth/me", USER);
  return render(
    <TestSafeArea>
      <AuthProvider>
        <AccountScreen />
      </AuthProvider>
    </TestSafeArea>
  );
};

const confirm = (text: string) => fireEvent.changeText(screen.getByLabelText("Type DELETE to confirm"), text);
const deleteCalls = () => fetchCalls().filter((c) => c.method === "DELETE");

describe("AccountScreen", () => {
  beforeEach(() => {
    mockMarket.markets = [EG_FALLBACK];
  });

  it("shows the display name and email", async () => {
    await renderScreen();
    expect(await screen.findByText("Mark")).toBeTruthy();
    expect(screen.getByText("mark@example.com")).toBeTruthy();
  });

  it("keeps Delete disabled until the field holds exactly DELETE", async () => {
    await renderScreen();
    await screen.findByText("Mark");
    const btn = () => screen.getByLabelText("Delete my account");
    expect(btn().props.accessibilityState.disabled).toBe(true);
    await confirm("delete");
    expect(btn().props.accessibilityState.disabled).toBe(true);
    await confirm("DELETE ");
    expect(btn().props.accessibilityState.disabled).toBe(true);
    await confirm("DELETE");
    expect(btn().props.accessibilityState.disabled).toBe(false);
  });

  it("calls DELETE /auth/me once when confirmed", async () => {
    await renderScreen();
    await screen.findByText("Mark");
    mockFetch("DELETE", "/auth/me", {});
    await confirm("DELETE");
    await fireEvent.press(screen.getByLabelText("Delete my account"));
    await waitFor(() => expect(deleteCalls()).toHaveLength(1));
    expect(deleteCalls()[0]?.url).toMatch(/\/auth\/me$/);
  });

  it("shows the server's message and stays put when deletion is refused", async () => {
    await renderScreen();
    await screen.findByText("Mark");
    const msg = "You are the last active admin — no one could administer the app.";
    mockFetch("DELETE", "/auth/me", { detail: msg }, 409);
    await confirm("DELETE");
    await fireEvent.press(screen.getByLabelText("Delete my account"));
    expect(await screen.findByText(msg)).toBeTruthy();
    expect(screen.getByText("mark@example.com")).toBeTruthy();
  });

  it("logs out", async () => {
    await renderScreen();
    await screen.findByText("Mark");
    await fireEvent.press(screen.getByRole("button", { name: "Log out" }));
    await waitFor(() => expect(screen.queryByText("mark@example.com")).toBeNull());
  });

  it("hides the market row while only one market is enabled", async () => {
    await renderScreen();
    await screen.findByText("Mark");
    expect(screen.queryByLabelText(/^Market:/)).toBeNull();
  });

  it("shows the market row when several markets are enabled", async () => {
    mockMarket.markets = [EG_FALLBACK, US];
    await renderScreen();
    await screen.findByText("Mark");
    expect(screen.getByLabelText("Market: Egypt. Change market")).toBeTruthy();
  });
});
