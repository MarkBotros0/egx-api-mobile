type Group = "font" | "size" | "color" | "align" | null;

const SIZES = /^text-(xs|sm|base|lg|xl|[2-9]xl|\[\d+(\.\d+)?px\])$/;
const ALIGN = /^text-(left|center|right|justify|start|end)$/;

function groupOf(cls: string): Group {
  const base = cls.split(":").pop() ?? cls;
  if (/^font-(sans|mono)/.test(base)) return "font";
  if (SIZES.test(base)) return "size";
  if (ALIGN.test(base)) return "align";
  if (base.startsWith("text-")) return "color";
  return null;
}

/** Drops variant classes whose group (font, size, colour) the override also sets. */
export function mergeTextClasses(variantClasses: string, override: string): string {
  const over = override.split(/\s+/).filter(Boolean);
  if (over.length === 0) return variantClasses;
  const taken = new Set(over.map(groupOf).filter((g): g is Exclude<Group, null> => g !== null));
  const kept = variantClasses
    .split(/\s+/)
    .filter(Boolean)
    .filter((c) => {
      const g = groupOf(c);
      return g === null || !taken.has(g);
    });
  return [...kept, ...over].join(" ");
}
