import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";

import { useAuth } from "@/auth/AuthProvider";
import { AdminHeaderButton } from "@/features/admin/AdminHeaderButton";
import { AlertsHeaderButton } from "@/features/alerts/AlertsHeaderButton";
import { COLORS } from "@/shared/theme";
import { IconButton, type IoniconName } from "@/ui";

const TABS: { name: string; title: string; icon: IoniconName }[] = [
  { name: "index", title: "Dashboard", icon: "grid-outline" },
  { name: "portfolio", title: "Portfolio", icon: "briefcase-outline" },
  { name: "learn", title: "Learn", icon: "school-outline" },
  { name: "news", title: "News", icon: "newspaper-outline" },
];

export default function TabsLayout() {
  const { logout } = useAuth();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: COLORS["charcoal-dark"] },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontFamily: "Outfit_600SemiBold" },
        headerShadowVisible: false,
        headerRight: () => (
          <View className="flex-row items-center gap-1 pr-2">
            <AlertsHeaderButton />
            <AdminHeaderButton />
            <IconButton icon="log-out-outline" accessibilityLabel="Log out" onPress={() => void logout()} />
          </View>
        ),
        tabBarStyle: { backgroundColor: COLORS.charcoal, borderTopColor: "rgba(255,255,255,0.1)" },
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: "rgba(255,255,255,0.5)",
        tabBarLabelStyle: { fontFamily: "Outfit_500Medium", fontSize: 10 },
        sceneStyle: { backgroundColor: COLORS["charcoal-dark"] },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, size }) => <Ionicons name={t.icon} color={color} size={size} />,
          }}
        />
      ))}
    </Tabs>
  );
}
