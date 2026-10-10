import { useState } from "react";
import { View } from "react-native";
import { AppText, Button, TextField } from "@/ui";
import { pnlTone, signed, signedPct, todayIso } from "@/features/portfolio/logic/format";
import { previewSale, sellDateError, type SaleSubmit, type SellPosition } from "@/features/portfolio/logic/sale";
import { DateField } from "./DateField";
import { FormError } from "./FormError";
import { FormScroll } from "./FormScroll";
import { useSingleFlight } from "./useSingleFlight";

export interface SellHoldingFormProps {
  position: SellPosition;
  onSubmit: (data: SaleSubmit) => Promise<void>;
  onCancel: () => void;
  error?: string | null;
  onDismissError?: () => void;
}

export function SellHoldingForm({ position, onSubmit, onCancel, error = null, onDismissError }: SellHoldingFormProps) {
  const [quantityText, setQuantityText] = useState(() =>
    String(position.lots.reduce((n, l) => n + l.quantity, 0)),
  );
  const [priceText, setPriceText] = useState("");
  const [sellDate, setSellDate] = useState(() => todayIso());
  const [notes, setNotes] = useState("");
  const { run, pending: submitting } = useSingleFlight();

  const today = todayIso();
  const p = previewSale(position, quantityText, priceText);
  const dateError = sellDateError(sellDate, p.earliestSellDate, today, p.multiLot);
  const canSubmit = p.quantity.ok && p.price.ok && !dateError && !submitting;

  const edited = () => {
    if (error) onDismissError?.();
  };

  const submit = () => {
    if (!p.quantity.ok || !p.price.ok || dateError || !canSubmit) return;
    const data: SaleSubmit = { quantity: p.quantity.value, sell_price: p.price.value, sell_date: sellDate, notes };
    return run(() => onSubmit(data));
  };

  return (
    <FormScroll>
      <AppText className="font-sans text-xs text-white/40">
        {p.multiLot
          ? `${p.held} shares held across ${position.lots.length} purchases · average ${p.avgBuyPrice.toFixed(2)} EGP`
          : `${p.held} shares held · bought at ${p.avgBuyPrice.toFixed(2)} EGP`}
      </AppText>

      <View>
        <TextField
          label="Quantity to sell *"
          value={quantityText}
          onChangeText={(t) => {
            setQuantityText(t);
            edited();
          }}
          keyboardType="number-pad"
          placeholder="Shares to sell"
          error={p.quantity.ok ? null : p.quantity.error}
        />
        <AppText className="mt-1 font-sans text-[10px] text-white/30">{`of ${p.held} shares`}</AppText>
      </View>

      <TextField
        label="Sell Price (EGP) *"
        value={priceText}
        onChangeText={(t) => {
          setPriceText(t);
          edited();
        }}
        keyboardType="decimal-pad"
        placeholder="95.00"
        error={p.price.ok ? null : p.price.error}
      />

      <DateField
        label="Sell Date"
        value={sellDate}
        minimumDate={p.earliestSellDate || undefined}
        maximumDate={today}
        onChange={(d) => {
          setSellDate(d);
          edited();
        }}
        hint={
          p.multiLot
            ? `On or after the newest purchase this sale reaches (${p.earliestSellDate || "unknown"})`
            : `On or after the buy date (${p.earliestSellDate || "unknown"})`
        }
        error={dateError}
      />

      <TextField
        label="Notes (optional)"
        value={notes}
        onChangeText={(t) => {
          setNotes(t);
          edited();
        }}
        placeholder="Why did you sell?"
      />

      {p.multiLot && p.parts.length > 0 && (
        <View className="rounded-lg border border-white/5 bg-white/5 p-3">
          <AppText className="font-sans text-xs text-white/40">
            {`Sold oldest first, from ${p.parts.length === 1 ? "1 purchase" : `${p.parts.length} purchases`}`}
          </AppText>
          <View className="mt-2 gap-1">
            {p.parts.map((part) => (
              <View key={part.id} className="flex-row items-baseline justify-between gap-3">
                <AppText className="font-mono text-xs text-white/70">{`${part.quantity} × ${part.buy_price.toFixed(2)}`}</AppText>
                <AppText className="font-sans text-[10px] text-white/30">{`bought ${part.buy_date}`}</AppText>
                {part.pnl !== null ? (
                  <AppText className={`font-mono text-xs ${pnlTone(part.pnl)}`}>{signed(part.pnl)}</AppText>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      )}

      {p.pnl !== null && (
        <View className="rounded-lg border border-white/5 bg-white/5 p-3">
          <AppText className="font-sans text-xs text-white/40">This sale realizes</AppText>
          <View className="flex-row items-baseline gap-2">
            <AppText className={`font-mono-semibold text-lg ${pnlTone(p.pnl)}`}>{`${signed(p.pnl, 2)} EGP`}</AppText>
            {p.pnlPct !== null ? (
              <AppText className={`font-mono text-sm ${pnlTone(p.pnl)}`}>{`(${signedPct(p.pnlPct, 2)})`}</AppText>
            ) : null}
          </View>
        </View>
      )}

      {!p.quantity.ok || !p.price.ok ? (
        <AppText className="text-xs text-white/40">Enter the shares and the sell price to record this sale</AppText>
      ) : null}

      <FormError message={error} />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button label="Record Sale" onPress={submit} disabled={!canSubmit} loading={submitting} />
        </View>
        <View className="flex-1">
          <Button label="Cancel" variant="secondary" onPress={onCancel} />
        </View>
      </View>
    </FormScroll>
  );
}
