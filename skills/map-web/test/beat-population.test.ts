/**
 * THE POPULATION A GUARD JUDGES IS DERIVED FROM WHERE BEATS LIVE, NEVER FROM ONE ROOT SOMEBODY
 * REMEMBERED.
 *
 * Measured on a real story (2026-08-22, `stories/real-owid-life-expectancy`): a 241-region world
 * choropleth was produced, rendered, driven live and approved while this format's two bake-side
 * guards never once looked at it. Two independent reasons, and each was enough on its own:
 *
 *   1. the walk enumerated `proof/` only, and a beat a journalist commissions lives at
 *      `stories/<slug>/beats/<id>/` — four levels under the root rather than two;
 *   2. it read `PALETTE.md` from INSIDE the beat directory, while the palette phase records one
 *      answer at the STORY root, so even a story beat moved under `proof/` would have been skipped.
 *
 * Both are the same shape: a population TYPED rather than DERIVED. The floors below are therefore
 * written against what the derivation finds, and the two story beats are named — a floor of ">= 4"
 * is what let this stay green while a third of the format's beats were invisible.
 */
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BEAT_ROOTS,
  declaresMapWeb,
  discoverMapWebBeats,
  mediumFormatOf,
  paletteDirFor,
  TWIN,
} from "../scripts/discover-pages.mjs";

describe("what a brief declares", () => {
  it("reads the medium/format line through its own emphasis markers", () => {
    expect(
      mediumFormatOf(
        "**Type:** choropleth. **Medium/format:** map / web. **Channel:** article",
      ),
    ).toBe("map / web");
    // `proof/mapgen-symbol-web` and `proof/mapgen-dot-web` both bold the format word. A reader that
    // matched the literal `map / web` would drop two of this format's own five proof beats.
    expect(
      declaresMapWeb(
        "**Medium/format:** map / **web** — one self-contained page.",
      ),
    ).toBe(true);
  });

  it("does not claim a chart beat or a map beat in another format", () => {
    expect(declaresMapWeb("**Medium/format:** chart / web.")).toBe(false);
    expect(declaresMapWeb("**Medium/format:** map / static.")).toBe(false);
    expect(declaresMapWeb("no such line here")).toBe(false);
  });
});

describe("the roots a beat can live under", () => {
  it("names both, and the story root is the deeper one", () => {
    expect(BEAT_ROOTS.map((root) => root.under).sort()).toEqual([
      "proof",
      "stories",
    ]);
    const story = BEAT_ROOTS.find((root) => root.under === "stories");
    const proof = BEAT_ROOTS.find((root) => root.under === "proof");
    expect(story!.depth).toBeGreaterThan(proof!.depth);
  });
});

describe("the palette a beat actually rendered in", () => {
  it("is found at the story root, which is two levels above the beat", () => {
    const beat = join(
      TWIN,
      "stories/real-owid-life-expectancy/beats/1-life-expectancy-2023",
    );
    expect(existsSync(join(beat, "PALETTE.md"))).toBe(false);
    expect(paletteDirFor(beat)).toBe(
      join(TWIN, "stories/real-owid-life-expectancy"),
    );
  });

  it("is the beat's own when the beat holds one", () => {
    const beat = join(TWIN, "proof/mapgen-choropleth-web");
    expect(paletteDirFor(beat)).toBe(beat);
  });

  it("answers null rather than climbing past the root", () => {
    // `skills/map-web` holds its own `PALETTE.md` for the seed, so the walk stops there — this
    // asks the other question: a directory with no palette anywhere above it inside the root.
    expect(paletteDirFor(join(TWIN, "skills/doctrine/test"))).toBe(null);
  });
});

describe("every map / web beat in this tree", () => {
  const beats = discoverMapWebBeats();

  it("finds the ones under proof/ AND the ones under stories/", () => {
    const rels = beats.map((beat) => beat.rel);
    expect(rels).toContain("proof/mapgen-choropleth-web");
    expect(rels).toContain("proof/mapgen-symbol-web");
    // The two story beats the old `proof/`-only walk could not see. Named, not counted: a floor is
    // what let five beats stand in for seven.
    expect(rels).toContain(
      "stories/real-owid-life-expectancy/beats/1-life-expectancy-2023",
    );
    expect(rels).toContain(
      "stories/stress-f-housing-pressure/beats/housing-pressure-choropleth",
    );
    expect(beats.length).toBeGreaterThanOrEqual(7);
  });

  it("hands every one of them a palette directory that really holds a PALETTE.md", () => {
    const without = beats.filter((beat) => beat.paletteDir === null);
    expect(without).toEqual([]);
    for (const beat of beats)
      expect(existsSync(join(beat.paletteDir!, "PALETTE.md"))).toBe(true);
  });

  it("only lists directories whose own BRIEF.md declares the cell", () => {
    for (const beat of beats)
      expect(
        declaresMapWeb(readFileSync(join(beat.dir, "BRIEF.md"), "utf8")),
      ).toBe(true);
  });
});
