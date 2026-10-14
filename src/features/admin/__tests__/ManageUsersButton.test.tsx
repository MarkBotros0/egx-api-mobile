import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { useAuth } from "@/auth/AuthProvider";
import { routes } from "@/lib/links";
import { ManageUsersButton } from "../ManageUsersButton";

jest.mock("@/auth/AuthProvider", () => ({ useAuth: jest.fn() }));
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
const authMock = useAuth as jest.Mock;

describe("ManageUsersButton", () => {
  it("is absent for a normal user", async () => {
    authMock.mockReturnValue({ isAdmin: false });
    await render(<ManageUsersButton />);
    expect(screen.queryByLabelText("Users")).toBeNull();
  });

  it("opens user management for an admin", async () => {
    authMock.mockReturnValue({ isAdmin: true });
    await render(<ManageUsersButton />);
    await fireEvent.press(screen.getByLabelText("Users"));
    expect(router.push).toHaveBeenCalledWith(routes.admin);
  });
});
