import { fireEvent, screen } from "@testing-library/react-native";
import { setPickedDate } from "@/test-utils/datePickerMock";
import { renderWithProviders } from "@/test-utils/render";
import { DateField } from "../DateField";

jest.mock("@react-native-community/datetimepicker", () => jest.requireActual("@/test-utils/datePickerMock"));

describe("DateField", () => {
  it("shows the date and reports the picked day as a local ISO date", async () => {
    const onChange = jest.fn();
    await renderWithProviders(<DateField label="Buy Date" value="2026-10-10" onChange={onChange} hint="Today by default" />);
    expect(screen.getByText("Today by default")).toBeTruthy();
    expect(screen.queryByText("set date")).toBeNull();
    await fireEvent.press(screen.getByLabelText("Buy Date: 2026-10-10"));
    setPickedDate(new Date(2026, 2, 1, 23, 30));
    await fireEvent.press(screen.getByText("set date"));
    expect(onChange).toHaveBeenCalledWith("2026-03-01");
    expect(screen.queryByText("set date")).toBeNull();
  });

  it("shows an error under the field", async () => {
    await renderWithProviders(<DateField label="Sell Date" value="2026-03-01" onChange={jest.fn()} error="Too early" />);
    expect(screen.getByText("Too early")).toBeTruthy();
  });
});
