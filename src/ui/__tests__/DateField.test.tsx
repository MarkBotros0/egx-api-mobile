import { fireEvent, screen } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils/render";
import { DateField } from "../DateField";

let mockPickedDate = new Date(2026, 2, 1);
jest.mock("@react-native-community/datetimepicker", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    __esModule: true,
    default: (props: { onChange: (e: { type: string }, d?: Date) => void }) =>
      React.createElement(
        Pressable,
        { onPress: () => props.onChange({ type: "set" }, mockPickedDate) },
        React.createElement(Text, null, "set date"),
      ),
  };
});

describe("DateField", () => {
  it("shows the date and reports the picked day as a local ISO date", async () => {
    const onChange = jest.fn();
    await renderWithProviders(<DateField label="Buy Date" value="2026-10-10" onChange={onChange} hint="Today by default" />);
    expect(screen.getByText("Today by default")).toBeTruthy();
    expect(screen.queryByText("set date")).toBeNull();
    await fireEvent.press(screen.getByLabelText("Buy Date: 2026-10-10"));
    mockPickedDate = new Date(2026, 2, 1, 23, 30);
    await fireEvent.press(screen.getByText("set date"));
    expect(onChange).toHaveBeenCalledWith("2026-03-01");
    expect(screen.queryByText("set date")).toBeNull();
  });

  it("shows an error under the field", async () => {
    await renderWithProviders(<DateField label="Sell Date" value="2026-03-01" onChange={jest.fn()} error="Too early" />);
    expect(screen.getByText("Too early")).toBeTruthy();
  });
});
