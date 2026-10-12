import { fireEvent, render, screen } from "@testing-library/react-native";

import { AuthProvider } from "@/auth/AuthProvider";
import { GoogleButton } from "@/features/auth/GoogleButton";
import { googleMock } from "@/test-utils/socialAuthMock";

// Kept in its own file: GoogleButton configures the module once per module registry,
// so this test needs the first (unconfigured) press for configure() to run and throw.
describe("GoogleButton", () => {
  it("reports the error, instead of throwing again from the catch, when the module fails to configure", async () => {
    const onError = jest.fn();
    googleMock.GoogleSignin.configure.mockImplementation(() => {
      throw new Error("Google sign-in is not available");
    });
    await render(
      <AuthProvider>
        <GoogleButton onError={onError} />
      </AuthProvider>
    );
    await fireEvent.press(screen.getByLabelText("Continue with Google"));
    await screen.findByLabelText("Continue with Google");
    expect(onError).toHaveBeenLastCalledWith("Google sign-in is not available");
    googleMock.GoogleSignin.configure.mockReset();
  });
});
