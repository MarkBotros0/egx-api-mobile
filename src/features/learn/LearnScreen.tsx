/**
 * The Learn path: hero, sticky module pills + search, nine collapsible
 * modules, back-to-top. One virtualised FlatList — 70 cards with diagrams
 * is too much to mount at once on a phone.
 *
 * - LiveCharts are armed by viewability (a row is "seen" once on screen).
 * - The active pill follows the first visible module-bearing row.
 * - Deep links (`concept` prop) are handled in Task 9.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  View,
  useWindowDimensions,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Screen } from "@/ui";
import { ALL_CONCEPTS, CURRICULUM, TOTAL_CONCEPTS } from "@/shared/curriculum";
import { conceptKey, searchConcepts, type Module } from "@/shared/learn";
import { ConceptCard } from "./ConceptCard";
import { LearnControls, LearnHero } from "./LearnHeader";
import { LearnVisual } from "./LearnVisual";
import { ModuleHeader } from "./ModuleHeader";
import { useLearnProgress } from "./progress";
import { CONTROLS_INDEX, buildRows, toggledSet, type LearnRow } from "./rows";
import { useReduceMotion } from "./useReduceMotion";

const STICKY = [CONTROLS_INDEX];
const VIEWABILITY = { itemVisiblePercentThreshold: 1 };

export interface LearnScreenProps {
  /** A module id, concept id or title slug to open, scroll to and flash. */
  concept?: string;
  /** Called once the param has been consumed, so the same link works again. */
  onConceptHandled?: () => void;
}

export function LearnScreen({ concept, onConceptHandled }: LearnScreenProps) {
  const { read, toggle, reset, hydrated } = useLearnProgress();
  const reduceMotion = useReduceMotion();
  const { height: viewportH } = useWindowDimensions();

  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [activeModule, setActiveModule] = useState(CURRICULUM[0].id);
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set());
  const [showTop, setShowTop] = useState(false);

  const listRef = useRef<FlatList<LearnRow>>(null);
  const controlsH = useRef(120);
  const showTopRef = useRef(false);

  const results = useMemo(() => searchConcepts(ALL_CONCEPTS, query), [query]);
  const rows = useMemo(() => buildRows({ modules: CURRICULUM, collapsed, results }), [collapsed, results]);
  const doneCount = hydrated ? read.size : 0;

  // ---- deep links + pill jumps: filled in by Task 9
  const flashFor = (rowKey: string): number => {
    void rowKey;
    return 0;
  };
  const jumpToModule = useCallback((moduleId: string) => {
    setQuery("");
    const index = buildRows({ modules: CURRICULUM, collapsed, results: null }).findIndex(
      (r) => r.key === `m-${moduleId}`
    );
    if (index >= 0) listRef.current?.scrollToIndex({ index, animated: !reduceMotion, viewOffset: controlsH.current });
  }, [collapsed, reduceMotion]);
  void concept;
  void onConceptHandled;

  const toggleModule = useCallback((id: string) => setCollapsed((prev) => toggledSet(prev, id)), []);

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<LearnRow>[] }) => {
    const keys = viewableItems.flatMap((t) => (t.item ? [t.item.key] : []));
    setSeen((prev) => (keys.every((k) => prev.has(k)) ? prev : new Set([...prev, ...keys])));
    const first = viewableItems.find((t) => t.item && "module" in t.item);
    if (first?.item && "module" in first.item) setActiveModule(first.item.module.id);
  }, []);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = e.nativeEvent.contentOffset.y > viewportH;
      if (next !== showTopRef.current) {
        showTopRef.current = next;
        setShowTop(next);
      }
    },
    [viewportH]
  );

  const doneIn = (m: Module) => m.concepts.filter((c) => read.has(conceptKey(c))).length;

  const renderItem = ({ item }: ListRenderItemInfo<LearnRow>) => {
    switch (item.type) {
      case "hero":
        return <LearnHero doneCount={doneCount} total={TOTAL_CONCEPTS} onReset={reset} />;
      case "controls":
        return (
          <LearnControls
            modules={CURRICULUM}
            activeModule={activeModule}
            onJump={jumpToModule}
            reduceMotion={reduceMotion}
            query={query}
            onQuery={setQuery}
            count={results ? results.length : null}
            onHeight={(h) => {
              controlsH.current = h;
            }}
          />
        );
      case "module":
        return (
          <ModuleHeader
            module={item.module}
            index={item.index}
            done={doneIn(item.module)}
            open={item.open}
            onToggle={toggleModule}
            flash={flashFor(item.key)}
            reduceMotion={reduceMotion}
          />
        );
      case "overview":
        return (
          <View className="mb-4">
            <LearnVisual spec={item.spec} armed={seen.has(item.key)} />
          </View>
        );
      case "concept":
        return (
          <View className="mb-3">
            <ConceptCard
              concept={item.concept}
              hue={item.module.hue}
              read={read.has(conceptKey(item.concept))}
              onToggle={toggle}
              armed={seen.has(item.key)}
              flash={flashFor(item.key)}
              reduceMotion={reduceMotion}
            />
          </View>
        );
      case "results-head":
        return (
          <AppText className="mb-4 font-mono text-[10px] uppercase tracking-[1.5px] text-white/35">
            {`${item.count} ${item.count === 1 ? "concept" : "concepts"} match “${query.trim()}”`}
          </AppText>
        );
      case "empty":
        return (
          <View className="items-center rounded-xl border border-white/[0.06] bg-white/[0.02] p-8">
            <AppText className="text-sm text-white/60">Nothing matches that yet.</AppText>
            <AppText className="mt-1.5 text-center text-[12px] text-white/35">
              Try a shorter word — “stop”, “volume”, “tax”, “EGX30”.
            </AppText>
          </View>
        );
      case "footer":
        return (
          <AppText className="mt-10 border-t border-white/[0.06] pt-5 text-[11px] leading-[18px] text-white/30">
            Nothing here is investment advice. The composite score is an educational tool built from price data — it
            does not predict where a stock goes next, and it knows nothing about a company&apos;s earnings quality,
            debt, or the news. Decide with your own money in mind.
          </AppText>
        );
    }
  };

  return (
    <Screen scroll={false}>
      <View className="flex-1">
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(r) => r.key}
          renderItem={renderItem}
          extraData={{ read, seen, activeModule, query, doneCount, reduceMotion }}
          stickyHeaderIndices={STICKY}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={VIEWABILITY}
          onScroll={onScroll}
          scrollEventThrottle={32}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={9}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: 64 }}
        />
        {showTop ? (
          <Pressable
            onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: !reduceMotion })}
            accessibilityRole="button"
            accessibilityLabel="Back to top"
            className="absolute bottom-4 right-4 h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-charcoal/90"
          >
            <Ionicons name="arrow-up" size={20} color="rgba(255,255,255,0.6)" />
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}
