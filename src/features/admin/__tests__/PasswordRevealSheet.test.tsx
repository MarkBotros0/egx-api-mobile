import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderScreen } from "@/test-utils/renderScreen";
import * as Clipboard from "expo-clipboard";
import { confirm } from "@/ui";
import { PasswordRevealSheet } from "../PasswordRevealSheet";

jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));
jest.mock("@/ui", () => {
  const actual = jest.requireActual("@/ui");
  return {
    ...actual,
    confirm: jest.fn(),
    ...jest.requireActual("@/test-utils/sheetMock"),
  };
});
const confirmMock = confirm as jest.MockedFunction<typeof confirm>;

const props = { username: "sara.b", password: "Xk7mPq2vRt9wZs4n", appUrl: "https://egx.example" };

beforeEach(() => jest.clearAllMocks());

describe("PasswordRevealSheet", () => {
  it("shows link, username and password, and says it is shown once", async () => {
    await renderScreen(<PasswordRevealSheet {...props} onClose={jest.fn()} />);
    expect(screen.getByText("https://egx.example")).toBeTruthy();
    expect(screen.getByText("sara.b")).toBeTruthy();
    expect(screen.getByText("Xk7mPq2vRt9wZs4n")).toBeTruthy();
    expect(screen.getByText(/the password cannot be shown again/)).toBeTruthy();
  });

  it("copies the whole block as one message", async () => {
    await renderScreen(<PasswordRevealSheet {...props} onClose={jest.fn()} />);
    await fireEvent.press(screen.getByText("Copy link, username & password"));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(
      "Link: https://egx.example\nUsername: sara.b\nPassword: Xk7mPq2vRt9wZs4n"
    );
    await waitFor(() => expect(screen.getByText("Copied")).toBeTruthy());
  });

  it("copies the bare password for the WhatsApp case", async () => {
    await renderScreen(<PasswordRevealSheet {...props} onClose={jest.fn()} />);
    await fireEvent.press(screen.getByText("Copy password only"));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith("Xk7mPq2vRt9wZs4n");
  });

  it("warns when no app link is configured", async () => {
    await renderScreen(<PasswordRevealSheet {...props} appUrl="" onClose={jest.fn()} />);
    expect(screen.getByText(/No app link is configured/)).toBeTruthy();
  });

  it("asks before a swipe/back dismiss throws away an uncopied password", async () => {
    const onClose = jest.fn();
    confirmMock.mockResolvedValueOnce(false);
    await renderScreen(<PasswordRevealSheet {...props} onClose={onClose} />);
    await fireEvent.press(screen.getByLabelText("Dismiss sheet"));
    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it("Done always closes", async () => {
    const onClose = jest.fn();
    await renderScreen(<PasswordRevealSheet {...props} onClose={onClose} />);
    await fireEvent.press(screen.getByText("Done"));
    expect(onClose).toHaveBeenCalled();
  });
});
