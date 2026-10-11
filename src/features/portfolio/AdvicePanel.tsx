import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { learnHref } from "@/lib/links";
import type { Signal } from "@/shared/types";
import { AppText, Card, Pill } from "@/ui";
import { SEVERITY_META, severityCounts, tierOf } from "./logic/signals";

/**
 * Signals behind ONE tap. Twenty-odd signals are several phone screens; the
 * per-severity pills keep "1 urgent" visible while it is shut. Not persisted:
 * every visit starts collapsed.
 */
export function AdvicePanel({ signals }: { signals: Signal[] }) {
  const [open, setOpen] = useState(false);

  if (!signals.length) {
    return (
      <Card>
        <AppText className="text-center font-sans text-sm text-white/40">No signals or advice to show.</AppText>
      </Card>
    );
  }

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        className="min-h-[44px] flex-row items-center justify-between gap-3"
      >
        <View className="min-w-0 flex-1">
          <AppText className="font-sans-medium text-sm text-white/70">Signals &amp; Advice</AppText>
          <View className="mt-2 flex-row flex-wrap gap-1.5">
            {severityCounts(signals).map((c) => (
              <Pill key={c.severity} label={c.label} tone={c.tone} />
            ))}
          </View>
        </View>
        <Ionicons
          name="chevron-down"
          size={20}
          color="rgba(255,255,255,0.3)"
          style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}
        />
      </Pressable>

      {open && (
        <View className="mt-4 gap-3">
          {signals.map((signal, i) => {
            const meta = SEVERITY_META[tierOf(signal)];
            return (
              <View key={`${signal.type}-${signal.symbol ?? "all"}-${i}`} className={`rounded-xl border p-4 ${meta.cardClass}`}>
                <View className="flex-row items-start gap-3">
                  <View className={`h-6 w-6 items-center justify-center rounded-full ${meta.iconClass}`}>
                    <AppText className={`font-sans-bold text-xs ${meta.iconClass}`}>{meta.icon}</AppText>
                  </View>
                  <View className="flex-1">
                    <AppText className="font-sans text-sm text-white/90">{signal.message}</AppText>
                    <AppText className="mt-2 font-sans text-xs leading-relaxed text-white/40">{signal.explanation}</AppText>
                    {signal.learn_concept ? (
                      <Pressable
                        accessibilityRole="link"
                        onPress={() => router.push(learnHref(signal.learn_concept))}
                        className="min-h-[44px] justify-center"
                      >
                        <AppText className="font-sans text-[11px] text-accent">Learn more →</AppText>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
          <AppText className="rounded-lg bg-white/5 p-3 font-sans text-[10px] text-white/30">
            This is educational analysis for learning purposes only, not financial advice. Always do your own research
            before making investment decisions.
          </AppText>
        </View>
      )}
    </Card>
  );
}
