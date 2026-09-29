import { describe, expect, it } from "bun:test";
import { fetchWithTimeout } from "../scripts/fetch-document.mjs";

describe("fetchWithTimeout against the real network", () => {
  // No API key, no secret — a bare GET is the whole contract, so nothing is skipped here. It lives
  // in the live lane (`bun run test:live`) because it reaches a real host, which the fast lane
  // never does; the offline contract is `fetch-document.test.ts`. It is written to be a useful
  // assertion whether or not THIS machine can currently reach the internet: a real page comes back
  // ok with real HTML, or the real network failure comes back as a structured, bounded verdict —
  // never a hang, never a thrown exception. Either outcome is the contract holding.
  it("should return a concrete, bounded verdict for a real URL", async () => {
    const start = Date.now();
    const result = await fetchWithTimeout("https://www.heidi.news/", {
      timeoutMs: 10000,
    });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(11000);
    expect(typeof result.ok).toBe("boolean");
    if (result.ok) {
      expect(result.text).toContain("<html");
    } else {
      expect(typeof result.error).toBe("string");
    }
    console.log(
      `heidi.news fetch: ok=${result.ok} status=${result.status} elapsed=${elapsed}ms`,
    );
  }, 15000);
});
