import { Pill, PillRow } from "@/ui";
import { INDICES } from "./logic/dashboardFilters";

export function IndexFilter({ selected, onChange }: { selected: string; onChange: (index: string) => void }) {
  return (
    <PillRow>
      {INDICES.map((idx) => (
        <Pill key={idx} label={idx} active={selected === idx} onPress={() => onChange(idx)} />
      ))}
    </PillRow>
  );
}
