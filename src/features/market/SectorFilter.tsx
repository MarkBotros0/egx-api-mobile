import { Pill, PillRow } from "@/ui";
import { SECTORS } from "./logic/dashboardFilters";

/** The web `<select>` becomes a scrolling pill row — one tap, no picker sheet. */
export function SectorFilter({ selected, onChange }: { selected: string; onChange: (sector: string) => void }) {
  return (
    <PillRow>
      {SECTORS.map((s) => (
        <Pill key={s} label={s} active={selected === s} onPress={() => onChange(s)} />
      ))}
    </PillRow>
  );
}
