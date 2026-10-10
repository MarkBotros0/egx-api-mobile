/**
 * Advice severities. The panel is collapsed behind one tap, and the per-
 * severity count pills are what make that safe: "1 urgent" stays on screen
 * with the panel shut.
 */
import type { Signal } from "@/shared/types";

export const SEVERITY_ORDER = ["action_required", "warning", "opportunity", "info"] as const;
export type Severity = (typeof SEVERITY_ORDER)[number];

export interface SeverityMeta {
  icon: string;
  /** [singular, plural] as the collapsed header words it. */
  label: [string, string];
  tone: "loss" | "gain" | "accent";
  cardClass: string;
  iconClass: string;
}

export const SEVERITY_META: Record<Severity, SeverityMeta> = {
  action_required: {
    icon: "!!", label: ["urgent", "urgent"], tone: "loss",
    cardClass: "border-loss/30 bg-loss/10", iconClass: "bg-loss/30 text-loss",
  },
  warning: {
    icon: "!", label: ["warning", "warnings"], tone: "loss",
    cardClass: "border-loss/20 bg-loss/5", iconClass: "bg-loss/20 text-loss",
  },
  opportunity: {
    icon: "$", label: ["opportunity", "opportunities"], tone: "gain",
    cardClass: "border-gain/20 bg-gain/5", iconClass: "bg-gain/20 text-gain",
  },
  info: {
    icon: "i", label: ["note", "notes"], tone: "accent",
    cardClass: "border-accent/20 bg-accent/5", iconClass: "bg-accent/20 text-accent",
  },
};

export function tierOf(signal: Pick<Signal, "severity">): Severity {
  return (SEVERITY_ORDER as readonly string[]).includes(signal.severity)
    ? (signal.severity as Severity)
    : "info";
}

export interface SeverityCount {
  severity: Severity;
  count: number;
  label: string;
  tone: SeverityMeta["tone"];
}

export function severityCounts(signals: Signal[]): SeverityCount[] {
  return SEVERITY_ORDER.map((severity) => {
    const count = signals.filter((s) => tierOf(s) === severity).length;
    const meta = SEVERITY_META[severity];
    return { severity, count, label: `${count} ${meta.label[count === 1 ? 0 : 1]}`, tone: meta.tone };
  }).filter((c) => c.count > 0);
}
