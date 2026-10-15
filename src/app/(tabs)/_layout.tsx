import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { View } from "react-native";

import { AccountHeaderButton } from "@/features/account/AccountHeaderButton";
import { AlertsHeaderButton } from "@/features/alerts/AlertsHeaderButton";
import { BrandTitle } from "@/features/shell/BrandTitle";
import { MarketChip } from "@/features/shell/MarketChip";
import { PillTabBar } from "@/features/shell/PillTabBar";
import { COLORS } from "@/shared/theme";
import type { IoniconName } from "@/ui";

const TABS: { name: string; title: string; icon: IoniconName }[] = [
  { name: "index", title: "Dashboard", icon: "grid-outline" },
  { name: "portfolio", title: "Portfolio", icon: "briefcase-outline" },
  { name: "learn", title: "Learn", icon: "school-outline" },
  { name: "news", title: "News", icon: "newspaper-outline" },
];

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: COLORS["charcoal-dark"] },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontFamily: "Outfit_600SemiBold" },
        headerShadowVisible: false,
        // Every tab carries the brand, as the web navbar does; each screen
        // titles itself below it.
        headerTitle: () => <BrandTitle />,
        headerTitleAlign: "left",
        headerRight: () => (
          <View className="flex-row items-center gap-1 pr-2">
            <MarketChip />
            <AlertsHeaderButton />
            <AccountHeaderButton />
          </View>
        ),
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
