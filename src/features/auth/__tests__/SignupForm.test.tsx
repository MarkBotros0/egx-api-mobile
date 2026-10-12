import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { AuthProvider } from "@/auth/AuthProvider";
import { SignupForm } from "@/features/auth/SignupForm";
import { fetchCalls, mockFetch } from "@/test-utils/fetch";

const PASSWORD_LABEL = "Password (at least 8 characters)";

async function fill(email: string, password: string) {
  await render(
    <AuthProvider>
      <SignupForm />
    </AuthProvider>
  );
  await fireEvent.changeText(await screen.findByLabelText("Name"), "Mark");
  await fireEvent.changeText(screen.getByLabelText("Email"), email);
  await fireEvent.changeText(screen.getByLabelText(PASSWORD_LABEL), password);
  await fireEvent.press(screen.getByRole("button", { name: "Create account" }));
}

describe("SignupForm", () => {
  it("rejects an invalid email without a request", async () => {
    await fill("not-an-email", "longenough");
    expect(await screen.findByText("Enter a valid email address.")).toBeTruthy();
    expect(fetchCalls()).toHaveLength(0);
  });

  it("rejects a 7-character password without a request", async () => {
    await fill("mark@gmail.com", "1234567");
    expect(await screen.findByText("Use at least 8 characters for your password.")).toBeTruthy();
    expect(fetchCalls()).toHaveLength(0);
  });

  it("posts the trimmed details and tells the user to check their inbox", async () => {
    mockFetch("POST", "/auth/signup", { ok: true });
    await fill("  mark@gmail.com ", "longenough");
    expect(await screen.findByText("Check your inbox")).toBeTruthy();
    expect(screen.getByText(/mark@gmail\.com/)).toBeTruthy();
    expect(fetchCalls()[0]?.body).toEqual({ name: "Mark", email: "mark@gmail.com", password: "longenough" });
  });

  it("shows the server's error", async () => {
    mockFetch("POST", "/auth/signup", { detail: "Email is not configured" }, 503);
    await fill("mark@gmail.com", "longenough");
    expect(await screen.findByText("Email is not configured")).toBeTruthy();
    await waitFor(() => expect(screen.queryByText("Check your inbox")).toBeNull());
  });
});
