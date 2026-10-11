import { useMemo, useState } from "react";
import { View } from "react-native";
import { normalizeWeights, useScoreWeights } from "@/providers/scoreWeights";
import type { ScoreWeights } from "@/shared/types";
import { AppText, Button, IconButton, Pill, Sheet } from "@/ui";
import { pct } from "./logic/format";
import { rawTotal, stepWeight, WEIGHT_MAX, WEIGHT_MIN } from "./logic/weights";

const CATEGORY_META: Record<keyof ScoreWeights, { label: string; description: string }> = {
  trend: { label: "Trend", description: "Moving averages, golden/death crosses, and ADX trend strength." },
  momentum: { label: "Momentum", description: "RSI, MACD histogram direction, and Stochastic." },
  volume: { label: "Volume", description: "OBV vs price, Money Flow Index (MFI), volume-price confirmation, and whether the stock is liquid enough to actually trade." },
  volatility: { label: "Volatility", description: "Bollinger Band position and squeeze detection." },
  divergence: { label: "Divergence", description: "RSI and MACD divergences — reversal signals." },
  quality: { label: "Quality", description: "Trend consistency, multi-timeframe alignment, distance from the 52-week high, plus valuation: P/E and dividend yield versus the EGX median." },
  risk_adjusted: { label: "Risk-Adjusted", description: "Annualized return vs the Egyptian T-bill, volatility, and ATR context." },
  relative_strength: { label: "Rel. Strength", description: "Performance vs EGX30 over 30 days (leaders vs laggards)." },
};

const CORE_CATS: (keyof ScoreWeights)[] = ["trend", "momentum", "volume", "volatility"];
const ADVANCED_CATS: (keyof ScoreWeights)[] = ["divergence", "quality", "risk_adjusted", "relative_strength"];

const PRESET_LABELS: Record<string, string> = {
  beginner_safe: "Beginner Safe",
  balanced: "Balanced",
  trend_follower: "Trend Follower",
  reversal_hunter: "Reversal Hunter",
  income_defensive: "Income / Defensive",
};

function WeightStepper({
  cat,
  raw,
  normalized,
  onChange,
}: {
  cat: keyof ScoreWeights;
  raw: number;
  normalized: number;
  onChange: (v: number) => void;
}) {
  const meta = CATEGORY_META[cat];
  return (
    <View className="gap-1.5">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <AppText className="font-mono text-sm text-white">{meta.label}</AppText>
          <AppText className="text-[11px] leading-snug text-white/40">{meta.description}</AppText>
        </View>
        <View className="items-end">
          <AppText className="font-mono-semibold text-sm text-accent">{`${normalized.toFixed(0)}%`}</AppText>
          <AppText className="text-[10px] text-white/40">{`raw ${raw.toFixed(0)}`}</AppText>
        </View>
      </View>
      <View className="flex-row items-center gap-3">
        <IconButton
          icon="remove"
          accessibilityLabel={`Decrease ${meta.label} weight`}
          onPress={() => onChange(stepWeight(raw, -1))}
        />
        <View className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
          <View
            className="h-full rounded-full bg-accent"
            style={{ width: pct(((raw - WEIGHT_MIN) / (WEIGHT_MAX - WEIGHT_MIN)) * 100) }}
          />
        </View>
        <IconButton
          icon="add"
          accessibilityLabel={`Increase ${meta.label} weight`}
          onPress={() => onChange(stepWeight(raw, 1))}
        />
      </View>
    </View>
  );
}

/** Port of web `ScoreWeightsModal` as a bottom sheet; the range sliders become steppers. */
export function ScoreWeightsSheet({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { draft, presets, saving, updateDraftField, applyPreset, resetDraft, save } = useScoreWeights();
  const [localError, setLocalError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const normalized = useMemo(() => normalizeWeights(draft), [draft]);
  const total = rawTotal(draft);

  const handleSave = async () => {
    setLocalError(null);
    try {
      await save();
      onSaved?.();
      onClose();
    } catch (e: unknown) {
      setLocalError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const handleCancel = () => {
    resetDraft();
    onClose();
  };

  const stepper = (cat: keyof ScoreWeights) => (
    <WeightStepper
      key={cat}
      cat={cat}
      raw={draft[cat] ?? 0}
      normalized={normalized[cat] ?? 0}
      onChange={(v) => updateDraftField(cat, v)}
    />
  );

  return (
    <Sheet visible={open} onClose={handleCancel} title="Composite Score Weights">
      <View className="gap-5 pb-6">
        <AppText className="text-xs text-white/50">Tune how each category contributes to the 0-100 score.</AppText>

        <View className="gap-2">
          <AppText className="text-[11px] uppercase tracking-wider text-white/40">Presets</AppText>
          <View className="flex-row flex-wrap gap-2">
            {Object.keys(presets).map((name) => (
              <Pill key={name} label={PRESET_LABELS[name] ?? name.replace(/_/g, " ")} onPress={() => applyPreset(name)} />
            ))}
          </View>
        </View>

        <View className="gap-5">
          <AppText className="text-[11px] uppercase tracking-wider text-white/40">Core categories</AppText>
          {CORE_CATS.map(stepper)}
        </View>

        <Button
          label={`${advancedOpen ? "Hide" : "Show"} advanced categories`}
          variant="ghost"
          onPress={() => setAdvancedOpen((v) => !v)}
        />
        {advancedOpen && <View className="gap-5">{ADVANCED_CATS.map(stepper)}</View>}

        <AppText className="text-[11px] leading-relaxed text-white/40">
          {`Raw total: ${total.toFixed(0)}. Values are auto-normalized to sum to 100 on save — you don't need to do the math yourself.`}
        </AppText>
        {localError && <AppText className="text-xs text-loss">{localError}</AppText>}

        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button label="Cancel" variant="secondary" disabled={saving} onPress={handleCancel} />
          </View>
          <View className="flex-1">
            <Button label="Save" loading={saving} disabled={saving || total === 0} onPress={handleSave} />
          </View>
        </View>
      </View>
    </Sheet>
  );
}
