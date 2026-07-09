import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Furniture-localization parity guard (feedback→system). The suggester injects
// `config.lang` onto EVERY produced config (spec-to-config.ts), and ChartFrame
// localizes the "Source" furniture from it (Source: / Source : / Quelle: / Fonte:).
// A base chart component that renders <ChartFrame> but forgets to thread
// `lang={config.lang}` would silently print ENGLISH furniture for a fr/de/it
// deliverable — the exact bug this batch fixed. This test scans every base
// component's source and fails if any ChartFrame consumer drops the language,
// so a NEW type inherits the requirement mechanically (it can't be reintroduced).
const SRC = join(import.meta.dir, "..", "src");

const baseComponents = readdirSync(SRC).filter(
  (f) =>
    f.endsWith("Chart.tsx") &&
    !f.startsWith("Interactive") &&
    readFileSync(join(SRC, f), "utf8").includes("<ChartFrame"),
);

describe("locale furniture parity — every base ChartFrame consumer threads lang", () => {
  it("finds a non-trivial set of base chart components to guard", () => {
    // sanity: the scan is wired (not silently matching zero files)
    expect(baseComponents.length).toBeGreaterThan(30);
  });

  for (const f of baseComponents) {
    it(`${f} passes lang={config.lang} to ChartFrame`, () => {
      const src = readFileSync(join(SRC, f), "utf8");
      expect(src).toContain("lang={config.lang}");
    });

    it(`${f} declares a lang field on its config`, () => {
      const src = readFileSync(join(SRC, f), "utf8");
      // either the shared "lang?: Lang" field or an explicit lang typing
      expect(/lang\?:\s*Lang/.test(src)).toBe(true);
    });
  }
});
