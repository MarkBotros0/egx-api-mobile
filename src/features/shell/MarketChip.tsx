/**
 * Header chip (flag + currency) that opens the market sheet. Hidden with one
 * market, and while the signed-in user's preference is loading.
 */
import { useState } from "react";
import { Pressable } from "react-native";

import { useMarket } from "@/providers/market";
import { AppText } from "@/ui";

import { MarketSheet } from "./MarketSheet";

export function MarketChip() {
  const { market, markets, loading } = useMarket();
  const [open, setOpen] = useState(false);
  if (loading || markets.length < 2) return null;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Market: ${market.name}, ${market.currency}. Change market`}
        onPress={() => setOpen(true)}
        className="min-h-[44px] flex-row items-center gap-1 rounded-full border border-white/15 px-3"
      >
        <AppText className="text-base">{market.flag}</AppText>
        <AppText className="font-mono text-xs text-white/80">{market.currency}</AppText>
        <AppText className="text-xs text-white/50">▾</AppText>
      </Pressable>
      <MarketSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
