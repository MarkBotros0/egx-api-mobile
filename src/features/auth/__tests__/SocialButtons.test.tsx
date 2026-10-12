import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";

import { AuthProvider } from "@/auth/AuthProvider";
import { currentToken } from "@/auth/tokenStore";
import { SocialButtons } from "@/features/auth/SocialButtons";
import { isExpoGo } from "@/lib/runtime";
import { fetchCalls, mockFetch } from "@/test-utils/fetch";
import { appleMock, googleMock } from "@/test-utils/socialAuthMock";

jest.mock("@/lib/runtime", () => ({ isExpoGo: jest.fn(() => false) }));

const USER = { id: "1", email: "mark@gmail.com", name: "Mark", role: "user" };
const SESSION = { access_token: "t", user: USER };

const renderButtons = async () => {
  const utils = await render(
    <AuthProvider>
      <SocialButtons />
    </AuthProvider>
  );
  await act(async () => {}); // let useAppleAvailable settle
  return utils;
};

const setPlatform = (os: "ios" | "android") => {
  Object.defineProperty(Platform, "OS", { configurable: true, get: () => os });
};

const originalOS = Platform.OS;
let originalWebId: string | undefined;

beforeEach(() => {
  originalWebId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = "web-client-id";
  (isExpoGo as jest.Mock).mockReturnValue(false);
  setPlatform("android");
  googleMock.GoogleSignin.signIn.mockClear();
  appleMock.isAvailableAsync.mockResolvedValue(true);
});

afterEach(() => {
  if (originalWebId === undefined) delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  else process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = originalWebId;
  setPlatform(originalOS as "ios" | "android");
});

describe("SocialButtons", () => {
  it("does not render Google in Expo Go", async () => {
    (isExpoGo as jest.Mock).mockReturnValue(true);
    await renderButtons();
    expect(screen.queryByLabelText("Continue with Google")).toBeNull();
  });

  it("signs in with Google: POSTs the id token and name", async () => {
    mockFetch("POST", "/auth/google", SESSION);
    await renderButtons();
    await fireEvent.press(screen.getByLabelText("Continue with Google"));
    await waitFor(() => expect(fetchCalls()[0]?.body).toEqual({ idToken: "google-id-token", name: "Mark" }));
    expect(fetchCalls()[0]?.url).toMatch(/\/auth\/google$/);
    await waitFor(() => expect(currentToken()).toBe("t")); // completeSignIn stored the session
  });

  it("makes no request and shows no error when Google sign-in is cancelled", async () => {
    googleMock.GoogleSignin.signIn.mockResolvedValueOnce({ type: "cancelled", data: null } as never);
    await renderButtons();
    await fireEvent.press(screen.getByLabelText("Continue with Google"));
    await waitFor(() => expect(googleMock.GoogleSignin.signIn).toHaveBeenCalled());
    expect(fetchCalls()).toHaveLength(0);
    expect(screen.queryByText(/failed/i)).toBeNull();
  });

  it("renders Apple on iOS and POSTs the identity token, code and full name", async () => {
    setPlatform("ios");
    mockFetch("POST", "/auth/apple", SESSION);
    await renderButtons();
    await fireEvent.press(await screen.findByTestId("apple-button"));
    await waitFor(() =>
      expect(fetchCalls()[0]?.body).toEqual({
        identityToken: "apple-identity-token",
        authorizationCode: "apple-code",
        name: "Mark B",
      })
    );
    expect(fetchCalls()[0]?.url).toMatch(/\/auth\/apple$/);
    await waitFor(() => expect(currentToken()).toBe("t"));
  });

  it("does not render Apple on Android", async () => {
    await renderButtons();
    expect(screen.queryByTestId("apple-button")).toBeNull();
  });

  it("shows a backend error under the buttons", async () => {
    mockFetch("POST", "/auth/google", { detail: "Google sign-in failed" }, 401);
    await renderButtons();
    await fireEvent.press(screen.getByLabelText("Continue with Google"));
    expect(await screen.findByText("Google sign-in failed")).toBeTruthy();
  });

  it("renders nothing, not even the divider, when neither button is available", async () => {
    (isExpoGo as jest.Mock).mockReturnValue(true);
    await renderButtons();
    expect(screen.queryByText("or")).toBeNull();
  });

  it("shows the divider when a button is available", async () => {
    await renderButtons();
    expect(screen.getByText("or")).toBeTruthy();
  });
});
