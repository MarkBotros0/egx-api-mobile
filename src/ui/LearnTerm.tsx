import { type ReactNode, useState } from "react";
import { Pressable } from "react-native";

import { AppText } from "./AppText";
import { Sheet } from "./Sheet";

/** Mobile twin of the web LearnTooltip: dashed underline, tap opens the explanation. */
export function LearnTerm({ term, explanation, children }: { term: string; explanation: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityHint={`Explains ${term}`} onPress={() => setOpen(true)} hitSlop={6}>
        <AppText className="border-b border-dashed border-accent/40">{children}</AppText>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)}>
        <AppText className="mb-1 font-mono-semibold text-xs text-accent">{term}</AppText>
        <AppText className="leading-5 text-white/70">{explanation}</AppText>
      </Sheet>
    </>
  );
}
