import { EmptyState, Screen } from "@/ui";

/** Shell content for a route whose screen is built by a later plan. */
export function ComingSoon({ title, plan }: { title: string; plan: number }) {
  return (
    <Screen>
      <EmptyState title={title} body={`Arrives in plan ${plan}.`} />
    </Screen>
  );
}
