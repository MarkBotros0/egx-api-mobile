import { fireEvent, render, screen } from "@testing-library/react-native";

import { AuthProvider } from "@/auth/AuthProvider";
import { ForgotPasswordForm } from "@/features/auth/ForgotPasswordForm";
import { fetchCalls, mockFetch } from "@/test-utils/fetch";

async function submit(email: string) {
  await render(
    <AuthProvider>
      <ForgotPasswordForm />
    </AuthProvider>
  );
  await fireEvent.changeText(await screen.findByLabelText("Email"), email);
  await fireEvent.press(screen.getByRole("button", { name: "Send reset link" }));
}

describe("ForgotPasswordForm", () => {
  it("posts the email and shows the neutral confirmation", async () => {
    mockFetch("POST", "/auth/forgot-password", { ok: true });
    await submit(" mark@gmail.com ");
    expect(await screen.findByText(/If an account exists for mark@gmail\.com, a reset link is on its way\./)).toBeTruthy();
    expect(fetchCalls()[0]?.body).toEqual({ email: "mark@gmail.com" });
  });

  it("rejects an invalid email without a request", async () => {
    await submit("nope");
    expect(await screen.findByText("Enter a valid email address.")).toBeTruthy();
    expect(fetchCalls()).toHaveLength(0);
  });
});
