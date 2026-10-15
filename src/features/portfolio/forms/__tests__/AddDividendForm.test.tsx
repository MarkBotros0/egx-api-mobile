import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test-utils/render";
import { LOT_A, LOT_B, sale } from "@/features/portfolio/testing/fixtures";
import { dividendSymbolOptions } from "@/features/portfolio/logic/dividend";
import { AddDividendForm } from "../AddDividendForm";

const options = dividendSymbolOptions([sale()], [LOT_A, LOT_B]);

beforeEach(() => jest.useFakeTimers({ now: new Date(2026, 9, 10, 12, 0) }));
afterEach(() => jest.useRealTimers());

async function renderForm(props: Partial<Parameters<typeof AddDividendForm>[0]> = {}) {
  const onSubmit = props.onSubmit ?? jest.fn().mockResolvedValue(undefined);
  await renderWithProviders(
    <AddDividendForm symbols={options} presetSymbol="COMI" currency="EGP" onSubmit={onSubmit} onCancel={jest.fn()} {...props} />,
  );
  return { onSubmit };
}

describe("AddDividendForm", () => {
  it("pre-fills shares from the open position and clears them for a sold-out stock", async () => {
    await renderForm();
    expect(screen.getByPlaceholderText("500").props.value).toBe("300");
    await fireEvent.press(screen.getByText("ETEL"));
    expect(screen.getByPlaceholderText("500").props.value).toBe("");
  });

  it("records the net amount to three decimals and shows the per-share figure", async () => {
    const { onSubmit } = await renderForm();
    await fireEvent.changeText(screen.getByPlaceholderText("1200.00"), "1234.567");
    expect(screen.getByText("4.12 EGP per share")).toBeTruthy();
    await fireEvent.press(screen.getByText("Record Dividend"));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        symbol: "COMI", name: "Commercial International Bank", sector: "Banking",
        amount: 1234.567, pay_date: "2026-10-10", shares: 300, notes: "",
      }),
    );
  });

  // Review Focus 3
  it("sends ONE request when the button is tapped twice", async () => {
    // Firing two presses in one act() is the only way to land both taps before React re-renders;
    // RNTL's async fireEvent opens its own act, so React reports the (expected) overlap.
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    let resolve!: () => void;
    const onSubmit = jest.fn(() => new Promise<void>((r) => (resolve = r)));
    await renderForm({ onSubmit });
    await fireEvent.changeText(screen.getByPlaceholderText("1200.00"), "1200");
    const button = screen.getByText("Record Dividend");
    // Both taps land before the re-render, like a fast double tap: only the in-flight guard stops the second.
    await act(async () => {
      fireEvent.press(button);
      fireEvent.press(button);
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const unexpected = consoleError.mock.calls.filter((c) => !String(c[0]).includes("overlapping act() calls"));
    expect(unexpected).toEqual([]);
    consoleError.mockRestore();
    await act(async () => resolve());
  });

  it("blocks submit and says why while the form is empty", async () => {
    const { onSubmit } = await renderForm();
    expect(screen.getByText("Pick a stock and enter the amount received to record this dividend")).toBeTruthy();
    await fireEvent.press(screen.getByText("Record Dividend"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("refuses fractional shares", async () => {
    const { onSubmit } = await renderForm();
    await fireEvent.changeText(screen.getByPlaceholderText("1200.00"), "1200");
    await fireEvent.changeText(screen.getByPlaceholderText("500"), "5.7");
    expect(screen.getByText("Enter a whole number of shares")).toBeTruthy();
    await fireEvent.press(screen.getByText("Record Dividend"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the duplicate (409) message inside the form and clears it on the next edit", async () => {
    const onDismissError = jest.fn();
    const message = "You already recorded a dividend of 1200.00 EGP for COMI on 2026-10-10.";
    await renderForm({ error: message, onDismissError });
    expect(screen.getByText(message)).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText("1200.00"), "1201");
    expect(onDismissError).toHaveBeenCalled();
  });
});
