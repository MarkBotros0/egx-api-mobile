import { fireEvent, render, screen } from "@testing-library/react-native";
import { Alert } from "react-native";

import { TestSafeArea } from "@/test-utils/safeArea";
import { Button, confirm, ErrorState, LearnTerm, Pill, SegmentedControl, TextField } from "@/ui";

describe("UI kit", () => {
  it("Button fires onPress and is inert while loading or disabled", async () => {
    const onPress = jest.fn();
    const { rerender } = await render(<Button label="Sign in" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));
    expect(onPress).toHaveBeenCalledTimes(1);

    await rerender(<Button label="Sign in" onPress={onPress} loading />);
    await fireEvent.press(screen.getByRole("button"));
    await rerender(<Button label="Sign in" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("TextField labels its input and shows an error", async () => {
    await render(<TextField label="Username" value="" onChangeText={() => {}} error="Required" />);
    expect(screen.getByLabelText("Username")).toBeTruthy();
    expect(screen.getByText("Required")).toBeTruthy();
  });

  it("LearnTerm opens its explanation on tap and closes it", async () => {
    await render(
      <LearnTerm term="RSI" explanation="Relative Strength Index, 0-100.">
        RSI 14
      </LearnTerm>,
      { wrapper: TestSafeArea }
    );
    expect(screen.queryByText("Relative Strength Index, 0-100.")).toBeNull();
    await fireEvent.press(screen.getByText("RSI 14"));
    expect(screen.getByText("Relative Strength Index, 0-100.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("Relative Strength Index, 0-100.")).toBeNull();
  });

  it("Pill reports selection state to accessibility", async () => {
    await render(<Pill label="EGX30" active onPress={() => {}} />);
    expect(screen.getByRole("button", { name: "EGX30" })).toBeSelected();
  });

  it("SegmentedControl emits the chosen value", async () => {
    const onChange = jest.fn();
    await render(
      <SegmentedControl
        options={[
          { value: "Daily", label: "Daily" },
          { value: "Weekly", label: "Weekly" },
        ]}
        value="Daily"
        onChange={onChange}
      />
    );
    await fireEvent.press(screen.getByRole("button", { name: "Weekly" }));
    expect(onChange).toHaveBeenCalledWith("Weekly");
  });

  it("ErrorState offers a retry", async () => {
    const onRetry = jest.fn();
    await render(<ErrorState message="Request failed: 500" onRetry={onRetry} />);
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("confirm resolves true only on the confirm action", async () => {
    const spy = jest.spyOn(Alert, "alert").mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.text === "Delete")?.onPress?.();
    });
    await expect(confirm({ title: "Delete?", message: "Cannot be undone", confirmLabel: "Delete", destructive: true })).resolves.toBe(true);
    spy.mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.style === "cancel")?.onPress?.();
    });
    await expect(confirm({ title: "Delete?", message: "x", confirmLabel: "Delete" })).resolves.toBe(false);
    spy.mockRestore();
  });
});
