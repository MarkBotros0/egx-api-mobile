import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { renderWithProviders } from "@/test-utils/render";
import { learnHref } from "@/lib/links";
import { SIGNALS } from "@/features/portfolio/testing/fixtures";
import { AdvicePanel } from "../AdvicePanel";

describe("AdvicePanel", () => {
  it("starts collapsed with a count pill per severity", async () => {
    await renderWithProviders(<AdvicePanel signals={SIGNALS} />);
    expect(screen.getByText("1 urgent")).toBeTruthy();
    expect(screen.getByText("2 warnings")).toBeTruthy();
    expect(screen.getByText("1 note")).toBeTruthy();
    expect(screen.queryByText("COMI is close to its stop-loss")).toBeNull();
  });

  it("opens on tap, shows each signal, the disclaimer and learn links", async () => {
    const push = jest.spyOn(router, "push").mockImplementation(() => {});
    await renderWithProviders(<AdvicePanel signals={SIGNALS} />);
    await fireEvent.press(screen.getByText("Signals & Advice"));
    expect(screen.getByText("COMI is close to its stop-loss")).toBeTruthy();
    expect(screen.getByText(/educational analysis for learning purposes only/)).toBeTruthy();
    await fireEvent.press(screen.getAllByText("Learn more →")[0]);
    expect(push).toHaveBeenCalledWith(learnHref("stop_loss"));
    // The info signal has no learn_concept, so 3 links for 4 signals.
    expect(screen.getAllByText("Learn more →")).toHaveLength(3);
  });

  it("says so when there is nothing to show", async () => {
    await renderWithProviders(<AdvicePanel signals={[]} />);
    expect(screen.getByText("No signals or advice to show.")).toBeTruthy();
  });
});
