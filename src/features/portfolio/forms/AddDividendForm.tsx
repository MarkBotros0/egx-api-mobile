import { useState } from "react";
import { View } from "react-native";
import { AppText, Button, DateField, Pill, PillRow, TextField } from "@/ui";
import {
  buildDividendPayload,
  perShareAmount,
  presetSharesText,
  type DividendPayload,
  type DividendSymbolOption,
} from "@/features/portfolio/logic/dividend";
import { todayIso } from "@/lib/dates";
import { FormError } from "./FormError";
import { FormScroll } from "./FormScroll";
import { useSingleFlight } from "./useSingleFlight";

export interface AddDividendFormProps {
  /** Open holdings AND sold-out symbols: a dividend can land after selling out. */
  symbols: DividendSymbolOption[];
  presetSymbol?: string;
  onSubmit: (payload: DividendPayload) => Promise<void>;
  onCancel: () => void;
  error?: string | null;
  onDismissError?: () => void;
}

export function AddDividendForm({ symbols, presetSymbol, onSubmit, onCancel, error = null, onDismissError }: AddDividendFormProps) {
  const [symbol, setSymbol] = useState(() => presetSymbol || symbols[0]?.symbol || "");
  const [amountText, setAmountText] = useState("");
  const [payDate, setPayDate] = useState(() => todayIso());
  const [sharesText, setSharesText] = useState(() => presetSharesText(symbols, presetSymbol || symbols[0]?.symbol || ""));
  const [notes, setNotes] = useState("");
  const { run, pending: submitting } = useSingleFlight();

  const today = todayIso();
  const result = buildDividendPayload({ symbol, options: symbols, amountText, payDate, sharesText, notes, today });
  const errors = result.ok ? null : result.errors;
  const perShare = perShareAmount(amountText, sharesText);
  const canSubmit = result.ok && !submitting;

  const edited = () => {
    if (error) onDismissError?.();
  };

  const submit = () => {
    if (!result.ok || !canSubmit) return;
    const { payload } = result;
    return run(() => onSubmit(payload));
  };

  return (
    <FormScroll>
      <AppText className="font-sans text-xs text-white/40">
        Cash the company paid you for holding it. Enter what actually landed in your account — already after the
        dividend tax.
      </AppText>

      <View>
        <AppText variant="label" className="mb-1 font-sans text-xs text-white/40">Stock *</AppText>
        {symbols.length ? (
          <PillRow>
            {symbols.map((s) => (
              <Pill
                key={s.symbol}
                label={s.symbol}
                active={s.symbol === symbol}
                onPress={() => {
                  setSymbol(s.symbol);
                  setSharesText(presetSharesText(symbols, s.symbol));
                  edited();
                }}
              />
            ))}
          </PillRow>
        ) : (
          <AppText className="font-sans text-xs text-white/30">No stocks yet</AppText>
        )}
      </View>

      <View>
        <TextField
          label="Amount received (EGP) *"
          value={amountText}
          onChangeText={(t) => {
            setAmountText(t);
            edited();
          }}
          keyboardType="decimal-pad"
          placeholder="1200.00"
          error={errors?.amount ?? null}
        />
        <AppText className="mt-1 font-sans text-[10px] text-white/30">The total that reached your account</AppText>
      </View>

      {/* No minimum: a dividend is anchored to the stock, not to one purchase. */}
      <DateField
        label="Pay Date"
        value={payDate}
        maximumDate={today}
        onChange={(d) => {
          setPayDate(d);
          edited();
        }}
        error={errors?.date ?? null}
      />

      <View>
        <TextField
          label="Shares held (optional)"
          value={sharesText}
          onChangeText={(t) => {
            setSharesText(t);
            edited();
          }}
          keyboardType="number-pad"
          placeholder="500"
          error={errors?.shares ?? null}
        />
        <AppText className="mt-1 font-sans text-[10px] text-white/30">Only used to show a per-share figure</AppText>
      </View>

      <TextField
        label="Notes (optional)"
        value={notes}
        onChangeText={(t) => {
          setNotes(t);
          edited();
        }}
        placeholder="e.g. 2025 annual dividend"
      />

      {perShare !== null && (
        <View className="rounded-lg border border-white/5 bg-white/5 p-3">
          <AppText className="font-sans text-xs text-white/40">That works out to</AppText>
          <AppText className="font-mono-semibold text-lg text-white">{`${perShare.toFixed(2)} EGP per share`}</AppText>
        </View>
      )}

      {!result.ok ? (
        <AppText className="font-sans text-xs text-white/40">Pick a stock and enter the amount received to record this dividend</AppText>
      ) : null}

      <FormError message={error} />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button label="Record Dividend" onPress={submit} disabled={!canSubmit} loading={submitting} />
        </View>
        <View className="flex-1">
          <Button label="Cancel" variant="secondary" onPress={onCancel} />
        </View>
      </View>
    </FormScroll>
  );
}
