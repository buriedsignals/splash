import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// EVERY CHART VIDEO CARRIES THE WALK'S WORDS — kept MECHANICAL rather than claimed.
//
// It used to be `bar` and only `bar`, and that was the hole: 40 types offered one narrative kind,
// one offer is not a question, so the journalist was never asked and no storyboard was ever
// proposed. The cause was a conflation — showing the sentence and REORDERING the entrance were
// treated as one capability, when only the first is what the guard asks for.
//
// So the list of exceptions is gone. What is pinned instead: all 41 render through the shared
// stage, each declaring the type whose clock it follows, and the registry knows every one of them.
// A 42nd composition fails here until someone decides its grain.
// ---------------------------------------------------------------------------
import { CHART_WALKS } from "../src/core/chart-walk";

const DIR = join(import.meta.dir, "..", "remotion", "src");
const read = (f: string) => readFileSync(join(DIR, f), "utf8");

const REVEALS = () =>
  readdirSync(DIR).filter(
    (f) => f.endsWith("Reveal.tsx") && f !== "RevealStage.tsx",
  );

describe("every chart video carries the walk's words", () => {
  it("all 41 reveal compositions render through the shared stage", () => {
    const without = REVEALS().filter((f) => !read(f).includes("RevealStage"));
    expect(without).toEqual([]);
    // Pinned so a new composition arrives here as a decision to take, not as a silent addition.
    expect(REVEALS().length).toBe(41);
  });

  it("each one declares WHICH type's clock it follows, and the registry knows it", () => {
    const declared = new Map<string, string>();
    for (const f of REVEALS()) {
      const m = read(f).match(/nativeType="([a-z-]+)"/);
      expect({ file: f, declares: m?.[1] ?? null }).not.toEqual({
        file: f,
        declares: null,
      });
      // …and it is a type the walk registry has decided a grain for — a typo here would give the
      // sequenced clock to a type that has an entrance, which is a sentence over the wrong
      // subject and nothing would say so.
      expect({ file: f, known: !!CHART_WALKS[m![1]!] }).toEqual({
        file: f,
        known: true,
      });
      declared.set(m![1]!, f);
    }
    // One composition per type, and every type covered: no two wrappers claiming the same clock.
    expect(declared.size).toBe(REVEALS().length);
    expect(
      Object.keys(CHART_WALKS).filter((t) => !declared.has(t)),
    ).toEqual([]);
  });
});

// ★ The caption sits in the SAME pixel space as the frame's furniture. The source line is laid
// out in scaled pixels; a band positioned in unscaled ones collides with it exactly when the
// scale is not 1 — which is every portrait and every square, i.e. every social channel. Measured
// on a real 1080×1920 render: the band bit into "Source: Glamos", and the landscape proof that
// preceded it (scale 1) could not have shown it.
describe("the caption clears the source line at every scale", () => {
  it("the stage takes a scale, and the wrapper passes the one the chart is drawn at", () => {
    const stage = read("RevealStage.tsx");
    expect(stage).toContain("sourceFooterReserve(TYPE.source) * scale");
    // …and the wrapper hands it the same value it hands the chart, not a default of 1.
    const bar = read("BarReveal.tsx");
    const stagePropsBlock = bar.slice(
      bar.indexOf("<RevealStage"),
      bar.indexOf("<BarChart"),
    );
    expect(stagePropsBlock).toContain("scale={scale}");
  });
});
