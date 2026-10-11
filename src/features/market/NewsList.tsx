import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, View } from "react-native";
import { router } from "expo-router";
import { stockHref } from "@/lib/links";
import type { NewsItem } from "@/shared/types";
import { AppText } from "@/ui";
import { isFresh, relativeAge, sourceName, storySite } from "./logic/news";

/**
 * No gain/loss colour anywhere: a headline carries no direction and no
 * sentiment is computed. The monogram is monochrome for the same reason.
 */
function NewsCard({ item, now }: { item: NewsItem; now: Date }) {
  const name = sourceName(item.provider);
  return (
    <View className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
      <View className="flex-row items-center gap-2.5">
        <View className="h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]">
          <AppText className="font-mono-semibold text-[11px] text-white/70">{name.charAt(0).toUpperCase()}</AppText>
        </View>
        <AppText numberOfLines={1} className="flex-1 font-sans-medium text-[13px] text-white/70">{name}</AppText>
        <View className="flex-row items-center gap-1.5">
          {isFresh(item.published_at, now) && (
            <View accessibilityLabel="Published in the last 24 hours" className="h-1.5 w-1.5 rounded-full bg-accent" />
          )}
          <AppText className="font-mono text-[11px] text-white/40">{relativeAge(item.published_at, now)}</AppText>
        </View>
      </View>

      {/* The story lives on the publisher's site: it opens off-app, and says where. */}
      <Pressable
        accessibilityRole="link"
        accessibilityHint={`Opens on ${storySite(item.url)}`}
        onPress={() => void Linking.openURL(item.url)}
        className="mt-2.5 min-h-[44px] flex-row items-start gap-2"
      >
        <AppText className="flex-1 font-sans-semibold text-[15px] leading-snug text-white/95">{item.title}</AppText>
        <Ionicons name="open-outline" size={14} color="rgba(255,255,255,0.3)" />
      </Pressable>

      {item.symbols.length > 0 && (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {item.symbols.map((s) => (
            <Pressable
              key={s}
              accessibilityRole="link"
              onPress={() => router.push(stockHref(s))}
              className="min-h-[44px] justify-center rounded-lg bg-accent/10 px-3"
            >
              <AppText className="font-mono text-xs text-accent/90">{s}</AppText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export function NewsList({ title, items, emptyNote, now }: { title: string; items: NewsItem[]; emptyNote: string; now: Date }) {
  return (
    <View className="mb-8">
      <View className="mb-3 flex-row items-baseline gap-2.5">
        <AppText className="font-sans-semibold text-lg text-white">{title}</AppText>
        <AppText className="font-mono text-xs text-white/35">{String(items.length)}</AppText>
      </View>
      {items.length === 0 ? (
        <View className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5">
          <AppText className="text-sm leading-relaxed text-white/50">{emptyNote}</AppText>
        </View>
      ) : (
        <View className="gap-3">
          {items.map((item) => (
            <NewsCard key={item.id} item={item} now={now} />
          ))}
        </View>
      )}
    </View>
  );
}
