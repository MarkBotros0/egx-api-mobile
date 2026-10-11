/**
 * A module's header — the web's <details><summary>. Tapping collapses or
 * reopens the module. The id is the OLD section anchor (Task 9 deep-links it).
 */
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/ui";
import { COLORS } from "@/shared/theme";
import type { Module } from "@/shared/learn";
import { FlashRing } from "./ConceptCard";

export function ModuleHeader({
  module: m,
  index,
  done,
  open,
  onToggle,
  flash,
  reduceMotion,
}: {
  module: Module;
  index: number;
  done: number;
  open: boolean;
  onToggle: (moduleId: string) => void;
  flash: number;
  reduceMotion: boolean;
}) {
  const total = m.concepts.length;
  const complete = total > 0 && done === total;
  return (
    <View className={index === 0 ? "" : "pt-5"}>
      <Pressable
        testID={`module-${m.id}`}
        onPress={() => onToggle(m.id)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${m.title}, module ${index + 1}, ${done} of ${total} read`}
        className="relative mb-4 flex-row items-start gap-3 rounded-lg"
      >
        <View
          className="mt-0.5 h-8 w-8 items-center justify-center rounded-lg"
          style={{
            backgroundColor: complete ? m.hue : `${m.hue}24`,
            borderWidth: 1,
            borderColor: `${m.hue}57`,
          }}
        >
          <AppText className="font-mono-semibold text-[12px]" style={{ color: complete ? COLORS["charcoal-dark"] : m.hue }}>
            {String(index + 1).padStart(2, "0")}
          </AppText>
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <AppText accessibilityRole="header" className="font-sans-bold text-[17px] leading-[21px] text-white">
              {m.title}
            </AppText>
            <Ionicons
              name="chevron-down"
              size={12}
              color="rgba(255,255,255,0.3)"
              style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
            />
          </View>
          <AppText className="mt-0.5 text-[12px] leading-[16px] text-white/40">{m.goal}</AppText>
          <AppText className="mt-1 font-mono text-[9px] uppercase tracking-[1.5px] text-white/25">
            {`${done} of ${total} read`}
          </AppText>
        </View>
        {flash !== 0 && !reduceMotion ? <FlashRing key={flash} radius={8} /> : null}
      </Pressable>
    </View>
  );
}
