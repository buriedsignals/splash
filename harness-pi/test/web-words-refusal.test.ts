import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { wordsRefusal } from "../craft/_shared/verify-failures.mjs";

// gx-connected-scatter web, Qwen3.5-9B (gx-connected-scatter-web-seeded-osaurus-qwen-1794861292737): two of three
// failures were the typeface probe's known false red on an embedded face, one was a real overlap on the phone. The
// false reds are dropped only when ALL failures are false reds, so the refusal listed all three under "fix the words …
// (a label too long, two marks answering the same)", naming neither which one beat.mjs could answer nor what it was.
const FONT = '  - typeface: Open Sans 500 italic really DRAWS, not its fallback  — 597.1px in ""Open Sans", Helvetica" against 597.5px in "Helvetica" — 0.4px apart';
const OVER = '  - stories/x/beats/1/renders/p.html @ 375: "Share of low-carbon in the sixteen (%)" is printed over "Germany"';

describe("a web verification refusal with a known false red beside a real failure", () => {
  it("should name the real failure", () => {
    expect(wordsRefusal([FONT, OVER], [FONT])).toContain('"Share of low-carbon in the sixteen (%)" is printed over "Germany"');
  });
  it("should not send the model to the false red", () => {
    expect(wordsRefusal([FONT, OVER], [FONT])).not.toContain("really DRAWS");
  });
  it("should say the other failures need no change", () => {
    expect(wordsRefusal([FONT, OVER], [FONT])).toContain("1 other failure is a known false red");
  });
  it("should count only the failures beat.mjs can answer", () => {
    expect(wordsRefusal([FONT, OVER], [FONT])).toContain("failed (1)");
  });
  it("should refuse through it in the web kit", () => {
    const src = readFileSync(join(import.meta.dirname, "..", "craft", "_shared", "web.mjs"), "utf8");
    expect(src).toContain("wordsRefusal(listed, falseReds)");
  });
});
