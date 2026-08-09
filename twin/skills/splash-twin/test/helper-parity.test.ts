/**
 * The one place a cross-skill import is legitimate: asserting two DELIBERATE duplicates still
 * agree. This project duplicates helpers rather than sharing them — a skill must stay
 * copy-pasteable on its own — and the risk that buys is silent divergence: two copies that both
 * claim to implement the same rule can drift apart with nothing to notice. This file is the
 * guard against that, for every `wrap`/`measureText`/`deriveFurniture` copy found in the tree.
 *
 * FAMILIES. `measureText` has two genuinely different substrates that must NOT be asserted equal
 * against each other (proved below, empirically, not assumed): the resvg-based measurer
 * (`render-still.mjs`, measures via `Resvg.getBBox()` — real glyph ink) and the browser-Canvas
 * measurer the video beats use (`document.createElement("canvas").getContext("2d")` — and, in
 * this Bun test environment, `document` is undefined, so every video copy actually runs its own
 * `text.length * fontSize * 0.5` fallback). Two different, unrelated numbers for the same string —
 * comparing them directly is exactly the "impossible assertion" this task warns against, so this
 * file never does it. Each substrate gets its own family, compared only against copies that claim
 * to implement THAT substrate:
 *
 *   - resvg family: the vendored `render-still.mjs` copies (6 locations — every skill that
 *     renders a static frame, plus `shared/` and the installer's `root-template`).
 *   - canvas/video family: every video beat's own `measureText` (`EmissionsVideo`, and three
 *     later beats whose own doc-comments say the body is "identical on purpose" /
 *     "not interchangeable" with the resvg one: `MigrationVideo`, `LifeExpectancyVideo`,
 *     `Co2MapVideo`).
 *
 * `wrap` is one algorithm (greedy word-wrap on a measured width) duplicated far more than the
 * four copies the original task-9 draft named — this sweep found ten. Unlike `measureText`, wrap
 * copies all implement the SAME rule and so are all expected to agree, but only once each is fed
 * a CONSISTENT measurer — mixing measurers across families would reintroduce the same impossible
 * assertion by the back door. So:
 *
 *   - static family: copies that close over the resvg measurer directly (`EmissionsLine`,
 *     `ChartSeed`, `Co2MapStill`, `RankBars`), plus the two copies that take the measurer as an
 *     explicit parameter (`EmissionsWeb`, `ChartWebSeed`) — handed the SAME resvg measure here,
 *     which is exactly what isolates the wrapping RULE from the measuring substrate.
 *   - canvas/video family: the same four beats as the `measureText` canvas family, each wrapping
 *     with its own closed-over canvas measurer.
 *
 * `deriveFurniture` has no second substrate — every copy is (meant to be) the same vendored
 * `render-still.mjs` file — so it is compared in the resvg family's own shape, across all SIX
 * vendored locations, not a subset. A subset was tried first and reviewed: wiring only 3 of 6
 * left `twin-chart-video/scripts/render-still.mjs`'s own `deriveFurniture` unguarded, and a real
 * drift there (`mix(ground, ink, 0.18)` -> `0.40`) left the suite green. Each vendored copy is a
 * separate module instance running its own duplicated code, so the resvg `measureText` mutation
 * cycle proves nothing about `deriveFurniture` in the same file — it needed its own mutation
 * cycles, one per previously-unguarded copy (see the report).
 *
 * Every assertion below compares two DIFFERENT imports, never a function against itself.
 */

import { describe, it, expect, setDefaultTimeout } from "bun:test";

// The static-family wrap comparisons call the resvg measurer, uncached, on every growing
// word-boundary substring across several distinct vendored module instances at once
// (`loadSystemFonts: true` re-scans on a cold cache) — the default 5s per-test budget is too
// tight for the longest CASES string. Same fix this codebase already uses in
// `twin-chart-web/test/render-web.test.ts` for the same underlying rasteriser.
setDefaultTimeout(20000);

// measureText — resvg family: the still rasteriser's text measurer, vendored byte-identical into
// every skill that renders a static frame, plus `shared/` and the installer's `root-template`.
import { measureText as beatMeasure } from "../../twin-chart-beat/scripts/render-still.mjs";
import { measureText as videoRasterMeasure } from "../../twin-chart-video/scripts/render-still.mjs";
import { measureText as webRasterMeasure } from "../../twin-chart-web/scripts/render-still.mjs";
import { measureText as mapRasterMeasure } from "../../twin-map-beat/scripts/render-still.mjs";
import { measureText as sharedRasterMeasure } from "../../../shared/twin-chart-beat/render-still.mjs";
import { measureText as rootTemplateRasterMeasure } from "../assets/root-template/shared/twin-chart-beat/render-still.mjs";

// deriveFurniture — same vendored family as the resvg measurer above. All six locations, not a
// representative subset: fix-round-1 review proved (not inferred) that a subset leaves a real
// hole — `twin-chart-video/scripts/render-still.mjs`'s deriveFurniture drifted 0.18 -> 0.40 and
// the suite stayed green while only 3 of 6 copies were wired.
import { deriveFurniture as beatFurniture } from "../../twin-chart-beat/scripts/render-still.mjs";
import { deriveFurniture as videoRasterFurniture } from "../../twin-chart-video/scripts/render-still.mjs";
import { deriveFurniture as webRasterFurniture } from "../../twin-chart-web/scripts/render-still.mjs";
import { deriveFurniture as mapFurniture } from "../../twin-map-beat/scripts/render-still.mjs";
import { deriveFurniture as sharedFurniture } from "../../../shared/twin-chart-beat/render-still.mjs";
import { deriveFurniture as rootTemplateFurniture } from "../assets/root-template/shared/twin-chart-beat/render-still.mjs";

// contrast — the WCAG ratio, duplicated into `twin-palette` because that skill proposes colours
// against exactly the floor these renderers draw against. If the proposal's arithmetic ever
// diverged from the renderer's, a palette could be approved at a ratio the render never achieves —
// the two would disagree about the same chart while both looked correct on their own.
import { contrast as beatContrast } from "../../twin-chart-beat/scripts/render-still.mjs";
import { contrast as videoRasterContrast } from "../../twin-chart-video/scripts/render-still.mjs";
import { contrast as webRasterContrast } from "../../twin-chart-web/scripts/render-still.mjs";
import { contrast as mapRasterContrast } from "../../twin-map-beat/scripts/render-still.mjs";
import { contrast as sharedContrast } from "../../../shared/twin-chart-beat/render-still.mjs";
import { contrast as rootTemplateContrast } from "../assets/root-template/shared/twin-chart-beat/render-still.mjs";
import { contrast as paletteContrast } from "../../twin-palette/scripts/palette.mjs";

// readPalette/parsePalette — the recorded-answer reader, vendored into every render-still copy
// (a beat already imports that module to render at all) and duplicated in `twin-palette`, which
// owns the question the answer replies to. A drift here is the worst kind available: one copy
// accepting an `origin` the other rejects, or one defaulting where the other throws, means a beat
// renders in a colour nobody chose in exactly the places nobody is looking.
import { parsePalette as beatParse } from "../../twin-chart-beat/scripts/render-still.mjs";
import { parsePalette as videoRasterParse } from "../../twin-chart-video/scripts/render-still.mjs";
import { parsePalette as webRasterParse } from "../../twin-chart-web/scripts/render-still.mjs";
import { parsePalette as mapRasterParse } from "../../twin-map-beat/scripts/render-still.mjs";
import { parsePalette as sharedParse } from "../../../shared/twin-chart-beat/render-still.mjs";
import { parsePalette as rootTemplateParse } from "../assets/root-template/shared/twin-chart-beat/render-still.mjs";
import { parsePalette as paletteParse } from "../../twin-palette/scripts/palette.mjs";

// measureText — canvas/video family: the browser-Canvas substrate, duplicated (never vendored —
// `#shared/*` only carries the node-only resvg module) into every video beat.
import {
  measureText as emissionsVideoMeasure,
  wrap as emissionsVideoWrap,
} from "../../twin-chart-video/assets/EmissionsVideo";
import {
  measureText as migrationMeasure,
  wrap as migrationWrap,
} from "../../../proof/migration/MigrationVideo";
import {
  measureText as lifeExpMeasure,
  wrap as lifeExpWrap,
} from "../../../proof/life-expectancy/LifeExpectancyVideo";
import {
  measureText as mapVideoMeasure,
  wrap as mapVideoWrap,
} from "../../twin-map-beat/assets/Co2MapVideo";

// wrap — static family: copies that close over the resvg measurer directly.
import { wrap as emissionsLineWrap } from "../../../proof/co2-suisse/EmissionsLine";
import { wrap as chartSeedWrap } from "../../twin-chart-beat/assets/ChartSeed";
import { wrap as co2MapStillWrap } from "../../twin-map-beat/assets/Co2MapStill";
import { wrap as rankBarsWrap } from "../../../proof/RankBars";

// wrap — parameterised copies: take the measurer as an explicit argument. Handed the resvg
// measure below, which puts them in the static family for comparison purposes.
import { wrap as emissionsWebWrap } from "../../../proof/co2-suisse/EmissionsWeb";
import { wrap as chartWebSeedWrap } from "../../twin-chart-web/assets/ChartWebSeed";

const FONT = { fontSize: 26, fontWeight: 700 };

const CASES: Array<[string, number]> = [
  ["", 300],
  ["Annemasse", 300],
  ["a b c d e f g h i j k l m n o p", 120],
  ["Supercalifragilisticexpialidocious", 40],
  ["two  spaces   between", 200],
  ["exactly at the boundary", 1],
];

// Proves the premise stated in the file doc-comment, so it is never merely assumed: the two
// measureText substrates genuinely disagree in this test environment. If a future change made
// them agree everywhere, the families above would still be correct to keep separate — but this
// pins today's evidence for why they must never be compared with `.toBe()` against each other.
describe("measureText — the two substrates are NOT the same function (must not be cross-compared)", () => {
  it("should disagree on at least one real string", () => {
    const disagreements = CASES.filter(
      ([text]) => beatMeasure(text, FONT) !== emissionsVideoMeasure(text, FONT),
    );
    expect(disagreements.length).toBeGreaterThan(0);
  });
});

describe("measureText — resvg family agrees (every vendored render-still.mjs copy)", () => {
  for (const [text] of CASES) {
    it(`should measure ${JSON.stringify(text)} identically across every vendored copy`, () => {
      const reference = beatMeasure(text, FONT);
      expect(videoRasterMeasure(text, FONT)).toBe(reference);
      expect(webRasterMeasure(text, FONT)).toBe(reference);
      expect(mapRasterMeasure(text, FONT)).toBe(reference);
      expect(sharedRasterMeasure(text, FONT)).toBe(reference);
      expect(rootTemplateRasterMeasure(text, FONT)).toBe(reference);
    });
  }
});

describe("measureText — canvas/video family agrees (every video beat's own text measurer)", () => {
  for (const [text] of CASES) {
    it(`should measure ${JSON.stringify(text)} identically across every video beat`, () => {
      const reference = emissionsVideoMeasure(text, FONT);
      expect(migrationMeasure(text, FONT)).toBe(reference);
      expect(lifeExpMeasure(text, FONT)).toBe(reference);
      expect(mapVideoMeasure(text, FONT)).toBe(reference);
    });
  }
});

describe("deriveFurniture — resvg family agrees (every vendored render-still.mjs copy)", () => {
  const grounds = ["#FFFFFF", "#000000", "#0B7A75", "#71717A"];
  for (const ground of grounds) {
    it(`should derive furniture for ${ground} identically across every vendored copy`, () => {
      const reference = beatFurniture(ground);
      expect(videoRasterFurniture(ground)).toEqual(reference);
      expect(webRasterFurniture(ground)).toEqual(reference);
      expect(mapFurniture(ground)).toEqual(reference);
      expect(sharedFurniture(ground)).toEqual(reference);
      expect(rootTemplateFurniture(ground)).toEqual(reference);
    });
  }
});

// fr — the French number formatter WAS guarded here, by importing nine copies and executing them
// on the same numbers. That family found a real defect (three copies hand-rolled the grouping regex,
// three of those without its `g` flag, and three more were `value.toFixed()` — a function named
// `fr` returning an English number, which reached delivered artifacts). It has been REMOVED, and
// the reason is worth keeping.
//
// The import list itself became the defect. Once the beats were repaired, five of them turned out
// to declare `lang="en"`, so their formatters correctly stopped being French — `web-co2-ranking`
// now exports `en` on `en-GB`. A hand-written import list cannot follow that: it turned the suite
// red for a correct change, and two agents responded by keeping a DEAD `fr` export alive purely so
// this file would keep importing it. **A guard that forces dead code to exist has inverted its own
// purpose.**
//
// The replacement is `number-format-honest.test.ts`, which WALKS the tree and asserts the two rules
// that survived both rounds — no hand-rolled thousands grouping, and a name may not lie about its
// locale — so a formatter added, deleted or renamed needs nobody to remember anything. It states
// its own limits, including the one this family covered and it does not: executing two copies side
// by side to prove they agree. That coverage is genuinely lost, and is named here rather than
// quietly dropped.

describe("contrast — every copy agrees, renderers and the palette proposal alike", () => {
  // Two poles, a real house accent, a mid-grey, and one pair that lands near the 3:1 non-text
  // floor — the band where a drifted implementation would flip a proposal's verdict rather than
  // merely shift a number nobody reads.
  const PAIRS: Array<[string, string]> = [
    ["#000000", "#FFFFFF"],
    ["#0B7A75", "#FFFFFF"],
    ["#F2C744", "#FFFFFF"],
    ["#71717A", "#71717A"],
    ["#1B7F4B", "#111111"],
  ];
  for (const [a, b] of PAIRS) {
    it(`should measure ${a} against ${b} identically in every copy`, () => {
      const reference = beatContrast(a, b);
      expect(videoRasterContrast(a, b)).toBe(reference);
      expect(webRasterContrast(a, b)).toBe(reference);
      expect(mapRasterContrast(a, b)).toBe(reference);
      expect(sharedContrast(a, b)).toBe(reference);
      expect(rootTemplateContrast(a, b)).toBe(reference);
      expect(paletteContrast(a, b)).toBe(reference);
    });
  }
});

describe("parsePalette — every copy reads and REFUSES the same things", () => {
  const VALID = `---\nground: "#FFFFFF"\naccent: "#0B7A75"\norigin: newsroom\n---\n`;
  // Each rejection is a rule the copies must agree on, not just a shape they must parse. A copy
  // that accepted `origin: default`, or filled in a missing ground, would put an unchosen colour
  // into a chart while every other copy refused — the exact silent divergence this file exists for.
  const REFUSALS: Array<[string, string]> = [
    ["no front matter", "just prose"],
    ["a missing ground", `---\naccent: "#0B7A75"\norigin: newsroom\n---\n`],
    [
      "a malformed ground",
      `---\nground: white\naccent: "#0B7A75"\norigin: newsroom\n---\n`,
    ],
    [
      "an origin nobody chose",
      `---\nground: "#FFFFFF"\naccent: "#0B7A75"\norigin: default\n---\n`,
    ],
  ];
  const copies: Array<[string, typeof beatParse]> = [
    ["chart-video", videoRasterParse],
    ["chart-web", webRasterParse],
    ["map-beat", mapRasterParse],
    ["shared", sharedParse],
    ["root-template", rootTemplateParse],
    ["twin-palette", paletteParse],
  ];

  it("should read a valid PALETTE.md identically in every copy", () => {
    const reference = beatParse(VALID);
    for (const [name, parse] of copies) {
      expect([name, parse(VALID)]).toEqual([name, reference]);
    }
  });

  for (const [label, text] of REFUSALS) {
    it(`should refuse ${label} in every copy`, () => {
      expect(() => beatParse(text)).toThrow();
      for (const [name, parse] of copies) {
        // The copy's name rides in the assertion so a failure names WHICH copy drifted.
        expect([
          name,
          (() => {
            try {
              parse(text);
              return "accepted";
            } catch {
              return "refused";
            }
          })(),
        ]).toEqual([name, "refused"]);
      }
    });
  }
});

describe("wrap — static family agrees (closes over the resvg measurer, or is handed it explicitly)", () => {
  for (const [text, width] of CASES) {
    it(`should wrap ${JSON.stringify(text)} at ${width} identically across the static family`, () => {
      const reference = emissionsLineWrap(text, width, FONT);
      expect(chartSeedWrap(text, width, FONT)).toEqual(reference);
      expect(co2MapStillWrap(text, width, FONT)).toEqual(reference);
      expect(rankBarsWrap(text, width, FONT)).toEqual(reference);
      // The parameterised copies take the measurer as an argument rather than closing over one;
      // handing them the same canonical resvg measure isolates the wrapping RULE from the
      // measuring substrate, which is what makes this comparison meaningful rather than vacuous.
      expect(emissionsWebWrap(text, width, FONT, beatMeasure)).toEqual(
        reference,
      );
      expect(chartWebSeedWrap(text, width, FONT, beatMeasure)).toEqual(
        reference,
      );
    });
  }

  // None of CASES above happens to land a trial's measured width EXACTLY on maxWidth (checked:
  // the closest is "a b c d e f" at 119.53px against a 120px ceiling) — so `>` and `>=` agree on
  // every one of them, and a mutation of the boundary condition would go undetected by pure
  // coincidence. This case derives its width from the measurer itself, so the tie is exact by
  // construction, not by luck — it is what actually makes the mutation in Step 3 observable.
  it("should treat a trial that lands EXACTLY on maxWidth the same way in every copy", () => {
    const tieWidth = beatMeasure("Aa Bb", FONT);
    const text = "Aa Bb Cc";
    const reference = emissionsLineWrap(text, tieWidth, FONT);
    expect(chartSeedWrap(text, tieWidth, FONT)).toEqual(reference);
    expect(co2MapStillWrap(text, tieWidth, FONT)).toEqual(reference);
    expect(rankBarsWrap(text, tieWidth, FONT)).toEqual(reference);
    expect(emissionsWebWrap(text, tieWidth, FONT, beatMeasure)).toEqual(
      reference,
    );
    expect(chartWebSeedWrap(text, tieWidth, FONT, beatMeasure)).toEqual(
      reference,
    );
  });
});

describe("wrap — canvas/video family agrees (each beat closes over its own canvas measurer)", () => {
  for (const [text, width] of CASES) {
    it(`should wrap ${JSON.stringify(text)} at ${width} identically across every video beat`, () => {
      const reference = emissionsVideoWrap(text, width, FONT);
      expect(migrationWrap(text, width, FONT)).toEqual(reference);
      expect(lifeExpWrap(text, width, FONT)).toEqual(reference);
      expect(mapVideoWrap(text, width, FONT)).toEqual(reference);
    });
  }

  // Same reasoning as the static family's own tie case above: in this Bun test environment
  // `document` is undefined, so every video copy's measurer runs its `text.length * fontSize *
  // 0.5` fallback — clean integer arithmetic, so a tie can be picked exactly rather than derived.
  it("should treat a trial that lands EXACTLY on maxWidth the same way in every video beat", () => {
    const text = "Aa Bb Cc";
    const tieWidth = "Aa Bb".length * FONT.fontSize * 0.5;
    const reference = emissionsVideoWrap(text, tieWidth, FONT);
    expect(migrationWrap(text, tieWidth, FONT)).toEqual(reference);
    expect(lifeExpWrap(text, tieWidth, FONT)).toEqual(reference);
    expect(mapVideoWrap(text, tieWidth, FONT)).toEqual(reference);
  });
});
