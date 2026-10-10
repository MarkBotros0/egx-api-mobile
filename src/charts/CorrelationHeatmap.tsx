import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import type { CorrelationMatrix } from "@/shared/types";
import { AppText } from "@/ui";

import { finiteOrNull } from "./kit/scales";

export interface CorrelationHeatmapProps {
  data: CorrelationMatrix;
}

export interface CorrelationPair {
  a: string;
  b: string;
  corr: number;
}

export function correlationPairs({ symbols, matrix }: CorrelationMatrix): {
  high: CorrelationPair[];
  low: CorrelationPair[];
} {
  const high: CorrelationPair[] = [];
  const low: CorrelationPair[] = [];
  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const c = finiteOrNull(matrix[i]?.[j]);
      if (c === null) continue;
      if (c > 0.7) high.push({ a: symbols[i], b: symbols[j], corr: c });
      else if (c < -0.3) low.push({ a: symbols[i], b: symbols[j], corr: c });
    }
  }
  return { high, low };
}

/** Web getCellColor. Whole class strings so NativeWind can find them. */
export function cellColorClass(value: number): string {
  if (!Number.isFinite(value)) return "bg-white/5";
  if (value >= 0.7) return "bg-red-500/60";
  if (value >= 0.4) return "bg-red-500/30";
  if (value >= 0.1) return "bg-red-500/10";
  if (value >= -0.1) return "bg-white/5";
  if (value >= -0.4) return "bg-blue-500/20";
  return "bg-blue-500/40";
}

/** Web getTextColor. */
export function cellTextClass(value: number): string {
  if (value >= 0.7) return "text-white";
  if (value >= 0.4) return "text-white/80";
  return "text-white/60";
}

const CELL = 52;
const ROW_HEAD = 64;

function PairRow({ pair, tone }: { pair: CorrelationPair; tone: "gain" | "loss" }) {
  return (
    <View
      className={`mb-1 flex-row items-center justify-between rounded-lg px-3 py-2 ${tone === "loss" ? "bg-loss/5" : "bg-gain/5"}`}
    >
      <AppText className="text-xs text-white/70">
        {pair.a} & {pair.b}
      </AppText>
      <AppText className={`font-mono text-xs ${tone === "loss" ? "text-loss" : "text-gain"}`}>
        {pair.corr.toFixed(2)}
      </AppText>
    </View>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1">
      <View className={`h-2.5 w-2.5 rounded ${className}`} />
      <AppText className="text-[9px] text-white/30">{label}</AppText>
    </View>
  );
}

function MatrixGrid({ symbols, matrix }: CorrelationMatrix) {
  return (
    <View testID="correlation-grid" className="mt-2">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View className="flex-row">
            <View style={{ width: ROW_HEAD }} />
            {symbols.map((s) => (
              <View key={`h-${s}`} style={{ width: CELL }} className="px-1 py-1">
                <AppText numberOfLines={1} className="text-center font-sans-medium text-[10px] text-white/50">
                  {s}
                </AppText>
              </View>
            ))}
          </View>
          {symbols.map((rowSym, i) => (
            <View key={`r-${rowSym}`} className="flex-row">
              <View style={{ width: ROW_HEAD }} className="justify-center px-2">
                <AppText numberOfLines={1} className="font-sans-medium text-xs text-white/50">
                  {rowSym}
                </AppText>
              </View>
              {symbols.map((_, j) => {
                const finite = finiteOrNull(matrix[i]?.[j]);
                const val = finite ?? NaN;
                const text = i === j ? "1.0" : finite !== null ? finite.toFixed(2) : "--";
                return (
                  <View
                    key={`c-${i}-${j}`}
                    style={{ width: CELL - 4 }}
                    className={`m-0.5 items-center justify-center rounded p-2 ${cellColorClass(val)}`}
                  >
                    <AppText className={`font-mono text-[11px] ${cellTextClass(val)}`}>{text}</AppText>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      <View className="mt-3 flex-row items-center justify-center gap-2">
        <LegendSwatch className="bg-blue-500/40" label="Negative" />
        <LegendSwatch className="bg-white/5" label="Low" />
        <LegendSwatch className="bg-red-500/30" label="Moderate" />
        <LegendSwatch className="bg-red-500/60" label="High" />
      </View>
    </View>
  );
}

export function CorrelationHeatmap({ data }: CorrelationHeatmapProps) {
  const [showGrid, setShowGrid] = useState(false);
  const { high, low } = useMemo(() => correlationPairs(data), [data]);
  if (data.symbols.length < 2) return null;

  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
      <AppText className="mb-4 font-sans-semibold text-lg text-white">Correlation Matrix</AppText>

      <View className="gap-3">
        {high.length > 0 ? (
          <View>
            <AppText className="mb-1.5 font-sans-medium text-xs text-loss/70">Highly Correlated (risk)</AppText>
            {high.map((p) => (
              <PairRow key={`${p.a}-${p.b}`} pair={p} tone="loss" />
            ))}
          </View>
        ) : null}
        {low.length > 0 ? (
          <View>
            <AppText className="mb-1.5 font-sans-medium text-xs text-gain/70">Well Diversified</AppText>
            {low.map((p) => (
              <PairRow key={`${p.a}-${p.b}`} pair={p} tone="gain" />
            ))}
          </View>
        ) : null}
        {high.length === 0 && low.length === 0 ? (
          <AppText className="text-xs text-white/40">No notable correlation patterns detected.</AppText>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showGrid }}
        onPress={() => setShowGrid((v) => !v)}
        className="mt-4 min-h-[44px] justify-center self-start"
      >
        <AppText className="text-xs text-accent">{showGrid ? "Hide full matrix" : "Show full matrix"}</AppText>
      </Pressable>
      {showGrid ? <MatrixGrid symbols={data.symbols} matrix={data.matrix} /> : null}
    </View>
  );
}
