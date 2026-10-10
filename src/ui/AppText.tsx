import { Text, type TextProps } from "react-native";

import { mergeTextClasses } from "./textClasses";

type Variant = "body" | "muted" | "label" | "title" | "mono";

const VARIANT: Record<Variant, string> = {
  body: "font-sans text-sm text-white",
  muted: "font-sans text-sm text-white/50",
  label: "font-sans-medium text-xs text-white/60",
  title: "font-sans-bold text-2xl text-white",
  mono: "font-mono text-sm text-white",
};

/** The only way text is rendered: RN has no inherited default font. */
export function AppText({ className = "", variant = "body", ...rest }: TextProps & { className?: string; variant?: Variant }) {
  return <Text className={mergeTextClasses(VARIANT[variant], className)} {...rest} />;
}
