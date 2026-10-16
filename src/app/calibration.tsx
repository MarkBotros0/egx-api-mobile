import { Stack, useLocalSearchParams } from "expo-router";
import { CalibrationScreen } from "@/features/calibration/CalibrationScreen";
import type { MarketCode } from "@/shared/markets";

export default function CalibrationRoute() {
  // `?market=` from a stock's forecast card: that stock's record, not the app's (unknown codes ignored).
  const params = useLocalSearchParams<{ market?: string }>();
  const linked = String(params.market ?? "").toUpperCase();
  const market: MarketCode | undefined = linked === "EG" || linked === "US" ? linked : undefined;
  return (
    <>
      <Stack.Screen options={{ title: "Checking our work" }} />
      <CalibrationScreen market={market} />
    </>
  );
}
