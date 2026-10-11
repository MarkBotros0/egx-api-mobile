/**
 * One concept: module-hued rail (fills when read), level, title, read toggle,
 * definition, diagram, why/how, worked example.
 *
 * The card RESTS VISIBLE. The only animation is the deep-link flash, an
 * accent ring drawn OVER an already-opaque card and removed after FLASH_MS;
 * under reduced motion it is not drawn at all (the web disables it too).
 */
import { memo, useEffect, useState } from "react";
import { Animated, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/ui";
import { COLORS } from "@/shared/theme";
import { LEVEL_LABEL, conceptKey, type Concept } from "@/shared/learn";
import { V } from "@/shared/learnVisuals";
import { LearnVisual } from "./LearnVisual";

export const FLASH_MS = 2200;

/** Accent ring that peaks at 18% of FLASH_MS, like the web's learn-flash keyframe. */
export function FlashRing({ radius = 12 }: { radius?: number }) {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: FLASH_MS * 0.18, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: FLASH_MS * 0.82, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return (
    <Animated.View
      testID="learn-flash"
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: radius,
        borderWidth: 2,
        borderColor: `${V.accent}99`,
        opacity,
      }}
    />
  );
}

function Block({ label, text }: { label: string; text: string }) {
  return (
    <View>
      <AppText className="mb-0.5 font-mono text-[9px] uppercase tracking-[1.5px] text-white/30">{label}</AppText>
      <AppText className="text-[12px] leading-[19px] text-white/50">{text}</AppText>
    </View>
  );
}

export interface ConceptCardProps {
  concept: Concept;
  hue: string;
  read: boolean;
  onToggle: (key: string) => void;
  /** True once the card has been on screen — arms its LiveChart. */
  armed: boolean;
  /** 0 = no flash; any other value (re)starts the ring when it changes. */
  flash: number;
  reduceMotion: boolean;
}

export const ConceptCard = memo(function ConceptCard({
  concept,
  hue,
  read,
  onToggle,
  armed,
  flash,
  reduceMotion,
}: ConceptCardProps) {
  const key = conceptKey(concept);
  const level = concept.level ?? "core";

  return (
    <View
      testID={`concept-${key}`}
      className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]"
    >
      <View
        className="absolute bottom-0 left-0 top-0 w-[2px]"
        style={{ backgroundColor: hue, opacity: read ? 0.9 : 0.18 }}
      />
      <View className="p-4 pl-5">
        <View className="mb-2.5 flex-row items-start gap-3">
          <View className="min-w-0 flex-1">
            <AppText className="mb-1 font-mono text-[9px] uppercase tracking-[1.5px]" style={{ color: hue, opacity: 0.75 }}>
              {LEVEL_LABEL[level]}
            </AppText>
            <AppText accessibilityRole="header" className="font-sans-semibold text-[15px] leading-[20px] text-white">
              {concept.title}
            </AppText>
          </View>
          <Pressable
            onPress={() => onToggle(key)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: read }}
            accessibilityLabel={read ? `Mark ${concept.title} unread` : `Mark ${concept.title} read`}
            className="-mr-1 -mt-1 h-11 w-11 items-center justify-center rounded-lg"
          >
            <View
              className="h-[18px] w-[18px] items-center justify-center rounded-full border"
              style={{ borderColor: read ? hue : "rgba(255,255,255,0.22)", backgroundColor: read ? hue : "transparent" }}
            >
              <Ionicons name="checkmark" size={11} color={read ? COLORS["charcoal-dark"] : "rgba(255,255,255,0.3)"} />
            </View>
          </Pressable>
        </View>

        <AppText className="mb-3 text-[13px] leading-[21px] text-white/70">{concept.definition}</AppText>

        {concept.visual ? (
          <View className="mb-3">
            <LearnVisual spec={concept.visual} armed={armed} />
          </View>
        ) : null}

        <View className="gap-2.5">
          <Block label="Why it matters" text={concept.whyItMatters} />
          <Block label="How to use it" text={concept.howToUse} />
        </View>

        {concept.example ? (
          <View className="mt-3 rounded-md border-l-2 bg-white/[0.03] px-3 py-2.5" style={{ borderLeftColor: hue }}>
            <AppText className="mb-1 font-mono text-[9px] uppercase tracking-[1.5px] text-white/35">For example</AppText>
            <AppText className="font-mono text-[11px] leading-[18px] text-white/70">{concept.example}</AppText>
          </View>
        ) : null}
      </View>
      {flash && !reduceMotion ? <FlashRing key={flash} /> : null}
    </View>
  );
});
