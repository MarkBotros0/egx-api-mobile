import { Platform } from "react-native";
import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { useAuth } from "@/auth/AuthProvider";
import { confirm } from "@/ui";
import {
  createUser,
  deleteUser,
  fetchUsers,
  resetUserPassword,
  setUserActive,
  type ManagedUser,
} from "@/shared/api";
import { routes } from "@/lib/links";
import { finishDismiss } from "@/test-utils/sheetMock";
import { renderScreen } from "@/test-utils/renderScreen";
import { AdminScreen } from "../AdminScreen";

jest.mock("@/auth/AuthProvider", () => ({ useAuth: jest.fn() }));
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));
jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("@/lib/env", () => ({ feBaseUrl: () => "https://egx.example" }));
jest.mock("@/shared/api", () => ({
  fetchUsers: jest.fn(),
  createUser: jest.fn(),
  resetUserPassword: jest.fn(),
  setUserActive: jest.fn(),
  deleteUser: jest.fn(),
}));
jest.mock("@/ui", () => ({
  ...jest.requireActual("@/ui"),
  ...jest.requireActual("@/test-utils/sheetMock"),
  confirm: jest.fn(),
}));

const authMock = useAuth as jest.Mock;
const confirmMock = confirm as jest.MockedFunction<typeof confirm>;
const ME: ManagedUser = {
  id: "1",
  username: "mark",
  role: "admin",
  is_active: true,
  created_at: "2026-01-02T00:00:00Z",
  holdings_count: 3,
};
const SARA: ManagedUser = {
  id: "2",
  username: "sara.b",
  role: "user",
  is_active: true,
  created_at: "2026-02-03T00:00:00Z",
  holdings_count: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
  authMock.mockReturnValue({
    user: { id: "1", username: "mark", role: "admin" },
    isAdmin: true,
    isLoading: false,
  });
  (fetchUsers as jest.Mock).mockResolvedValue({ users: [ME, SARA] });
});

describe("AdminScreen", () => {
  it("refuses non-admins without calling the users API", async () => {
    authMock.mockReturnValue({
      user: { id: "9", username: "bob", role: "user" },
      isAdmin: false,
      isLoading: false,
    });
    await renderScreen(<AdminScreen />);
    expect(screen.getByText("Admins only")).toBeTruthy();
    expect(fetchUsers).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText("Back to dashboard"));
    expect(router.replace).toHaveBeenCalledWith(routes.dashboard);
  });

  it("lists accounts with a count", async () => {
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("2 accounts.")).toBeTruthy());
    expect(screen.getByText("sara.b")).toBeTruthy();
  });

  const createOmar = async () => {
    (createUser as jest.Mock).mockResolvedValue({
      user: { ...SARA, id: "3", username: "omar" },
      generated_password: "Gen3rat3dPassw0rd",
    });
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("2 accounts.")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("Add user"));
    await fireEvent.changeText(screen.getByLabelText("Username"), "omar");
    await fireEvent.press(screen.getByText("Create user"));
  };

  it("android: reveals the generated password immediately, once", async () => {
    const os = Platform.OS;
    Platform.OS = "android";
    try {
      await createOmar();
      await waitFor(() => expect(screen.getByText("Gen3rat3dPassw0rd")).toBeTruthy());
      expect(createUser).toHaveBeenCalledWith("omar", undefined);
      expect(fetchUsers).toHaveBeenCalledTimes(2);
      expect(screen.getByText("https://egx.example")).toBeTruthy();
      expect(screen.queryByLabelText("Username")).toBeNull();
      await fireEvent.press(screen.getByText("Done"));
      expect(screen.queryByText("Gen3rat3dPassw0rd")).toBeNull();
    } finally {
      Platform.OS = os;
    }
  });

  it("ios: holds the password until the create sheet has dismissed, then reveals it once", async () => {
    const os = Platform.OS;
    Platform.OS = "ios";
    try {
      await createOmar();
      await waitFor(() => expect(fetchUsers).toHaveBeenCalledTimes(2));
      // create sheet closed, but the second Modal must not open mid-dismiss
      expect(screen.queryByLabelText("Username")).toBeNull();
      expect(screen.queryByText("Gen3rat3dPassw0rd")).toBeNull();
      await act(async () => finishDismiss());
      expect(screen.getByText("Gen3rat3dPassw0rd")).toBeTruthy();
      expect(screen.getByText("https://egx.example")).toBeTruthy();
      // a second dismissal must not re-open it after it was closed
      await fireEvent.press(screen.getByText("Done"));
      await act(async () => finishDismiss());
      expect(screen.queryByText("Gen3rat3dPassw0rd")).toBeNull();
    } finally {
      Platform.OS = os;
    }
  });

  it("ios: a dismiss with nothing pending reveals nothing", async () => {
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("2 accounts.")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("Add user"));
    await fireEvent.press(screen.getByLabelText("Dismiss sheet"));
    await act(async () => finishDismiss());
    expect(screen.queryByText("https://egx.example")).toBeNull();
  });

  it("ignores a dismiss while the create is in flight, so the one-time password is never dropped", async () => {
    let resolve!: (v: unknown) => void;
    (createUser as jest.Mock).mockReturnValue(
      new Promise((r) => (resolve = r)),
    );
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("2 accounts.")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("Add user"));
    await fireEvent.changeText(screen.getByLabelText("Username"), "omar");
    // Not awaited: the press handler returns the pending create, and RNTL would wait on it.
    void fireEvent.press(screen.getByText("Create user"));
    await waitFor(() => expect(createUser).toHaveBeenCalledWith("omar", undefined));
    await fireEvent.press(screen.getByLabelText("Dismiss sheet"));
    await fireEvent.press(screen.getByText("Cancel"));
    expect(screen.getByLabelText("Username")).toBeTruthy();
    await act(async () => {
      resolve({
        user: { ...SARA, id: "3", username: "omar" },
        generated_password: "Gen3rat3dPassw0rd",
      });
    });
    await act(async () => finishDismiss());
    await waitFor(() =>
      expect(screen.getByText("Gen3rat3dPassw0rd")).toBeTruthy(),
    );
  });

  it("asks before resetting a password, with the web's wording", async () => {
    confirmMock.mockResolvedValueOnce(false);
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("sara.b")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("sara.b, show actions"));
    await fireEvent.press(screen.getByText("Reset password"));
    await waitFor(() =>
      expect(confirmMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message:
            "Generate a new password for sara.b? Their current password will stop working immediately.",
        }),
      ),
    );
    expect(resetUserPassword).not.toHaveBeenCalled();
  });

  it("resets after confirmation and reveals the new password", async () => {
    confirmMock.mockResolvedValueOnce(true);
    (resetUserPassword as jest.Mock).mockResolvedValue({
      id: "2",
      username: "sara.b",
      generated_password: "N3wPassw0rdHere",
    });
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("sara.b")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("sara.b, show actions"));
    await fireEvent.press(screen.getByText("Reset password"));
    await waitFor(() =>
      expect(screen.getByText("N3wPassw0rdHere")).toBeTruthy(),
    );
    expect(resetUserPassword).toHaveBeenCalledWith("2");
  });

  it("deletes only after the irreversible-delete confirmation", async () => {
    confirmMock.mockResolvedValueOnce(true);
    (deleteUser as jest.Mock).mockResolvedValue({
      deleted: "2",
      username: "sara.b",
    });
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("sara.b")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("sara.b, show actions"));
    await fireEvent.press(screen.getByText("Delete"));
    await waitFor(() => expect(deleteUser).toHaveBeenCalledWith("2"));
    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          "Delete sara.b? This permanently removes their portfolio, sale history and watchlist. This cannot be undone.",
        destructive: true,
      }),
    );
  });

  it("toggles active state and surfaces a server refusal", async () => {
    (setUserActive as jest.Mock).mockRejectedValue(
      new Error("Cannot disable the last active admin"),
    );
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("sara.b")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("sara.b, show actions"));
    await fireEvent.press(screen.getByText("Disable"));
    expect(setUserActive).toHaveBeenCalledWith("2", false);
    await waitFor(() =>
      expect(
        screen.getByText("Cannot disable the last active admin"),
      ).toBeTruthy(),
    );
  });

  it("shows a load failure", async () => {
    (fetchUsers as jest.Mock).mockRejectedValue(new Error("Forbidden"));
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("Forbidden")).toBeTruthy());
  });
});
