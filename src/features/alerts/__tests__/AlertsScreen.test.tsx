import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { configureApi } from "@/shared/apiConfig";
import { renderScreen } from "@/test-utils/renderScreen";
import { fetchCalls, mockFetch } from "@/test-utils/fetch";
import * as push from "../push";
import * as registration from "../registration";
import { AlertsScreen } from "../AlertsScreen";

jest.mock("../push", () => ({ isExpoGo: jest.fn(() => false) }));
jest.mock("../registration", () => ({ enableAlertsOnDevice: jest.fn(), deviceRegistered: jest.fn() }));
const P = push as jest.Mocked<typeof push>;
const R = registration as jest.Mocked<typeof registration>;

const OFF = { enabled: false, scope: "watchlist", rise_threshold: 10, fall_threshold: 10 };
const ON = { ...OFF, enabled: true };

function puts() {
  return fetchCalls().filter((c) => c.method === "PUT" && c.url.endsWith("/alerts/preferences"));
}

beforeEach(() => {
  jest.clearAllMocks();
  P.isExpoGo.mockReturnValue(false);
  R.deviceRegistered.mockResolvedValue(true);
  // AuthProvider (which normally configures the client) is not mounted here.
  configureApi({ baseUrl: "https://api.test/api", getToken: () => "jwt", onUnauthorized: () => {} });
});

it("turning alerts on asks the device, then saves enabled", async () => {
  mockFetch("GET", "/alerts/preferences", OFF);
  mockFetch("PUT", "/alerts/preferences", ON);
  R.enableAlertsOnDevice.mockResolvedValue({ ok: true });
  await renderScreen(<AlertsScreen />);
  await fireEvent(await screen.findByLabelText("Score alerts"), "valueChange", true);
  await waitFor(() => expect(puts()).toHaveLength(1));
  expect(puts()[0].body).toEqual(ON);
});

it("a denied permission leaves alerts off, saves nothing, and says how to fix it", async () => {
  mockFetch("GET", "/alerts/preferences", OFF);
  R.enableAlertsOnDevice.mockResolvedValue({ ok: false, reason: "denied" });
  await renderScreen(<AlertsScreen />);
  await fireEvent(await screen.findByLabelText("Score alerts"), "valueChange", true);
  expect(await screen.findByText(/blocked for Borsa Compass/)).toBeTruthy();
  expect(screen.getByLabelText("Score alerts").props.value).toBe(false);
  expect(puts()).toHaveLength(0);
});

it("changing the rise threshold saves it", async () => {
  mockFetch("GET", "/alerts/preferences", ON);
  mockFetch("PUT", "/alerts/preferences", { ...ON, rise_threshold: 5 });
  await renderScreen(<AlertsScreen />);
  await fireEvent.press(await screen.findByLabelText("Rises by 5"));
  await waitFor(() => expect(puts()[0]?.body).toEqual({ ...ON, rise_threshold: 5 }));
});

it("turning a direction off sends null", async () => {
  mockFetch("GET", "/alerts/preferences", ON);
  mockFetch("PUT", "/alerts/preferences", { ...ON, fall_threshold: null });
  await renderScreen(<AlertsScreen />);
  await fireEvent.press(await screen.findByLabelText("Falls by Off"));
  await waitFor(() => expect(puts()[0]?.body).toEqual({ ...ON, fall_threshold: null }));
});

it("a failed save reverts the control", async () => {
  mockFetch("GET", "/alerts/preferences", ON);
  mockFetch("PUT", "/alerts/preferences", { detail: "boom" }, 500);
  await renderScreen(<AlertsScreen />);
  await fireEvent.press(await screen.findByLabelText("All stocks"));
  expect(await screen.findByText("Couldn't save. Try again.")).toBeTruthy();
  expect(screen.getByLabelText("Watchlist & holdings").props.accessibilityState.selected).toBe(true);
});

it("in Expo Go the screen explains and disables everything", async () => {
  P.isExpoGo.mockReturnValue(true);
  mockFetch("GET", "/alerts/preferences", OFF);
  await renderScreen(<AlertsScreen />);
  expect(await screen.findByText(/installed app build/)).toBeTruthy();
  expect(screen.getByLabelText("Score alerts").props.disabled).toBe(true);
});

it("states that a score change is not advice", async () => {
  mockFetch("GET", "/alerts/preferences", OFF);
  await renderScreen(<AlertsScreen />);
  expect(await screen.findByText(/information, not advice/)).toBeTruthy();
});

describe("this phone is not registered (alerts on from another phone)", () => {
  beforeEach(() => R.deviceRegistered.mockResolvedValue(false));

  it("offers to turn alerts on for this phone, and registers without saving prefs", async () => {
    mockFetch("GET", "/alerts/preferences", ON);
    R.enableAlertsOnDevice.mockResolvedValue({ ok: true });
    await renderScreen(<AlertsScreen />);
    await fireEvent.press(await screen.findByLabelText("Turn on for this phone"));
    await waitFor(() => expect(R.enableAlertsOnDevice).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByLabelText("Turn on for this phone")).toBeNull());
    expect(puts()).toHaveLength(0);
  });

  it("shows the failure reason and keeps the button", async () => {
    mockFetch("GET", "/alerts/preferences", ON);
    R.enableAlertsOnDevice.mockResolvedValue({ ok: false, reason: "denied" });
    await renderScreen(<AlertsScreen />);
    await fireEvent.press(await screen.findByLabelText("Turn on for this phone"));
    expect(await screen.findByText(/blocked for Borsa Compass/)).toBeTruthy();
    expect(screen.getByLabelText("Turn on for this phone")).toBeTruthy();
  });

  it("is hidden when the account has alerts off", async () => {
    mockFetch("GET", "/alerts/preferences", OFF);
    await renderScreen(<AlertsScreen />);
    await screen.findByLabelText("Score alerts");
    expect(screen.queryByLabelText("Turn on for this phone")).toBeNull();
  });

  it("is hidden in Expo Go", async () => {
    P.isExpoGo.mockReturnValue(true);
    mockFetch("GET", "/alerts/preferences", ON);
    await renderScreen(<AlertsScreen />);
    await screen.findByLabelText("Score alerts");
    expect(screen.queryByLabelText("Turn on for this phone")).toBeNull();
  });
});

it("hides the button when this phone is already registered", async () => {
  mockFetch("GET", "/alerts/preferences", ON);
  await renderScreen(<AlertsScreen />);
  await screen.findByLabelText("Score alerts");
  await waitFor(() => expect(R.deviceRegistered).toHaveBeenCalled());
  expect(screen.queryByLabelText("Turn on for this phone")).toBeNull();
});
