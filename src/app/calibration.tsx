import { Stack } from "expo-router";
import { CalibrationScreen } from "@/features/calibration/CalibrationScreen";

export default function CalibrationRoute() {
  return (
    <>
      <Stack.Screen options={{ title: "Checking our work" }} />
      <CalibrationScreen />
    </>
  );
}
