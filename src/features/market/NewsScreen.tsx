import { View } from "react-native";
import { fetchNews } from "@/shared/api";
import { AppText, CardSkeleton, Screen } from "@/ui";
import { useKeyedFetch } from "./hooks/useKeyedFetch";
import { useNow } from "./hooks/useNow";
import { newsCaveats, yourStocksEmptyNote } from "./logic/news";
import { NewsList } from "./NewsList";
import { RefreshableScroll } from "./RefreshableScroll";

/** Port of web `news/page.tsx`; pull-to-refresh re-requests the feed. */
export function NewsScreen() {
  const news = useKeyedFetch("news", fetchNews);
  const now = new Date(useNow(60_000));
  const data = news.data;

  return (
    <Screen scroll={false}>
      <RefreshableScroll testID="news-scroll" refreshing={news.refreshing} onRefresh={news.refresh} contentClassName="px-4 py-6 pb-10">
        <AppText className="font-sans-bold text-2xl text-white">News</AppText>
        {news.refreshError && (
          <AppText className="text-xs text-white/50" testID="refresh-error">
            Couldn&apos;t refresh — showing the last loaded data
          </AppText>
        )}

        {news.loading ? (
          <View className="mt-6 gap-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </View>
        ) : news.error ? (
          <View className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <AppText className="text-sm text-white/70">The news feed didn&apos;t load.</AppText>
            <AppText className="mt-1 text-xs text-white/40">{news.error}</AppText>
          </View>
        ) : data ? (
          <>
            <View className="mb-6 mt-1">
              <AppText className="text-xs text-white/40">
                {`Your holdings and the market, last ${data.coverage.window_days} days`}
              </AppText>
              {newsCaveats(data).length > 0 && (
                <AppText className="mt-1.5 text-[11px] leading-relaxed text-white/30">{newsCaveats(data).join(" · ")}</AppText>
              )}
            </View>
            <NewsList title="Your stocks" items={data.your_stocks} emptyNote={yourStocksEmptyNote(data.coverage)} now={now} />
            <NewsList
              title="Market"
              items={data.market}
              emptyNote={`No EGX30 news in the last ${data.coverage.window_days} days.`}
              now={now}
            />
          </>
        ) : null}
      </RefreshableScroll>
    </Screen>
  );
}
