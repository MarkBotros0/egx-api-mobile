import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { AuthProvider } from "@/auth/AuthProvider";
import { LoginForm } from "@/features/auth/LoginForm";
import { fetchCalls, mockFetch } from "@/test-utils/fetch";

const renderForm = () =>
  render(
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );

describe("LoginForm", () => {
  it("sends a trimmed, lower-cased username like the web form", async () => {
    mockFetch("POST", "/auth/login", { access_token: "t", user: { id: "1", username: "alice", role: "user" } });
    await renderForm();
    await fireEvent.changeText(await screen.findByLabelText("Username"), "  Alice ");
    await fireEvent.changeText(screen.getByLabelText("Password"), "pw");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(fetchCalls()[0]?.body).toEqual({ username: "alice", password: "pw" }));
  });

  it("shows the backend's error", async () => {
    mockFetch("POST", "/auth/login", { detail: "Invalid username or password" }, 401);
    await renderForm();
    await fireEvent.changeText(await screen.findByLabelText("Username"), "alice");
    await fireEvent.changeText(screen.getByLabelText("Password"), "bad");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Invalid username or password")).toBeTruthy();
  });

  it("does not submit with an empty field", async () => {
    await renderForm();
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(fetchCalls()).toHaveLength(0);
  });
});
