import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from "expo-router/tabs";
import { useContext, useState } from "react";
import { Pressable, View, type LayoutChangeEvent } from "react-native";
import Animated, { useAnimatedStyle, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useReduceMotion } from "@/features/learn/useReduceMotion";
import { COLORS } from "@/shared/theme";
import { AppText } from "@/ui";

/**
 * The web's floating pill nav (egx-api-fe BottomTabBar), for the app: a
 * centred 52pt capsule, fluid up to 320pt wide, 8pt clear of the home
 * indicator, with ONE highlight that slides between tabs rather than a
 * background toggled per tab.
 *
 * It FLOATS over the content, as on the web: absolutely positioned, with a
 * transparent gutter (box-none, so taps there reach the content) and no strip
 * of page background. It reports its height to the navigator, which hands it
 * to every tab screen as BottomTabBarHeightContext — `useTabBarClearance()` —
 * so each screen pads its scroll content and the portfolio FAB sits above it.
 */
export const PILL_HEIGHT = 52;
const TAB_HEIGHT = 44;
const PAD = 6;

export function PillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);

  const count = state.routes.length;
  const tabWidth = width > 0 ? (width - PAD * 2) / count : 0;

  // Springs slightly past and settles, like the web's overshoot curve.
  const highlight = useAnimatedStyle(() => {
    const x = PAD + state.index * tabWidth;
    return {
      width: tabWidth,
      transform: [{ translateX: reduceMotion ? x : withSpring(x, { damping: 16, stiffness: 180, mass: 0.8 }) }],
      opacity: withTiming(tabWidth > 0 ? 1 : 0, { duration: 120 }),
    };
  }, [state.index, tabWidth, reduceMotion]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View
      pointerEvents="box-none"
      onLayout={(e) => reportHeight?.(e.nativeEvent.layout.height)}
      className="items-center px-4"
      style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 8 }}
    >
      <View
        onLayout={onLayout}
        accessibilityRole="tablist"
        className="w-full max-w-[320px] flex-row items-center rounded-full border border-white/10 bg-charcoal"
        style={{
          height: PILL_HEIGHT,
          paddingHorizontal: PAD,
          shadowColor: COLORS["charcoal-dark"],
          shadowOpacity: 0.55,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: 0,
              top: (PILL_HEIGHT - 2 - TAB_HEIGHT) / 2,
              height: TAB_HEIGHT,
              borderRadius: TAB_HEIGHT / 2,
              overflow: "hidden",
            },
            highlight,
          ]}
        >
          <View className="flex-1 bg-accent/15" />
        </Animated.View>
        {state.routes.map((route, i) => {
          const { options } = descriptors[route.key];
          const focused = state.index === i;
          const color = focused ? COLORS.accent : "rgba(255,255,255,0.4)";
          const label = typeof options.title === "string" ? options.title : route.name;

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              className="flex-1 items-center justify-center gap-0.5 rounded-full"
              style={{ height: TAB_HEIGHT }}
            >
              <View style={{ transform: focused ? [{ scale: 1.08 }, { translateY: -1 }] : [] }}>
                {options.tabBarIcon?.({ focused, color, size: 21 })}
              </View>
              <AppText className="font-sans-medium text-[10px] leading-[12px]" style={{ color }}>
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
