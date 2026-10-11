/**
 * A stand-in for the real Sheet (a Modal): renders its children inline while
 * visible, plus a "Dismiss sheet" button that fires onClose (a swipe/back
 * dismiss). Use it with
 *   jest.mock("@/ui", () => ({ ...jest.requireActual("@/ui"), ...jest.requireActual("@/test-utils/sheetMock") }));
 */
import { useEffect, type ReactNode } from "react";
import { Pressable, View } from "react-native";

const dismissHandler: { current?: () => void } = {};
/** Simulate the Modal finishing its dismiss animation (iOS onDismiss). */
export function finishDismiss() {
  dismissHandler.current?.();
}

export function Sheet({
  visible,
  onClose,
  onDismiss,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  children: ReactNode;
}) {
  // The real Modal fires onDismiss only after its dismiss animation, so
  // tests drive it by hand: finishDismiss() calls the latest onDismiss prop.
  useEffect(() => {
    dismissHandler.current = onDismiss;
  });
  return visible ? (
    <View>
      <Pressable accessibilityLabel="Dismiss sheet" onPress={onClose} />
      {children}
    </View>
  ) : null;
}
