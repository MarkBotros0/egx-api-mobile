import { View } from "react-native";
import type { MacroData } from "@/shared/types";
import { AppText, Card } from "@/ui";
import { directionArrow, formatMacroValue, macroDetails } from "./logic/display";

function Indicator({
  label, value, suffix, direction, detail, positiveIsGood = true, neutral = false,
}: {
  label: string; value: number | null; suffix?: string; direction: string | null;
  detail?: string; positiveIsGood?: boolean; neutral?: boolean;
}) {
  const arrow = directionArrow(direction, { positiveIsGood, neutral });
  return (
    <View className="rounded-xl border border-white/5 bg-white/5 p-4">
      <AppText className="font-sans-medium text-[10px] uppercase tracking-wider text-white/30">{label}</AppText>
      {value != null ? (
        <View className="mt-1 flex-row items-baseline gap-1.5">
          <AppText className="font-mono-semibold text-lg text-white">{formatMacroValue(value)}</AppText>
          {suffix ? <AppText className="font-sans text-xs text-white/30">{suffix}</AppText> : null}
          <AppText className={`font-sans text-base ${arrow.className}`}>{arrow.glyph}</AppText>
        </View>
      ) : (
        <AppText className="mt-1 font-sans text-sm text-white/20">Unavailable</AppText>
      )}
      {detail ? <AppText className="mt-1 font-sans text-[10px] text-white/30">{detail}</AppText> : null}
    </View>
  );
}

function monthDetail(month: number | null | undefined): string | undefined {
  return month != null ? `${month > 0 ? "+" : ""}${month.toFixed(1)}% this month` : undefined;
}

/**
 * Another market's card (US): its benchmark and risk-free rate, DISPLAY ONLY.
 * US scores take no macro modulation (their calibration ran without it), and
 * the card says so rather than implying the reading moves a score.
 */
function BenchmarkMacroCard({ data }: { data: MacroData }) {
  const bench = data.benchmark;
  const rate = data.interest_rate;
  if (!bench?.value && !rate?.value) {
    return (
      <Card>
        <AppText className="text-center font-sans text-xs text-white/30">Macro data unavailable</AppText>
      </Card>
    );
  }
  return (
    <Card>
      <AppText variant="title" className="mb-4 font-sans-semibold text-lg text-white">
        Macro Context
      </AppText>
      <View className="gap-3">
        <Indicator label={rate?.label ?? "Risk-free rate"} value={rate?.value ?? null} suffix="%" direction={rate?.direction ?? null} neutral />
        <Indicator label={bench?.label ?? "Index"} value={bench?.value ?? null} direction={bench?.direction ?? null} detail={monthDetail(bench?.monthly_change_pct)} />
      </View>
      <AppText className="mt-3 border-t border-white/5 pt-3 font-sans text-[10px] leading-relaxed text-white/30">
        Shown for context only: these readings do not change any score.
      </AppText>
    </Card>
  );
}

export function MacroCard({ data }: { data: MacroData }) {
  if (data.benchmark !== undefined) return <BenchmarkMacroCard data={data} />;
  if (!data.egx30?.value && !data.usd_egp?.value && !data.interest_rate?.value) {
    return (
      <Card>
        <AppText className="text-center font-sans text-xs text-white/30">Macro data unavailable</AppText>
      </Card>
    );
  }
  const details = macroDetails(data);
  const ctx = data.currency_context;

  return (
    <Card>
      <AppText variant="title" className="mb-4 font-sans-semibold text-lg text-white">
        Macro Context
      </AppText>
      <View className="gap-3">
        <Indicator label="CBE Interest Rate" value={data.interest_rate?.value ?? null} suffix="%" direction={data.interest_rate?.direction ?? null} detail={details.rate} neutral />
        <Indicator label="USD/EGP" value={data.usd_egp?.value ?? null} direction={data.usd_egp?.direction ?? null} detail={details.fx} positiveIsGood={false} />
        <Indicator label="EGX30 Index" value={data.egx30?.value ?? null} direction={data.egx30?.direction ?? null} detail={details.egx30} />
      </View>
      {ctx && (
        <AppText className="mt-3 border-t border-white/5 pt-3 font-sans text-[10px] leading-relaxed text-white/30">
          Every figure in this app is in Egyptian pounds. Over the last {ctx.years} years the EGX30 rose {ctx.egp_multiple}×
          in pounds and {ctx.usd_multiple}× in dollars. Both are true — they answer different questions.
        </AppText>
      )}
    </Card>
  );
}
