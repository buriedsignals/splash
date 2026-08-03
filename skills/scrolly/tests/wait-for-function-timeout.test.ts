// skills/scrolly/tests/wait-for-function-timeout.test.ts
//
// Behavioural proof, not a source-scan: actually calls Playwright's `waitForFunction` in the
// fixed three-arg shape this repo's snap scripts now use (see
// skills/map-native/tests/wait-for-function-arity-drift.test.ts for the source-scan half of this
// fix, which stops the buggy two-arg shape from being reintroduced) and measures how long it
// actually waits before giving up on a condition that never becomes true. This is the "prove it,
// don't assume it" half: Playwright's docs say the two-arg form `waitForFunction(fn, options)`
// binds `{ timeout }` to the page function's `arg`, not to `options`, silently falling back to
// the 30_000ms default — this test does not trust that reading, it clocks the wall-clock
// behaviour of the fixed shape directly. (The buggy shape's ~30s fallback was verified once by
// hand during the fix — see the followups report — and is deliberately not re-run here on every
// `bun test`: encoding a guaranteed 30-second wait into the committed suite buys no additional
// regression protection over the fast source-scan drift lock, only slower CI.)
import { describe, it, expect } from "bun:test";
import { chromium } from "playwright";

describe("Playwright waitForFunction 3-arg form honours a short custom timeout", () => {
  it("rejects near the passed timeout, not Playwright's 30_000ms default", async () => {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.goto("about:blank");
      const start = Date.now();
      let threw = false;
      try {
        await page.waitForFunction(() => false, undefined, { timeout: 400 });
      } catch {
        threw = true;
      }
      const elapsed = Date.now() - start;
      expect(threw).toBe(true);
      // Generous band around the 400ms we asked for — well under Playwright's 30_000ms default.
      // If the timeout were silently discarded (the bug this fix closes), this call would
      // instead run out the default and blow past this bound.
      expect(elapsed).toBeGreaterThanOrEqual(300);
      expect(elapsed).toBeLessThan(5_000);
    } finally {
      await browser.close();
    }
  }, 10_000);
});
