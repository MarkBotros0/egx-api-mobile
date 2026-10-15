import { fireEvent, screen } from "@testing-library/react-native";

type Node = { children?: (Node | string)[] | null } | string | null;

/** Every string the screen renders, joined: what a reader could see. */
export function renderedText(): string {
  const out: string[] = [];
  const walk = (n: Node | Node[]) => {
    if (n == null) return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (typeof n === "string") return void out.push(n);
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON() as Node | Node[]);
  return out.join(" ");
}

/** Opens every LearnTerm explanation on screen, so its text is rendered too. */
export async function openAllExplanations(): Promise<number> {
  const terms = screen.queryAllByHintText(/^Explains /);
  for (const t of terms) await fireEvent.press(t);
  return terms.length;
}

/** Egyptian facts that must not appear on another market's screen. */
export const EG_WORDING = /EGX|EGP|Egypt|19%/;
