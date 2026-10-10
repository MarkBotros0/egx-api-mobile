import { Stack } from "expo-router";
import { CompareScreen } from "@/features/market/CompareScreen";

export default function CompareRoute() {
  return (
    <>
      <Stack.Screen options={{ title: "Compare Stocks" }} />
      <CompareScreen />
    </>
  );
}
