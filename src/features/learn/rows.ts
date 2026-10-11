/**
 * The Learn screen is ONE virtualised list. This flattens the curriculum (or
 * the search results) into its rows, and resolves deep-link ids to rows.
 * Pure, so the layout rules are testable without rendering.
 */
import type { VisualSpec } from "@/shared/learnVisuals";
import { conceptKey, type Concept, type ConceptEntry, type Module } from "@/shared/learn";

export type LearnRow =
  | { type: "hero"; key: "hero" }
  | { type: "controls"; key: "controls" }
  | { type: "module"; key: string; module: Module; index: number; open: boolean }
  | { type: "overview"; key: string; module: Module; spec: VisualSpec }
  | { type: "concept"; key: string; module: Module; concept: Concept }
  | { type: "results-head"; key: "results-head"; count: number }
  | { type: "empty"; key: "empty" }
  | { type: "footer"; key: "footer" };

/** The search + pill row; pinned with FlatList stickyHeaderIndices. */
export const CONTROLS_INDEX = 1;

export function buildRows({
  modules,
  collapsed,
  results,
}: {
  modules: Module[];
  collapsed: ReadonlySet<string>;
  results: ConceptEntry[] | null;
}): LearnRow[] {
  const rows: LearnRow[] = [
    { type: "hero", key: "hero" },
    { type: "controls", key: "controls" },
  ];

  if (results) {
    rows.push({ type: "results-head", key: "results-head", count: results.length });
    if (!results.length) rows.push({ type: "empty", key: "empty" });
    for (const { concept, module } of results) {
      rows.push({ type: "concept", key: `r-${module.id}-${conceptKey(concept)}`, concept, module });
    }
    return rows;
  }

  modules.forEach((module, index) => {
    const open = !collapsed.has(module.id);
    rows.push({ type: "module", key: `m-${module.id}`, module, index, open });
    if (!open) return;
    if (module.overview) rows.push({ type: "overview", key: `o-${module.id}`, module, spec: module.overview });
    for (const concept of module.concepts) {
      rows.push({ type: "concept", key: `c-${conceptKey(concept)}`, concept, module });
    }
  });
  rows.push({ type: "footer", key: "footer" });
  return rows;
}

export interface DeepLinkTarget {
  moduleId: string;
  rowKey: string;
}

/**
 * Same reach as the web's getElementById on /learn#<id>: a module id, a
 * concept id, or an id-less concept's title slug (its card's anchor).
 */
export function resolveTarget(modules: Module[], id: string): DeepLinkTarget | null {
  for (const m of modules) {
    if (m.id === id) return { moduleId: m.id, rowKey: `m-${m.id}` };
    for (const c of m.concepts) {
      if (c.id === id || conceptKey(c) === id) return { moduleId: m.id, rowKey: `c-${conceptKey(c)}` };
    }
  }
  return null;
}

export function withOpen(collapsed: ReadonlySet<string>, id: string): ReadonlySet<string> {
  if (!collapsed.has(id)) return collapsed;
  const next = new Set(collapsed);
  next.delete(id);
  return next;
}

export function toggledSet(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}
