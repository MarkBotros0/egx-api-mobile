import { fireEvent, render, screen } from "@testing-library/react-native";

import { SegmentedControl } from "../SegmentedControl";

const OPTIONS = [
  { value: "a", label: "Off" },
  { value: "b", label: "5" },
];

it("labels segments with the prefix when given", async () => {
  const onChange = jest.fn();
  await render(<SegmentedControl options={OPTIONS} value="a" onChange={onChange} accessibilityLabelPrefix="Rises by" />);
  await fireEvent.press(screen.getByLabelText("Rises by 5"));
  expect(onChange).toHaveBeenCalledWith("b");
  expect(screen.getByLabelText("Rises by Off").props.accessibilityState.selected).toBe(true);
});

it("uses the bare label without a prefix", async () => {
  await render(<SegmentedControl options={OPTIONS} value="a" onChange={() => {}} />);
  expect(screen.getByLabelText("5")).toBeTruthy();
});
