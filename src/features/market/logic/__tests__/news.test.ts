import { NEWS } from "@/features/market/testing/fixtures";
import { isFresh, newsCaveats, relativeAge, sourceName, storySite, yourStocksEmptyNote } from "../news";

const now = new Date("2026-10-10T12:00:00Z");
const ago = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();

describe("relativeAge", () => {
  it("states every item's real age", () => {
    expect(relativeAge(ago(0.5), now)).toBe("just now");
    expect(relativeAge(ago(5), now)).toBe("5h ago");
    expect(relativeAge(ago(72), now)).toBe("3d ago");
    expect(relativeAge("not a date", now)).toBe("");
  });
});

describe("isFresh", () => {
  it("is true under a day old", () => {
    expect(isFresh(ago(23), now)).toBe(true);
    expect(isFresh(ago(25), now)).toBe(false);
  });
});

describe("sourceName", () => {
  it("title-cases slugs and keeps known acronyms", () => {
    expect(sourceName("dow-jones")).toBe("Dow Jones");
    expect(sourceName("lse")).toBe("LSE");
    expect(sourceName("reuters")).toBe("Reuters");
    expect(sourceName("arab-finance")).toBe("Arab Finance");
    expect(sourceName(null)).toBe("Wire");
  });
});

describe("storySite", () => {
  it("names the site a story opens on", () => {
    expect(storySite("https://www.tradingview.com/news/n1")).toBe("tradingview.com");
    expect(storySite("https://www.arabfinance.com/en/news/newdetails/48489")).toBe("arabfinance.com");
    expect(storySite("not a url")).toBe("the publisher's site");
  });
});

describe("newsCaveats", () => {
  it("keeps what is missing visible", () => {
    expect(newsCaveats(NEWS)).toEqual(["2 of your 5 stocks had no news (ESRS, EKHO)", "some sources timed out"]);
    expect(
      newsCaveats({ ...NEWS, status: "ok", coverage: { ...NEWS.coverage, symbols_without_news: [], symbols_over_cap: ["X", "Y"] } })
    ).toEqual(["2 more over the fetch limit"]);
  });
});

describe("yourStocksEmptyNote", () => {
  it("tells a new user how to get news, and an existing one that it was quiet", () => {
    expect(yourStocksEmptyNote({ ...NEWS.coverage, symbols_requested: 0 })).toBe(
      "Add a holding or watch a stock, and news about it shows up here."
    );
    expect(yourStocksEmptyNote(NEWS.coverage)).toBe(
      "Nothing in the last 30 days for the stocks you hold or watch."
    );
  });
});
