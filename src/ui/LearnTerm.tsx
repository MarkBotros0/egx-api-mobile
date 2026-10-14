import { type ReactNode, useState } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "./AppText";
import { Sheet } from "./Sheet";

/** Mobile twin of the web LearnTooltip: dashed underline, tap opens the explanation. */
export function LearnTerm({
  term,
  explanation,
  children,
  className = "",
}: {
  term: string;
  explanation: string;
  children: ReactNode;
  /** Text style of the term itself, so it can match the labels around it. */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityHint={`Explains ${term}`}
        onPress={() => setOpen(true)}
        hitSlop={6}
        className="items-start active:opacity-70"
      >
        {/* Sized to the text, so the underline is as wide as the term — and
            the Pressable keeps whatever alignment its row gives it. */}
        <View>
          <AppText className={className}>{children}</AppText>
          <DashedUnderline />
        </View>
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)}>
        <AppText className="mb-1 font-mono-semibold text-xs text-accent">{term}</AppText>
        <AppText className="leading-5 text-white/70">{explanation}</AppText>
      </Sheet>
    </>
  );
}

/**
 * The web's `border-b border-dashed border-accent/40`. Android draws a dashed
 * border on ONE side as a solid line (it read as a heavy blue bar under every
 * term), so this draws a dashed box 2pt tall and clips all but its top edge.
 */
function DashedUnderline() {
  return (
    <View pointerEvents="none" style={{ height: 1, overflow: "hidden", marginTop: 1 }}>
      <View className="border-accent/40" style={{ height: 3, borderWidth: 1, borderStyle: "dashed", borderRadius: 1 }} />
    </View>
  );
}
