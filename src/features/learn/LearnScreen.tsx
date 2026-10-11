/**
 * The Learn path: hero, sticky module pills + search, nine collapsible
 * modules, back-to-top. One virtualised FlatList — 70 cards with diagrams
 * is too much to mount at once on a phone.
 *
 * - LiveCharts are armed by viewability (a row is "seen" once on screen).
 * - The active pill follows the first visible module-bearing row.
 * - Deep links (`concept` prop) clear search, reopen the module, scroll and flash.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ConceptCard, FLASH_MS } from "./ConceptCard";
import { LearnControls, LearnHero } from "./LearnHeader";
import { LearnVisual } from "./LearnVisual";
import { ModuleHeader } from "./ModuleHeader";
import { useLearnProgress } from "./progress";
import { CONTROLS_INDEX, buildRows, resolveTarget, toggledSet, withOpen, type LearnRow } from "./rows";
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
  // Measured height of the sticky controls, per mode: with the pills (no
  // search) and without them (searching, ~54px shorter). Every jump clears the
  // search, so it lands in the "pills" layout even if the last measure was
  // taken while searching.
  const controlsH = useRef({ pills: 120, search: 66 });
  const showTopRef = useRef(false);

  const results = useMemo(() => searchConcepts(ALL_CONCEPTS, query), [query]);
  const rows = useMemo(() => buildRows({ modules: CURRICULUM, collapsed, results }), [collapsed, results]);
  const doneCount = hydrated ? read.size : 0;

  // ---- deep links + pill jumps
  // `jump` is the one source of scroll intent. `n` increases on every jump,
  // so jumping to the same row twice is still a new jump.
  const [jump, setJump] = useState<{ key: string; n: number; flash: boolean } | null>(null);
  const [flashEnded, setFlashEnded] = useState(0);
  const scrolledN = useRef(0);
  const retries = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jumpRef = useRef(jump);
  const rowsRef = useRef(rows);
  useEffect(() => {
    jumpRef.current = jump;
    rowsRef.current = rows;
  }, [jump, rows]);
  const cancelRetry = useCallback(() => {
    if (retryTimer.current) clearTimeout(retryTimer.current);
    retryTimer.current = null;
  }, []);
  useEffect(() => cancelRetry, [cancelRetry]);

  // Prop -> state, in render (React's documented pattern for "adjust state
  // when a prop changes"): no synchronous setState inside an effect.
  const [lastConcept, setLastConcept] = useState<string | undefined>(undefined);
  if (concept !== lastConcept) {
    setLastConcept(concept);
    const target = concept ? resolveTarget(CURRICULUM, concept) : null;
    if (target) {
      setQuery("");
      setCollapsed((prev) => withOpen(prev, target.moduleId));
      setJump((prev) => ({ key: target.rowKey, n: (prev?.n ?? 0) + 1, flash: true }));
    }
  }

  // Tell the route the param is consumed, so it can clear it and the same
  // link works again. A ref keeps an inline callback from re-firing this.
  const handledRef = useRef(onConceptHandled);
  useEffect(() => {
    handledRef.current = onConceptHandled;
  }, [onConceptHandled]);
  useEffect(() => {
    if (concept) handledRef.current?.();
  }, [concept]);

  // Scroll once per jump, after the rows that contain the target exist.
  useEffect(() => {
    if (!jump || jump.n === scrolledN.current) return;
    const index = rows.findIndex((r) => r.key === jump.key);
    if (index < 0) return;
    scrolledN.current = jump.n;
    retries.current = 0;
    cancelRetry();
    requestAnimationFrame(() =>
      listRef.current?.scrollToIndex({ index, animated: !reduceMotion, viewOffset: controlsH.current.pills })
    );
  }, [jump, rows, reduceMotion, cancelRetry]);

  // The flash ends after FLASH_MS (the ring also fades itself out).
  useEffect(() => {
    if (!jump?.flash) return;
    const t = setTimeout(() => setFlashEnded(jump.n), FLASH_MS);
    return () => clearTimeout(t);
  }, [jump]);

  const flashFor = (rowKey: string) =>
    jump && jump.flash && jump.key === rowKey && jump.n !== flashEnded ? jump.n : 0;

  const jumpToModule = useCallback((moduleId: string) => {
    setQuery("");
    setJump((prev) => ({ key: `m-${moduleId}`, n: (prev?.n ?? 0) + 1, flash: false }));
  }, []);

  // Rows far below the rendered window have no measured offset yet: jump
  // near it by the average row height, then retry (bounded). Wired on the
  // FlatList, so it covers pill jumps and concept deep links alike.
  const onScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      if (retries.current >= 3) return;
      retries.current += 1;
      cancelRetry();
      listRef.current?.scrollToOffset({
        offset: Math.max(0, info.averageItemLength * info.index - controlsH.current.pills),
        animated: false,
      });
      // Re-resolve the target when the timer fires: rows may have shrunk
      // (search, collapse) or a newer jump started. scrollToIndex throws an
      // invariant when the index is out of range.
      retryTimer.current = setTimeout(() => {
        retryTimer.current = null;
        const target = jumpRef.current;
        const current = rowsRef.current;
        const index = target ? current.findIndex((r) => r.key === target.key) : -1;
        if (index < 0 || index >= current.length) return;
        listRef.current?.scrollToIndex({ index, animated: !reduceMotion, viewOffset: controlsH.current.pills });
      }, 100);
    },
    [reduceMotion, cancelRetry]
  );

  const listExtra = useMemo(
    () => ({ read, seen, activeModule, query, doneCount, reduceMotion, jump, flashEnded }),
    [read, seen, activeModule, query, doneCount, reduceMotion, jump, flashEnded]
  );

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
              controlsH.current[results ? "search" : "pills"] = h;
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
          extraData={listExtra}
          onScrollToIndexFailed={onScrollToIndexFailed}
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
