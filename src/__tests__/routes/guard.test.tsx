import { act, screen } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Slot } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Text } from "react-native";

import { AuthProvider } from "@/auth/AuthProvider";
import { fetchTickers } from "@/shared/api";
import { RootNavigator } from "@/navigation/RootNavigator";
import { mockFetch } from "@/test-utils/fetch";

function Layout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

const app = {
  _layout: Layout,
  login: () => <Text>LOGIN</Text>,
  signup: () => <Text>SIGNUP</Text>,
  "forgot-password": () => <Text>FORGOT</Text>,
  "(tabs)/_layout": Slot,
  "(tabs)/index": () => <Text>DASHBOARD</Text>,
  "stock/[symbol]": () => <Text>STOCK</Text>,
  admin: () => <Text>ADMIN</Text>,
  compare: () => <Text>COMPARE</Text>,
  dividends: () => <Text>DIVIDENDS</Text>,
  calibration: () => <Text>CALIBRATION</Text>,
  alerts: () => <Text>ALERTS</Text>,
  "dev/charts": () => null,
};

async function signedInAs(role: "user" | "admin") {
  await SecureStore.setItemAsync("egx.auth.token", "tok");
  await SecureStore.setItemAsync("egx.auth.user", JSON.stringify({ id: "1", email: "mark@example.com", name: "Mark", role }));
  mockFetch("GET", "/auth/me", { id: "1", email: "mark@example.com", name: "Mark", role });
}

describe("route guard", () => {
  it("sends a signed-out visitor to login, even from a deep link", async () => {
    await renderRouter(app, { initialUrl: "/stock/COMI" });
    expect(await screen.findByText("LOGIN")).toBeTruthy();
  });

  it("lets a signed-in user through", async () => {
    await signedInAs("user");
    await renderRouter(app, { initialUrl: "/stock/COMI" });
    expect(await screen.findByText("STOCK")).toBeTruthy();
  });

  it("keeps a non-admin out of /admin", async () => {
    await signedInAs("user");
    await renderRouter(app, { initialUrl: "/admin" });
    expect(await screen.findByText("DASHBOARD")).toBeTruthy();
  });

  it("keeps a signed-out visitor out of /alerts", async () => {
    await renderRouter(app, { initialUrl: "/alerts" });
    expect(await screen.findByText("LOGIN")).toBeTruthy();
  });

  it("lets a signed-in user open /alerts", async () => {
    await signedInAs("user");
    await renderRouter(app, { initialUrl: "/alerts" });
    expect(await screen.findByText("ALERTS")).toBeTruthy();
  });

  it("shows sign-up and forgot-password to a signed-out visitor", async () => {
    await renderRouter(app, { initialUrl: "/signup" });
    expect(await screen.findByText("SIGNUP")).toBeTruthy();
    await renderRouter(app, { initialUrl: "/forgot-password" });
    expect(await screen.findByText("FORGOT")).toBeTruthy();
  });

  it("keeps a signed-in user off sign-up and forgot-password", async () => {
    await signedInAs("user");
    await renderRouter(app, { initialUrl: "/signup" });
    expect(await screen.findByText("DASHBOARD")).toBeTruthy();
    await renderRouter(app, { initialUrl: "/forgot-password" });
    expect(await screen.findByText("DASHBOARD")).toBeTruthy();
  });

  it("drops to login when the session dies mid-use", async () => {
    await signedInAs("user");
    await renderRouter(app, { initialUrl: "/" });
    expect(await screen.findByText("DASHBOARD")).toBeTruthy();
    mockFetch("GET", "/tickers", { detail: "expired" }, 401);
    await act(async () => {
      await fetchTickers().catch(() => {});
    });
    expect(await screen.findByText("LOGIN")).toBeTruthy();
  });
});
