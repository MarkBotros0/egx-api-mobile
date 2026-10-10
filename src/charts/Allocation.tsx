import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { arc, pie, type PieArcDatum } from "d3-shape";
import Svg, { G, Path } from "react-native-svg";

import { AppText } from "@/ui";

/** The web PortfolioSummary's PIE_COLORS, in order. */
export const ALLOCATION_COLORS = [
  "#4488ff", "#00ff88", "#ff3355", "#ffaa00", "#cc00ff",
  "#00ccff", "#ff6600", "#88ff00", "#ff00aa", "#aabb00",
] as const;

export interface AllocationSlice {
  name: string;
  value: number;
  color: string;
}

export interface AllocationProps {
  /** Sector → percent of portfolio (PortfolioMetrics.sector_allocation). */
  allocation: Record<string, number>;
}

export function allocationSlices(allocation: Record<string, number>): AllocationSlice[] {
  return Object.entries(allocation).map(([name, value], i) => ({
    name,
    value: Number.isFinite(value) ? value : 0,
    color: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length],
  }));
}

/** Web donut: innerRadius 30, outerRadius 60 in a 160 box — scaled to `size`. */
export function donutArcs(slices: readonly AllocationSlice[], size: number): { slice: AllocationSlice; d: string }[] {
  const gen = arc<PieArcDatum<AllocationSlice>>()
    .innerRadius((size * 30) / 160)
    .outerRadius((size * 60) / 160);
  return pie<AllocationSlice>()
    .sort(null)
    .value((s) => Math.max(0, s.value))([...slices])
    .filter((a) => a.endAngle > a.startAngle)
    .map((a) => ({ slice: a.data, d: gen(a) ?? "" }))
    .filter((a) => a.d !== "");
}

/** The web's MOBILE branch: a 16pt stacked bar and a wrapped legend. */
export function AllocationBar({ allocation }: AllocationProps) {
  const slices = useMemo(() => allocationSlices(allocation), [allocation]);
  if (!slices.length) return null;
  return (
    <View testID="allocation-bar">
      <View className="mb-3 h-4 flex-row overflow-hidden rounded-full">
        {slices.map((s) => (
          <View
            key={s.name}
            className="h-full"
            style={{
              width: `${s.value}%` as `${number}%`,
              backgroundColor: s.color,
              minWidth: s.value > 0 ? 4 : 0,
            }}
          />
        ))}
      </View>
      <View className="flex-row flex-wrap gap-x-4 gap-y-1.5">
        {slices.map((s) => (
          <View key={s.name} className="flex-row items-center gap-1.5">
            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            <AppText className="text-xs text-white/50">
              {s.name} ({s.value.toFixed(0)}%)
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

/** The web's DESKTOP branch: a donut. Tap a slice or legend item to read its share. */
export function AllocationDonut({ allocation, size = 160 }: AllocationProps & { size?: number }) {
  const slices = useMemo(() => allocationSlices(allocation), [allocation]);
  const arcs = useMemo(() => donutArcs(slices, size), [slices, size]);
  const [selected, setSelected] = useState<string | null>(null);
  if (!slices.length) return null;

  const sel = slices.find((s) => s.name === selected) ?? null;
  const toggle = (name: string) => setSelected((prev) => (prev === name ? null : name));

  return (
    <View testID="allocation-donut" className="items-center gap-3">
      <Svg width={size} height={size}>
        <G transform={`translate(${size / 2} ${size / 2})`}>
          {arcs.map((a) => (
            <Path
              key={a.slice.name}
              d={a.d}
              fill={a.slice.color}
              opacity={sel && sel.name !== a.slice.name ? 0.35 : 1}
              onPress={() => toggle(a.slice.name)}
            />
          ))}
        </G>
      </Svg>
      {sel ? (
        <AppText testID="allocation-readout" className="font-mono text-xs text-white">
          {sel.name}: {sel.value.toFixed(1)}%
        </AppText>
      ) : null}
      <View className="flex-row flex-wrap justify-center gap-x-2">
        {slices.map((s) => (
          <Pressable
            key={s.name}
            accessibilityRole="button"
            accessibilityState={{ selected: s.name === selected }}
            onPress={() => toggle(s.name)}
            className="min-h-[44px] flex-row items-center gap-1.5 px-1"
          >
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
            <AppText className="text-[10px] text-white/50">
              {s.name} ({s.value.toFixed(0)}%)
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
