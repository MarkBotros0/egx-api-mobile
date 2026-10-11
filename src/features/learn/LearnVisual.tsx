/**
 * Renders one curriculum diagram (VisualSpec). Twin of the web's
 * components/learn/LearnVisual.tsx — a new kind needs a case in both.
 */
import { View } from "react-native";
import { specProps, type VisualSpec } from "@/shared/learnVisuals";
import { LiveChart } from "./LiveChart";
import {
  AllocationDonut,
  BarCompare,
  ConeChart,
  CorrelationGrid,
  LedgerRows,
  MiniChart,
  StepFlow,
  ZoneScale,
} from "./visuals";
import { PositionSizer, RsiPlayground, ScoreBandExplorer, StopLossCalculator, TBillRace } from "./widgets";

export function LearnVisual({ spec, armed = true }: { spec: VisualSpec; armed?: boolean }) {
  switch (spec.kind) {
    case "MiniChart":
      return <MiniChart {...specProps(spec)} />;
    case "ZoneScale":
      return <ZoneScale {...specProps(spec)} />;
    case "BarCompare":
      return <BarCompare {...specProps(spec)} />;
    case "StepFlow":
      return <StepFlow {...specProps(spec)} />;
    case "AllocationDonut":
      return <AllocationDonut {...specProps(spec)} />;
    case "CorrelationGrid":
      return <CorrelationGrid {...specProps(spec)} />;
    case "ConeChart":
      return <ConeChart {...specProps(spec)} />;
    case "LedgerRows":
      return <LedgerRows {...specProps(spec)} />;
    case "Stack":
      return (
        <View className="gap-2.5">
          {spec.children.map((child, i) => (
            <LearnVisual key={i} spec={child} armed={armed} />
          ))}
        </View>
      );
    case "LiveChart":
      return (
        <LiveChart
          variant={spec.variant}
          caption={spec.caption}
          armed={armed}
          fallback={<LearnVisual spec={spec.fallback} armed={armed} />}
        />
      );
    case "RsiPlayground":
      return <RsiPlayground />;
    case "StopLossCalculator":
      return <StopLossCalculator />;
    case "PositionSizer":
      return <PositionSizer />;
    case "TBillRace":
      return <TBillRace />;
    case "ScoreBandExplorer":
      return <ScoreBandExplorer />;
  }
  return null;
}
