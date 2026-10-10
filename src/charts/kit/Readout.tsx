import { View } from "react-native";

import { AppText } from "@/ui";

export interface ReadoutRow {
  key: string;
  name: string;
  color: string;
  value: string;
}

/** The web's CustomTooltip, as a box pinned to the top corner away from the finger. */
export function Readout({
  title,
  rows,
  align,
}: {
  title: string;
  rows: readonly ReadoutRow[];
  align: "left" | "right";
}) {
  return (
    <View
      testID="chart-readout"
      style={{ pointerEvents: "none" }}
      className={`absolute top-0 rounded-lg border border-white/10 bg-charcoal-dark/95 p-3 ${align === "left" ? "left-2" : "right-2"}`}
    >
      <AppText className="mb-1 font-mono text-xs text-white/50">{title}</AppText>
      {rows.map((r) => (
        <AppText key={r.key} className="font-mono text-xs" style={{ color: r.color }}>
          {r.name}: {r.value}
        </AppText>
      ))}
    </View>
  );
}
