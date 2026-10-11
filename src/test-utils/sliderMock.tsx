/**
 * A stand-in for @react-native-community/slider: a View that keeps its props so
 * tests can fire `valueChange` at the handler. Use it with
 *   jest.mock("@react-native-community/slider", () => jest.requireActual("@/test-utils/sliderMock"));
 */
import { View } from "react-native";

export default function SliderMock(props: object) {
  return <View {...props} />;
}
