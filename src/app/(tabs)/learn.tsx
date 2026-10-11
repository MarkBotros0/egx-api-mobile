import { router, useLocalSearchParams } from "expo-router";
import { LearnScreen } from "@/features/learn/LearnScreen";

/**
 * /learn?concept=<id> — the mobile spelling of the web's /learn#<id>
 * (`learnHref(id)` builds it). The param is cleared once handled so tapping
 * the same "Learn more" link again scrolls again.
 */
export default function LearnRoute() {
  const params = useLocalSearchParams<{ concept?: string | string[] }>();
  const concept = Array.isArray(params.concept) ? params.concept[0] : params.concept;
  return (
    <LearnScreen
      concept={concept || undefined}
      onConceptHandled={() => router.setParams({ concept: undefined })}
    />
  );
}
