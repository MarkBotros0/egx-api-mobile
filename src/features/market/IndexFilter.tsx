import { Pill, PillRow } from "@/ui";

export interface IndexTab {
  id: string;
  label: string;
}

/** The market's index tabs (EG: EGX30..NILEX; US: S&P 500, NASDAQ-100, Dow 30), then All. */
export function IndexFilter({
  tabs,
  selected,
  onChange,
}: {
  tabs: IndexTab[];
  selected: string;
  onChange: (index: string) => void;
}) {
  return (
    <PillRow>
      {tabs.map((t) => (
        <Pill key={t.id} label={t.label} active={selected === t.id} onPress={() => onChange(t.id)} />
      ))}
    </PillRow>
  );
}
