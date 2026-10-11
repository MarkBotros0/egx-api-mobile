import { StyleSheet, type ViewStyle } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { Concept } from "@/shared/learn";
import { ConceptCard, FLASH_MS } from "../ConceptCard";

const CONCEPT: Concept = {
  id: "rsi",
  title: "RSI — Relative Strength Index",
  level: "start",
  definition: "A momentum oscillator.",
  whyItMatters: "Helps avoid buying peaks.",
  howToUse: "Check the RSI panel.",
  example: "RSI 75 on COMI.",
};

const base = { concept: CONCEPT, hue: "#2fd3c0", armed: false, flash: 0, reduceMotion: false };

describe("ConceptCard", () => {
  it("shows the level, title, body blocks and the worked example", async () => {
    await render(<ConceptCard {...base} read={false} onToggle={jest.fn()} />);
    expect(screen.getByText("start here")).toBeTruthy();
    expect(screen.getByText("RSI — Relative Strength Index")).toBeTruthy();
    expect(screen.getByText("Why it matters")).toBeTruthy();
    expect(screen.getByText("How to use it")).toBeTruthy();
    expect(screen.getByText("For example")).toBeTruthy();
    expect(screen.getByText("RSI 75 on COMI.")).toBeTruthy();
  });

  it("toggles read state by concept key, with an accessible checkbox", async () => {
    const onToggle = jest.fn();
    await render(<ConceptCard {...base} read={false} onToggle={onToggle} />);
    const box = screen.getByLabelText("Mark RSI — Relative Strength Index read");
    expect(box.props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent.press(box);
    expect(onToggle).toHaveBeenCalledWith("rsi");
  });

  it("offers 'unread' once read", async () => {
    await render(<ConceptCard {...base} read onToggle={jest.fn()} />);
    expect(screen.getByLabelText("Mark RSI — Relative Strength Index unread")).toBeTruthy();
  });

  it("rests VISIBLE: nothing about the card starts transparent", async () => {
    await render(<ConceptCard {...base} read={false} onToggle={jest.fn()} />);
    const card = screen.getByTestId("concept-rsi");
    expect(StyleSheet.flatten(card.props.style)?.opacity ?? 1).toBe(1);
    const transparent: unknown[] = [];
    const walk = (n: unknown): void => {
      if (!n || typeof n !== "object") return;
      if (Array.isArray(n)) return n.forEach(walk);
      const node = n as { props?: { style?: unknown }; children?: unknown };
      if (StyleSheet.flatten(node.props?.style as ViewStyle)?.opacity === 0) transparent.push(node);
      walk(node.children);
    };
    walk(screen.toJSON());
    expect(transparent).toHaveLength(0);
  });

  it("flashes when asked, then the ring goes away", async () => {
    jest.useFakeTimers();
    const view = await render(<ConceptCard {...base} flash={1} read={false} onToggle={jest.fn()} />);
    expect(screen.getByTestId("learn-flash")).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(FLASH_MS);
    });
    expect(screen.getByTestId("learn-flash")).toBeTruthy();
    await view.rerender(<ConceptCard {...base} flash={0} read={false} onToggle={jest.fn()} />);
    expect(screen.queryByTestId("learn-flash")).toBeNull();
    jest.useRealTimers();
  });

  it("does not flash under reduced motion", async () => {
    await render(<ConceptCard {...base} flash={1} reduceMotion read={false} onToggle={jest.fn()} />);
    expect(screen.queryByTestId("learn-flash")).toBeNull();
  });
});
