import { useState } from "react";
import { Pressable, View } from "react-native";

import { useMarket } from "@/providers/market";
import { AppText, Sheet } from "@/ui";

/** Bottom sheet listing the enabled markets; picking one switches the whole app. */
export function MarketSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { market, markets, setMarket } = useMarket();
  return (
    <Sheet visible={visible} onClose={onClose} title="Market">
      <View className="gap-2 pb-2">
        {markets.map((m) => {
          const active = m.code === market.code;
          return (
            <Pressable
              key={m.code}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${m.name}, ${m.currency}`}
              onPress={() => {
                setMarket(m.code);
                onClose();
              }}
              className={`min-h-[44px] flex-row items-center gap-3 rounded-xl border px-3 ${
                active ? "border-accent bg-accent/10" : "border-white/10"
              }`}
            >
              <AppText className="text-xl">{m.flag}</AppText>
              <AppText className="flex-1 font-sans-semibold text-white">{m.name}</AppText>
              <AppText className="font-mono text-xs text-white/50">{m.currency}</AppText>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

/**
 * The account screen's "Market" row. Hidden while only one market is enabled,
 * and while the signed-in user's preference is loading (a switch then would
 * race the server's answer).
 */
export function MarketRow() {
  const { market, markets, loading } = useMarket();
  const [open, setOpen] = useState(false);
  if (loading || markets.length < 2) return null;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Market: ${market.name}. Change market`}
        onPress={() => setOpen(true)}
        className="min-h-[44px] flex-row items-center justify-between"
      >
        <AppText className="text-white/70">Market</AppText>
        <AppText className="text-white">{`${market.flag} ${market.name}`}</AppText>
      </Pressable>
      <MarketSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
