import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { useAuth } from "@/auth/AuthProvider";
import { confirm } from "@/ui";
import { deleteUser, fetchUsers, inviteUser, sendUserReset, setUserActive, type ManagedUser } from "@/shared/api";
import { routes } from "@/lib/links";
import { renderScreen } from "@/test-utils/renderScreen";
import { AdminScreen } from "../AdminScreen";

jest.mock("@/auth/AuthProvider", () => ({ useAuth: jest.fn() }));
jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));
jest.mock("@/shared/api", () => ({
  fetchUsers: jest.fn(),
  inviteUser: jest.fn(),
  sendUserReset: jest.fn(),
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
  email: "mark@example.com",
  name: "Mark",
  role: "admin",
  is_active: true,
  email_verified: true,
  methods: ["password"],
  created_at: "2026-01-02T00:00:00Z",
  holdings_count: 3,
};
const SARA: ManagedUser = {
  id: "2",
  email: "sara@example.com",
  name: "",
  role: "user",
  is_active: true,
  email_verified: true,
  methods: ["password"],
  created_at: "2026-02-03T00:00:00Z",
  holdings_count: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
  authMock.mockReturnValue({
    user: { id: "1", email: "mark@example.com", name: "Mark", role: "admin" },
    isAdmin: true,
    isLoading: false,
  });
  (fetchUsers as jest.Mock).mockResolvedValue({ users: [ME, SARA] });
});

describe("AdminScreen", () => {
  it("refuses non-admins without calling the users API", async () => {
    authMock.mockReturnValue({
      user: { id: "9", email: "bob@example.com", name: "Bob", role: "user" },
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
    expect(screen.getByText("sara@example.com")).toBeTruthy();
  });

  const openInvite = async () => {
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("2 accounts.")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("Invite user"));
    await fireEvent.changeText(screen.getByLabelText("Email"), "omar@example.com");
  };

  it("invites by email, closes the sheet, shows a notice and reloads the list", async () => {
    (inviteUser as jest.Mock).mockResolvedValue({ user: { ...SARA, id: "3", email: "omar@example.com" } });
    await openInvite();
    await fireEvent.press(screen.getByText("Send invitation"));
    await waitFor(() => expect(screen.getByText("Invitation sent to omar@example.com.")).toBeTruthy());
    expect(inviteUser).toHaveBeenCalledWith("omar@example.com", "");
    expect(fetchUsers).toHaveBeenCalledTimes(2);
    expect(screen.queryByLabelText("Email")).toBeNull();
  });

  it("shows the server's message in the sheet when the email is already taken (409)", async () => {
    (inviteUser as jest.Mock).mockRejectedValue(new Error("An account with that email already exists"));
    await openInvite();
    await fireEvent.press(screen.getByText("Send invitation"));
    await waitFor(() => expect(screen.getByText("An account with that email already exists")).toBeTruthy());
    expect(screen.getByLabelText("Email")).toBeTruthy();
    expect(screen.queryByText(/^Invitation sent/)).toBeNull();
  });

  it("asks before emailing a reset link", async () => {
    confirmMock.mockResolvedValueOnce(false);
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("sara@example.com")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("sara@example.com, show actions"));
    await fireEvent.press(screen.getByText("Send reset email"));
    await waitFor(() =>
      expect(confirmMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Email sara@example.com a link to choose a new password?",
          confirmLabel: "Send",
        }),
      ),
    );
    expect(sendUserReset).not.toHaveBeenCalled();
  });

  it("sends the reset after confirmation and says a reset link went out", async () => {
    confirmMock.mockResolvedValueOnce(true);
    (sendUserReset as jest.Mock).mockResolvedValue({ id: "2", sent: "reset" });
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("sara@example.com")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("sara@example.com, show actions"));
    await fireEvent.press(screen.getByText("Send reset email"));
    await waitFor(() => expect(screen.getByText("Reset link sent to sara@example.com.")).toBeTruthy());
    expect(sendUserReset).toHaveBeenCalledWith("2");
  });

  it("says the invitation was re-sent when they never set up", async () => {
    confirmMock.mockResolvedValueOnce(true);
    (sendUserReset as jest.Mock).mockResolvedValue({ id: "2", sent: "invite" });
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("sara@example.com")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("sara@example.com, show actions"));
    await fireEvent.press(screen.getByText("Send reset email"));
    await waitFor(() => expect(screen.getByText("Invitation re-sent to sara@example.com.")).toBeTruthy());
  });

  it("surfaces a cooldown refusal from the reset", async () => {
    confirmMock.mockResolvedValueOnce(true);
    (sendUserReset as jest.Mock).mockRejectedValue(new Error("Wait a minute before sending again"));
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("sara@example.com")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("sara@example.com, show actions"));
    await fireEvent.press(screen.getByText("Send reset email"));
    await waitFor(() => expect(screen.getByText("Wait a minute before sending again")).toBeTruthy());
  });

  it("deletes only after the irreversible-delete confirmation", async () => {
    confirmMock.mockResolvedValueOnce(true);
    (deleteUser as jest.Mock).mockResolvedValue({
      deleted: "2",
      email: "sara@example.com",
    });
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("sara@example.com")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("sara@example.com, show actions"));
    await fireEvent.press(screen.getByText("Delete"));
    await waitFor(() => expect(deleteUser).toHaveBeenCalledWith("2"));
    expect(confirmMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message:
          "Delete sara@example.com? This permanently removes their portfolio, sale history and watchlist. This cannot be undone.",
        destructive: true,
      }),
    );
  });

  it("toggles active state and surfaces a server refusal", async () => {
    (setUserActive as jest.Mock).mockRejectedValue(
      new Error("Cannot disable the last active admin"),
    );
    await renderScreen(<AdminScreen />);
    await waitFor(() => expect(screen.getByText("sara@example.com")).toBeTruthy());
    await fireEvent.press(screen.getByLabelText("sara@example.com, show actions"));
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
