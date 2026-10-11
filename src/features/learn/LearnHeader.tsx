/**
 * The top of the Learn list: hero + progress (scrolls away), and the sticky
 * controls row — module pills ABOVE the search, because the modules are the
 * order the page is meant to be walked and search is the shortcut.
 */
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/ui";
import type { Module } from "@/shared/learn";
import { V } from "@/shared/learnVisuals";
import { pct } from "@/features/market/logic/format";

export function LearnHero({ doneCount, total, onReset }: { doneCount: number; total: number; onReset: () => void }) {
  const share = Math.min(100, Math.round((doneCount / total) * 100));
  return (
    <View className="mb-7 pt-6">
      <AppText className="mb-3 font-mono text-[10px] uppercase tracking-[2px] text-white/30">
        EGX Analytics · Learn
      </AppText>
      <AppText accessibilityRole="header" className="font-sans-bold text-[26px] leading-[30px] text-white">
        {"Learn the EGX,\n"}
        <AppText className="font-sans-bold text-[26px] leading-[30px] text-accent">one idea at a time.</AppText>
      </AppText>
      <AppText className="mt-3 text-[13px] leading-[21px] text-white/45">
        Every number this app shows you, explained — with the diagram, the worked example in EGP, and the honest
        limits. Nine modules, in the order you actually need them.
      </AppText>
      <View className="mt-5">
        <View className="mb-1.5 flex-row items-baseline justify-between gap-3">
          <AppText className="font-mono text-[10px] uppercase tracking-[1.5px] text-white/35">
            {`${doneCount} of ${total} read`}
          </AppText>
          {doneCount > 0 ? (
            <Pressable
              onPress={onReset}
              accessibilityRole="button"
              accessibilityLabel="Reset reading progress"
              hitSlop={16}
            >
              <AppText className="font-mono text-[10px] uppercase tracking-[0.5px] text-white/25">reset</AppText>
            </Pressable>
          ) : null}
        </View>
        <View className="h-1 overflow-hidden rounded-full bg-white/[0.07]">
          <View className="h-full rounded-full bg-accent" style={{ width: pct(share) }} />
        </View>
      </View>
    </View>
  );
}

/**
 * Nine pills, about three visible: the strip follows the active module by
 * scrolling ITSELF (never the page) so the highlight stays on screen.
 */
export function ModulePills({
  modules,
  active,
  onJump,
  reduceMotion,
}: {
  modules: Module[];
  active: string;
  onJump: (moduleId: string) => void;
  reduceMotion: boolean;
}) {
  const ref = useRef<ScrollView>(null);
  const layouts = useRef(new Map<string, { x: number; width: number }>());
  const strip = useRef({ width: 0, content: 0, offset: 0 });

  useEffect(() => {
    const pill = layouts.current.get(active);
    const { width, content, offset } = strip.current;
    if (!pill || !width) return;
    const target = pill.x - (width - pill.width) / 2;
    const x = Math.max(0, Math.min(target, content - width));
    if (Math.abs(x - offset) < 4) return;
    ref.current?.scrollTo({ x, animated: !reduceMotion });
  }, [active, reduceMotion]);

  return (
    <ScrollView
      ref={ref}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={(e) => {
        strip.current.width = e.nativeEvent.layout.width;
      }}
      onContentSizeChange={(w) => {
        strip.current.content = w;
      }}
      onScroll={(e) => {
        strip.current.offset = e.nativeEvent.contentOffset.x;
      }}
      scrollEventThrottle={64}
      style={{ marginHorizontal: -16, marginBottom: 10 }}
      contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}
    >
      {modules.map((m, i) => {
        const on = m.id === active;
        const ink = on ? m.hue : "rgba(255,255,255,0.5)";
        return (
          <Pressable
            key={m.id}
            onPress={() => onJump(m.id)}
            onLayout={(e) =>
              layouts.current.set(m.id, { x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width })
            }
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Module ${i + 1}: ${m.title}`}
            className="min-h-[44px] flex-row items-center gap-1.5 rounded-full border px-3"
            style={{
              borderColor: on ? m.hue : "rgba(255,255,255,0.08)",
              backgroundColor: on ? `${m.hue}1f` : "transparent",
            }}
          >
            <AppText className="font-mono text-[9px]" style={{ color: ink, opacity: 0.6 }}>
              {String(i + 1).padStart(2, "0")}
            </AppText>
            <AppText className="font-sans-medium text-[11px]" style={{ color: ink }}>
              {m.title}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Command-bar search: the live match count sits in the field, where feedback belongs. */
export function SearchField({
  query,
  onChange,
  count,
}: {
  query: string;
  onChange: (q: string) => void;
  count: number | null;
}) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<TextInput>(null);
  return (
    <View
      className="relative justify-center rounded-xl border"
      style={{
        borderColor: focused ? `${V.accent}73` : "rgba(255,255,255,0.08)",
        backgroundColor: focused ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.03)",
      }}
    >
      <View pointerEvents="none" className="absolute left-3.5">
        <Ionicons name="search" size={16} color={focused ? V.accent : "rgba(255,255,255,0.3)"} />
      </View>
      <TextInput
        ref={ref}
        value={query}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search concepts"
        placeholderTextColor="rgba(255,255,255,0.25)"
        accessibilityLabel="Search all concepts"
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        className="min-h-[48px] pl-10 pr-24 font-sans text-[16px] text-white"
      />
      <View className="absolute right-2 flex-row items-center gap-1">
        {count !== null ? (
          <AppText
            accessibilityLiveRegion="polite"
            className="font-mono text-[11px]"
            style={{ color: count ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.25)" }}
          >
            {String(count)}
          </AppText>
        ) : null}
        {query ? (
          <Pressable
            onPress={() => {
              onChange("");
              ref.current?.focus();
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            className="h-11 w-11 items-center justify-center rounded-lg"
          >
            <Ionicons name="close" size={16} color="rgba(255,255,255,0.35)" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** The sticky row. Opaque: React Native has no backdrop-blur. */
export function LearnControls({
  modules,
  activeModule,
  onJump,
  reduceMotion,
  query,
  onQuery,
  count,
  onHeight,
}: {
  modules: Module[];
  activeModule: string;
  onJump: (moduleId: string) => void;
  reduceMotion: boolean;
  query: string;
  onQuery: (q: string) => void;
  count: number | null;
  onHeight: (h: number) => void;
}) {
  return (
    <View className="mb-5 bg-charcoal-dark py-3" onLayout={(e) => onHeight(e.nativeEvent.layout.height)}>
      {count === null ? (
        <ModulePills modules={modules} active={activeModule} onJump={onJump} reduceMotion={reduceMotion} />
      ) : null}
      <SearchField query={query} onChange={onQuery} count={count} />
    </View>
  );
}
