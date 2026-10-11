import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils/render";
import { TWO_LOT_ROWS } from "@/features/portfolio/testing/fixtures";
import { sellPositionFor } from "@/features/portfolio/logic/sale";
import { SellHoldingForm } from "../SellHoldingForm";

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

const position = sellPositionFor(TWO_LOT_ROWS, "COMI")!;

beforeEach(() => jest.useFakeTimers({ now: new Date(2026, 9, 10, 12, 0) }));
afterEach(() => jest.useRealTimers());

async function renderForm(props: Partial<Parameters<typeof SellHoldingForm>[0]> = {}) {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  await renderWithProviders(<SellHoldingForm position={position} onSubmit={onSubmit} onCancel={jest.fn()} {...props} />);
  return { onSubmit };
}

describe("SellHoldingForm", () => {
  it("states the position and pre-fills the whole of it", async () => {
    await renderForm();
    expect(screen.getByText("300 shares held across 2 purchases · average 42.40 EGP")).toBeTruthy();
    expect(screen.getByPlaceholderText("Shares to sell").props.value).toBe("300");
  });

  it("previews the FIFO split and sums the realized figure over the parts", async () => {
    await renderForm();
    await fireEvent.changeText(screen.getByPlaceholderText("Shares to sell"), "250");
    await fireEvent.changeText(screen.getByPlaceholderText("95.00"), "52");
    expect(screen.getByText("Sold oldest first, from 2 purchases")).toBeTruthy();
    expect(screen.getByText("200 × 41.00")).toBeTruthy();
    expect(screen.getByText("50 × 45.20")).toBeTruthy();
    expect(screen.getByText("+2,200")).toBeTruthy();
    expect(screen.getByText("+340")).toBeTruthy();
    expect(screen.getByText("+2,540 EGP")).toBeTruthy();
    expect(screen.getByText("(+24.28%)")).toBeTruthy();
  });

  it("submits the sale", async () => {
    const { onSubmit } = await renderForm();
    await fireEvent.changeText(screen.getByPlaceholderText("Shares to sell"), "250");
    await fireEvent.changeText(screen.getByPlaceholderText("95.00"), "52.125");
    await fireEvent.changeText(screen.getByPlaceholderText("Why did you sell?"), "trim");
    await fireEvent.press(screen.getByText("Record Sale"));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ quantity: 250, sell_price: 52.125, sell_date: "2026-10-10", notes: "trim" }),
    );
  });

  // Review Focus 2
  it("blocks a date that became too early when the quantity reached into the newer purchase", async () => {
    const { onSubmit } = await renderForm();
    await fireEvent.changeText(screen.getByPlaceholderText("Shares to sell"), "150");
    await fireEvent.changeText(screen.getByPlaceholderText("95.00"), "52");
    await fireEvent.press(screen.getByLabelText("Sell Date: 2026-10-10"));
    mockPickedDate = new Date(2026, 2, 1);
    await fireEvent.press(screen.getByText("set date"));
    expect(screen.queryByText(/This sale reaches a purchase made on/)).toBeNull();

    await fireEvent.changeText(screen.getByPlaceholderText("Shares to sell"), "250");
    expect(
      screen.getByText("This sale reaches a purchase made on 2026-06-01 — sell on or after that date"),
    ).toBeTruthy();
    await fireEvent.press(screen.getByText("Record Sale"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("is visibly not submittable until a sell price is entered", async () => {
    const { onSubmit } = await renderForm();
    expect(screen.getByText("Enter the shares and the sell price to record this sale")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Record Sale" })).toBeDisabled();
    await fireEvent.press(screen.getByText("Record Sale"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("refuses more shares than are held", async () => {
    await renderForm();
    await fireEvent.changeText(screen.getByPlaceholderText("Shares to sell"), "301");
    expect(screen.getByText("Enter between 1 and 300 shares")).toBeTruthy();
  });

  it("shows the backend's rejection inside the form and clears it on edit", async () => {
    const onDismissError = jest.fn();
    await renderForm({ error: "Insufficient shares", onDismissError });
    expect(screen.getByText("Insufficient shares")).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText("95.00"), "5");
    expect(onDismissError).toHaveBeenCalled();
  });
});
