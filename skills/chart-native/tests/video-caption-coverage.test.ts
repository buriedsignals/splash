import { describe, it, expect } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// WHICH CHART VIDEOS CARRY THE WALK'S WORDS — sub-project ①, kept MECHANICAL rather than claimed.
//
// A caption only means something for a type that can HAVE a walk. Today that is `bar` and only
// `bar` (lib/brain/beats.ts's canDraftBeats: the chart track's video is open for it alone). So
// this does not touch the other forty-one wrappers — it pins that the decision was taken, and
// why, so a forty-third type cannot be added without someone answering the question.
// ---------------------------------------------------------------------------
const DIR = join(import.meta.dir, "..", "remotion", "src");
const read = (f: string) => readFileSync(join(DIR, f), "utf8");

const CARRIES_WORDS = ["BarReveal.tsx"];

const DOES_NOT: Record<string, string> = {
  // The one type whose video is walk-capable but whose walk is CLOSED, for a measured reason: a
  // line draws continuously by cumulative length, so it has no per-subject entrance to reorder
  // and nothing to hang a per-beat sentence on. Opening the caption without the order would give
  // it nothing to say. Both open together, or neither.
  "LineReveal.tsx": "its video has no walk yet — a line draws continuously",
};

describe("the chart video and the walk's words", () => {
  for (const f of CARRIES_WORDS)
    it(`${f} renders through the shared stage`, () => {
      expect(read(f)).toContain("RevealStage");
    });

  for (const [f, why] of Object.entries(DOES_NOT))
    it(`${f} does not — ${why}`, () => {
      expect(read(f)).not.toContain("RevealStage");
    });

  it("every OTHER reveal is untouched — no walk can be drafted for it at all", () => {
    const all = readdirSync(DIR).filter(
      (f) => f.endsWith("Reveal.tsx") && f !== "RevealStage.tsx",
    );
    const accounted = new Set([...CARRIES_WORDS, ...Object.keys(DOES_NOT)]);
    const others = all.filter((f) => !accounted.has(f));
    // …and they are genuinely untouched, not merely unlisted.
    for (const f of others) expect(read(f)).not.toContain("RevealStage");
    // The count is pinned so a new composition shows up here as a decision to take.
    // FORTY-ONE, measured — the spec said "42 compositions", which counted the directory's
    // files rather than its reveal components. Small, and worth correcting where it is checked.
    expect(all.length).toBe(41);
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
