import { View } from "react-native";

const block = "rounded-lg bg-white/5";

export function CardSkeleton() {
  return (
    <View accessibilityLabel="Loading" className="gap-3 rounded-xl border border-white/5 bg-charcoal p-4">
      <View className={`h-4 w-1/3 ${block}`} />
      <View className={`h-8 w-1/2 ${block}`} />
      <View className={`h-3 w-2/3 ${block}`} />
    </View>
  );
}

export function ChartSkeleton({ height = 256 }: { height?: number }) {
  return <View accessibilityLabel="Loading chart" className={block} style={{ height }} />;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <View accessibilityLabel="Loading" className="gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} className={`h-12 ${block}`} />
      ))}
    </View>
  );
}
