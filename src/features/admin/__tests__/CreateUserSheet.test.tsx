import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderScreen } from "@/test-utils/renderScreen";
import { CreateUserSheet } from "../CreateUserSheet";

jest.mock("@/ui", () => {
  const actual = jest.requireActual("@/ui");
  return {
    ...actual,
    ...jest.requireActual("@/test-utils/sheetMock"),
  };
});

describe("CreateUserSheet", () => {
  it("creates with a trimmed, lower-cased username and a generated password", async () => {
    const onCreate = jest.fn().mockResolvedValue(undefined);
    await renderScreen(<CreateUserSheet onCreate={onCreate} onClose={jest.fn()} />);
    expect(screen.getByText("A strong password will be generated and shown to you once.")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Username"), "  Sara.B ");
    await fireEvent.press(screen.getByText("Create user"));
    expect(onCreate).toHaveBeenCalledWith("sara.b", undefined);
  });

  it("validates before calling the server", async () => {
    const onCreate = jest.fn();
    await renderScreen(<CreateUserSheet onCreate={onCreate} onClose={jest.fn()} />);
    await fireEvent.press(screen.getByText("Create user"));
    expect(screen.getByText("Enter a username.")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Username"), "sara");
    await fireEvent(screen.getByLabelText("Set the password myself"), "valueChange", true);
    await fireEvent.changeText(screen.getByLabelText("Password"), "short");
    await fireEvent.press(screen.getByText("Create user"));
    expect(screen.getByText("The password needs at least 8 characters.")).toBeTruthy();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("sends a chosen password", async () => {
    const onCreate = jest.fn().mockResolvedValue(undefined);
    await renderScreen(<CreateUserSheet onCreate={onCreate} onClose={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText("Username"), "sara");
    await fireEvent(screen.getByLabelText("Set the password myself"), "valueChange", true);
    await fireEvent.changeText(screen.getByLabelText("Password"), "agreed-pass-1");
    await fireEvent.press(screen.getByText("Create user"));
    expect(onCreate).toHaveBeenCalledWith("sara", "agreed-pass-1");
  });

  it("shows the server's error and lets the admin try again", async () => {
    const onCreate = jest.fn().mockRejectedValueOnce(new Error("Username already exists")).mockResolvedValueOnce(undefined);
    await renderScreen(<CreateUserSheet onCreate={onCreate} onClose={jest.fn()} />);
    await fireEvent.changeText(screen.getByLabelText("Username"), "sara");
    await fireEvent.press(screen.getByText("Create user"));
    await waitFor(() => expect(screen.getByText("Username already exists")).toBeTruthy());
    await fireEvent.press(screen.getByText("Create user"));
    expect(onCreate).toHaveBeenCalledTimes(2);
  });
});
