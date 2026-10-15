import { useMemo, useState } from "react";
import { View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { COLORS } from "@/shared/theme";
import type { StockOutcomeBand } from "@/shared/types";
import { AppText } from "@/ui";
import { coneGeometry } from "./logic/cone";
import { coarse } from "./logic/format";

const HEIGHT = 160;

/**
 * The outcome cone, drawn with react-native-svg (Plan 2 has no cone chart).
 * Centred on today's price; no median line — that would be a price target
 * with a direction attached. Width comes from onLayout.
 */
export function OutcomeCone({ data, symbol, currency }: { data: StockOutcomeBand; symbol: string; currency: string }) {
  const [width, setWidth] = useState(0);
  const geo = useMemo(() => coneGeometry(data, width, HEIGHT), [data, width]);
  if (!data.bands.length) return null;
  const inner = data.bands[0];
  const outer = data.bands[data.bands.length - 1];
  const { endpoint } = data;

  return (
    <View className="gap-2">
      <AppText className="text-[11px] leading-relaxed text-white/50">
        {`Over the next ${data.days} trading days, ${symbol} has historically ended between ${coarse(endpoint.lo)} and ${coarse(endpoint.hi)} ${currency} about ${endpoint.coverage_pct}% of the time — so roughly ${100 - endpoint.coverage_pct}% of the time it ended outside, about as often below as above.`}
      </AppText>

      <View className="flex-row" style={{ height: HEIGHT }}>
        <View className="w-11 justify-between py-0.5">
          {geo && (
            <>
              <AppText className="font-mono text-[9px] text-white/30">{coarse(geo.max)}</AppText>
              <AppText className="font-mono text-[9px] text-white/30">{coarse(geo.min)}</AppText>
            </>
          )}
        </View>
        <View testID="outcome-cone" className="flex-1" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {geo && (
            <Svg testID="cone-svg" width={width} height={HEIGHT}>
              <Path d={geo.outer} fill={COLORS.accent} fillOpacity={0.1} />
              <Path d={geo.inner} fill={COLORS.accent} fillOpacity={0.18} />
              <Line x1={0} x2={width} y1={geo.refY} y2={geo.refY} stroke="white" strokeOpacity={0.3} strokeDasharray="3 3" />
            </Svg>
          )}
        </View>
      </View>

      <View className="flex-row justify-between pl-11">
        <AppText className="text-[9px] text-white/25">Today</AppText>
        <AppText className="text-[9px] text-white/25">{`Day +${data.days}`}</AppText>
      </View>

      <View className="flex-row items-center justify-center gap-4">
        <View className="flex-row items-center gap-1.5">
          <View className="h-2 w-3 rounded-sm bg-accent/30" />
          <AppText className="text-[9px] text-white/35">{`${inner.coverage_pct}% of outcomes`}</AppText>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-2 w-3 rounded-sm bg-accent/10" />
          <AppText className="text-[9px] text-white/35">{`${outer.coverage_pct}% of outcomes`}</AppText>
        </View>
      </View>
    </View>
  );
}
