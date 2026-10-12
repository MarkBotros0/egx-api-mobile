import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderScreen } from "@/test-utils/renderScreen";
import { InviteUserSheet } from "../InviteUserSheet";

jest.mock("@/ui", () => {
  const actual = jest.requireActual("@/ui");
  return {
    ...actual,
    ...jest.requireActual("@/test-utils/sheetMock"),
  };
});

describe("InviteUserSheet", () => {
  it("has no password field and explains the emailed link", async () => {
    await renderScreen(<InviteUserSheet onInvite={jest.fn()} onClose={jest.fn()} />);
    expect(screen.queryByLabelText("Password")).toBeNull();
    expect(
      screen.getByText("They get an email with a link to choose their password. The link works for 7 days.")
    ).toBeTruthy();
  });

  it("sends the trimmed email and name", async () => {
    const onInvite = jest.fn().mockResolvedValue(undefined);
    await renderScreen(<InviteUserSheet onInvite={onInvite} onClose={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText("Email"), "  sara@example.com ");
    await fireEvent.changeText(screen.getByLabelText("Name (optional)"), " Sara ");
    await fireEvent.press(screen.getByText("Send invitation"));
    expect(onInvite).toHaveBeenCalledWith("sara@example.com", "Sara");
  });

  it("allows an empty name", async () => {
    const onInvite = jest.fn().mockResolvedValue(undefined);
    await renderScreen(<InviteUserSheet onInvite={onInvite} onClose={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText("Email"), "sara@example.com");
    await fireEvent.press(screen.getByText("Send invitation"));
    expect(onInvite).toHaveBeenCalledWith("sara@example.com", "");
  });

  it("validates the email before calling the server", async () => {
    const onInvite = jest.fn();
    await renderScreen(<InviteUserSheet onInvite={onInvite} onClose={jest.fn()} />);
    await fireEvent.press(screen.getByText("Send invitation"));
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Email"), "not-an-email");
    await fireEvent.press(screen.getByText("Send invitation"));
    expect(onInvite).not.toHaveBeenCalled();
  });

  it("shows the server's error and lets the admin try again", async () => {
    const onInvite = jest
      .fn()
      .mockRejectedValueOnce(new Error("An account with that email already exists"))
      .mockResolvedValueOnce(undefined);
    await renderScreen(<InviteUserSheet onInvite={onInvite} onClose={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText("Email"), "sara@example.com");
    await fireEvent.press(screen.getByText("Send invitation"));
    await waitFor(() => expect(screen.getByText("An account with that email already exists")).toBeTruthy());
    await fireEvent.press(screen.getByText("Send invitation"));
    expect(onInvite).toHaveBeenCalledTimes(2);
  });
});
