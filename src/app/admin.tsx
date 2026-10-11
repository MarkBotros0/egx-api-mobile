import { Stack } from "expo-router";
import { AdminScreen } from "@/features/admin/AdminScreen";

export default function AdminRoute() {
  return (
    <>
      <Stack.Screen options={{ title: "Users" }} />
      <AdminScreen />
    </>
  );
}
