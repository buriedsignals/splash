import { describe, it, expect } from "bun:test";
import { INFOVIZ_API, searchInspiration } from "../scripts/search.mjs";

// A real search spends one of the day's anonymous searches for this address, so it runs only when
// asked for explicitly.
describe(`against the real Infoviz gallery at ${INFOVIZ_API}`, () => {
  const enabled = process.env.SPLASH_LIVE_INFOVIZ === "1";
  if (!enabled) {
    console.log(
      "Skipping live infoviz search: set SPLASH_LIVE_INFOVIZ=1 to spend one anonymous search.",
    );
  }

  it.skipIf(!enabled)(
    "should return a list, or say the daily limit is reached, for a real subject",
    async () => {
      const result = await searchInspiration({ query: "floods", apiBase: INFOVIZ_API });
      if (!result.ok) {
        expect(result.reason).toBe("limit-reached");
        return;
      }
      expect(Array.isArray(result.items)).toBe(true);
      for (const item of result.items) {
        expect(item.url).toStartWith("http");
        expect(item.title.length).toBeGreaterThan(0);
      }
      expect(result.quota.limit).toBeGreaterThan(0);
    },
    30000,
  );
});
