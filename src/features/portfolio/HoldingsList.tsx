import { useMemo, useState } from "react";
import { View } from "react-native";
import { groupHoldings } from "@/shared/positions";
import type { HoldingAnalysis } from "@/shared/types";
import { EmptyState, confirm } from "@/ui";
import { PositionCard } from "./PositionCard";

export interface HoldingsListProps {
  holdings: HoldingAnalysis[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  /** By SYMBOL: a sale comes out of the whole position; the screen resolves the lots. */
  onSell: (symbol: string) => void;
  onAddDividend: (holding: HoldingAnalysis) => void;
}

export function HoldingsList({ holdings, onEdit, onDelete, onSell, onAddDividend }: HoldingsListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const positions = useMemo(() => groupHoldings(holdings), [holdings]);

  if (!holdings.length) {
    return <EmptyState title="No holdings yet" body="Add your first stock to start tracking your portfolio." />;
  }

  const requestDelete = async (lot: { id: string; symbol: string }) => {
    const ok = await confirm({
      title: "Remove holding?",
      message: `${lot.symbol} will be removed from your portfolio. This cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (ok) onDelete(lot.id);
  };

  return (
    <View className="gap-3">
      {positions.map((p) => (
        <PositionCard
          key={p.symbol}
          position={p}
          expanded={expanded === p.symbol}
          onToggle={() => setExpanded(expanded === p.symbol ? null : p.symbol)}
          onEdit={onEdit}
          onRequestDelete={requestDelete}
          onSell={onSell}
          onAddDividend={onAddDividend}
        />
      ))}
    </View>
  );
}
