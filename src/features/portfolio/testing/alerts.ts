/**
 * `confirm()` from @/ui wraps Alert.alert. These answer the next dialog the
 * way a user would, and return the spy so a test can read the message shown.
 */
import { Alert, type AlertButton } from "react-native";

export function autoConfirm(label: string) {
  return jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons?: AlertButton[]) => {
    buttons?.find((b) => b.text === label)?.onPress?.();
  });
}

export function autoCancel() {
  return jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons?: AlertButton[]) => {
    buttons?.find((b) => b.style === "cancel")?.onPress?.();
  });
}
