/**
 * A stand-in for the real Sheet (a Modal): renders its children inline while
 * visible, plus a "Dismiss sheet" button that fires onClose (a swipe/back
 * dismiss). Use it with
 *   jest.mock("@/ui", () => ({ ...jest.requireActual("@/ui"), ...jest.requireActual("@/test-utils/sheetMock") }));
 */
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

export function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  return visible ? (
    <View>
      <Pressable accessibilityLabel="Dismiss sheet" onPress={onClose} />
      {children}
    </View>
  ) : null;
}
