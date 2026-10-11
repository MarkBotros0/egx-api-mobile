/**
 * A stand-in for @react-native-community/datetimepicker: a "set date" button
 * that reports whatever setPickedDate() last chose. Use it with
 *   jest.mock("@react-native-community/datetimepicker", () => jest.requireActual("@/test-utils/datePickerMock"));
 */
import { Pressable, Text } from "react-native";

let picked = new Date(2026, 2, 1);

export function setPickedDate(d: Date): void {
  picked = d;
}

export default function DateTimePickerMock(props: { onChange: (e: { type: string }, d?: Date) => void }) {
  return (
    <Pressable onPress={() => props.onChange({ type: "set" }, picked)}>
      <Text>set date</Text>
    </Pressable>
  );
}
