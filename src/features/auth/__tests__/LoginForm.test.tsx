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

const USER = { id: "1", email: "mark@gmail.com", name: "Mark", role: "user" };

describe("LoginForm", () => {
  it("sends a trimmed email, not lower-cased (the backend normalises)", async () => {
    mockFetch("POST", "/auth/login", { access_token: "t", user: USER });
    await renderForm();
    await fireEvent.changeText(await screen.findByLabelText("Email"), "  mark@gmail.com ");
    await fireEvent.changeText(screen.getByLabelText("Password"), "pw");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(fetchCalls()[0]?.body).toEqual({ email: "mark@gmail.com", password: "pw" }));
  });

  it("keeps the email's case as typed", async () => {
    mockFetch("POST", "/auth/login", { access_token: "t", user: USER });
    await renderForm();
    await fireEvent.changeText(await screen.findByLabelText("Email"), "Mark@Gmail.com");
    await fireEvent.changeText(screen.getByLabelText("Password"), "pw");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(fetchCalls()[0]?.body).toEqual({ email: "Mark@Gmail.com", password: "pw" }));
  });

  it("shows the backend's error", async () => {
    mockFetch("POST", "/auth/login", { detail: "Invalid email or password" }, 401);
    await renderForm();
    await fireEvent.changeText(await screen.findByLabelText("Email"), "mark@gmail.com");
    await fireEvent.changeText(screen.getByLabelText("Password"), "bad");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Invalid email or password")).toBeTruthy();
  });

  it("offers to resend the link when the email is not confirmed yet", async () => {
    mockFetch("POST", "/auth/login", { detail: "email_not_verified" }, 403);
    mockFetch("POST", "/auth/resend-verification", { ok: true });
    await renderForm();
    await fireEvent.changeText(await screen.findByLabelText("Email"), "mark@gmail.com");
    await fireEvent.changeText(screen.getByLabelText("Password"), "pw");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText(/Confirm your email first/)).toBeTruthy();
    await fireEvent.press(screen.getByText("Resend the link"));
    expect(await screen.findByText("If it doesn't arrive in a minute, check spam or try again.")).toBeTruthy();
    expect(screen.queryByText("Sent again.")).toBeNull();
    const resend = fetchCalls().find((c) => c.url.endsWith("/auth/resend-verification"));
    expect(resend?.body).toEqual({ email: "mark@gmail.com" });
  });

  it("shows the error and keeps Resend available when resending fails", async () => {
    mockFetch("POST", "/auth/login", { detail: "email_not_verified" }, 403);
    mockFetch("POST", "/auth/resend-verification", { detail: "Email is not configured" }, 503);
    await renderForm();
    await fireEvent.changeText(await screen.findByLabelText("Email"), "mark@gmail.com");
    await fireEvent.changeText(screen.getByLabelText("Password"), "pw");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    await fireEvent.press(await screen.findByText("Resend the link"));
    expect(await screen.findByText("Email is not configured")).toBeTruthy();
    expect(screen.queryByText(/check spam/)).toBeNull();
    expect(screen.getByText("Resend the link")).toBeTruthy();
  });

  it("clears the unverified panel when the email is edited", async () => {
    mockFetch("POST", "/auth/login", { detail: "email_not_verified" }, 403);
    await renderForm();
    await fireEvent.changeText(await screen.findByLabelText("Email"), "mark@gmail.com");
    await fireEvent.changeText(screen.getByLabelText("Password"), "pw");
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText(/Confirm your email first/)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Email"), "other@gmail.com");
    expect(screen.queryByText(/we sent a link to/)).toBeNull();
    expect(screen.queryByText("Resend the link")).toBeNull();
  });

  it("does not submit with an empty field", async () => {
    await renderForm();
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(fetchCalls()).toHaveLength(0);
  });
});
