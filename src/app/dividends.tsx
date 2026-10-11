import { Stack } from "expo-router";
import { DividendCalendarScreen } from "@/features/market/DividendCalendarScreen";

export default function DividendsRoute() {
  return (
    <>
      <Stack.Screen options={{ title: "Dividend calendar" }} />
      <DividendCalendarScreen />
    </>
  );
}
