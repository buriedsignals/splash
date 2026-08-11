import { describe, it, expect, setDefaultTimeout } from "bun:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture, contrast } from "../scripts/render-still.mjs";
import {
  STEPS_META,
  FRAME,
  SAFE_AREA,
  ImageFrame,
  DrawnGraphicFrame,
  type ScrollyStepMeta,
} from "../assets/ScrollySeed.tsx";
import {
  deriveFacts,
  parseReadings,
  readStation,
} from "../assets/gauge-data.ts";
import { render, renderScrolly, SEED } from "../scripts/render-scrolly.mjs";
import { pickActiveStep, measureProgress } from "../assets/interaction.mjs";

// `deriveFurniture`/`contrast` are cheap, but `render`/`renderScrolly` load a native rasteriser
// nowhere in this file directly — kept anyway, the same default-timeout bump every other genre's
// own test file carries for the first file bun:test happens to load.
setDefaultTimeout(20000);

const SCRIPTS_DIR = join(import.meta.dirname, "..", "scripts");

// ---------------------------------------------------------------------------
// STEPS_META — the seed's own narrative arc, and the structural proof this genre earns its
// existence by assembling DIFFERENT media, not by stepping four states of one chart.
// ---------------------------------------------------------------------------

describe("STEPS_META — the seed's own narrative arc", () => {
  it("should carry at least two steps", () => {
    expect(STEPS_META.length).toBeGreaterThanOrEqual(2);
  });

  // Correction 2: "it must work for more than two steps" — the seed itself, not just a synthetic
  // fixture, has to carry more than the minimum the mechanism will accept, or nothing ever proves
  // the two-step case wasn't accidentally the only one that worked.
  it("should carry more than two steps — the seed itself proves the sequence generalises, not just a two-step fixture", () => {
    expect(STEPS_META.length).toBeGreaterThan(2);
  });

  it("should give every step at least one non-empty paragraph, resolved from the beat's own facts", async () => {
    const facts = await seedFacts();
    for (const step of STEPS_META) {
      const paragraphs = step.prose(facts);
      expect(paragraphs.length).toBeGreaterThan(0);
      for (const p of paragraphs) expect(p.trim().length).toBeGreaterThan(0);
    }
  });

  it("should carry every step with a unique id", () => {
    const ids = STEPS_META.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should demonstrate the mechanism with at least two VISIBLY DIFFERENT kinds of frame — not several states of one chart", () => {
    // This is the structural check for correction 2: a scrolly earns its existence by ASSEMBLING
    // DIFFERENT MEDIA. A seed whose every step shares one frameKind would be exactly the
    // duplication SKILL.md's own "When to use" tells a reader to reach for an animated beat
    // instead of.
    const kinds = new Set(STEPS_META.map((s) => s.frameKind));
    expect(kinds.size).toBeGreaterThanOrEqual(2);
  });
});

/** The seed's own facts, read from its own frozen files — the argument every step's `prose` takes.
 *  See `assets/gauge-data.ts` for why the prose is a function of these rather than a literal. */
async function seedFacts() {
  const dir = join(import.meta.dirname, "..", "assets", "sample-data");
  const [rdb, csv] = await Promise.all([
    readFile(join(dir, "potomac-station.rdb"), "utf8"),
    readFile(join(dir, "potomac-2024.csv"), "utf8"),
  ]);
  return { station: readStation(rdb), gauge: deriveFacts(parseReadings(csv)) };
}

// ---------------------------------------------------------------------------
// pickActiveStep — the one pure piece of the DOM wiring, unit-tested directly
// (assets/interaction.mjs's own doc-comment: initScrolly itself is DOM wiring, proven by
// driving a real browser, not by a test).
// ---------------------------------------------------------------------------

// The lane, as `initScrolly` hands it over since the eighth correction: the prose column's own
// scrollport, top to bottom. It is written here as a 100px band inside a larger coordinate space
// because these are viewport coordinates and a panel is expected to be measured above and below it;
// what the function is given is one rect and every panel's rect, and nothing else.
const LANE = { top: 280, bottom: 380 };
/** A panel of `height` whose bottom edge sits at `bottom`. */
const at = (stepId: string, bottom: number, height = 80) => ({
  stepId,
  top: bottom - height,
  bottom,
});

/** Slices ONE CSS rule's own declaration block out of the rendered stylesheet, so an assertion
 *  about a rule cannot be satisfied by a doc-comment that mentions it. This file shipped a test for
 *  six builds that passed on prose describing a deleted rule; see "should give the prose its own
 *  cell", below. */
function rule(html: string, selector: string): string {
  const at = html.indexOf(`\n${selector} {`);
  if (at < 0) throw new Error(`no \`${selector}\` rule in the rendered CSS`);
  const open = html.indexOf("{", at);
  const close = html.indexOf("}", open);
  return html.slice(open + 1, close);
}

/** A rule with its own COMMENTS stripped — the declarations, and nothing else. This file already
 *  learned once that a CSS assertion greping a whole stylesheet cannot tell a rule from a comment
 *  about a rule (`margin-top: calc(-1 * var(--graphic-h))` passed for six builds after the rule was
 *  deleted, because the string survived in the doc-comment explaining its removal). `rule` fixed
 *  that for the stylesheet; this fixes it INSIDE a rule, where every declaration in this scaffold
 *  is now surrounded by the paragraphs that justify it. */
function declarations(html: string, selector: string): string {
  return rule(html, selector).replace(/\/\*[\s\S]*?\*\//g, "");
}

describe("pickActiveStep — which FRAME the graphic shows", () => {
  it("should pick the panel occupying most of the lane", () => {
    expect(
      pickActiveStep([at("a", 300), at("b", 380), at("c", 460)], LANE),
    ).toBe("b");
  });

  it("should ignore panels that do not reach the lane at all", () => {
    expect(pickActiveStep([at("a", 100), at("b", 340)], LANE)).toBe("b");
  });

  it("should return null when no panel is in the lane", () => {
    expect(pickActiveStep([at("a", 100), at("b", 900)], LANE)).toBeNull();
  });

  it("should return null for an empty list", () => {
    expect(pickActiveStep([], LANE)).toBeNull();
  });

  // THE DEFECT THIS FUNCTION'S SIGNATURE EXISTS TO MAKE IMPOSSIBLE. The rule it replaced took the
  // entries of one IntersectionObserver callback — the panels whose ratio had just crossed a
  // threshold — and activated the best of THOSE. A callback carrying one panel therefore activated
  // it whatever every other panel was doing, so on a continuous scroll the active step oscillated
  // between the outgoing and incoming panel. This function cannot express that: it is handed every
  // panel's current position and has nothing else to go on.
  it("should decide from the full set, so a single moving panel cannot win over a parked one", () => {
    const parked = at("parked", 380);
    for (const bottom of [200, 240, 280, 320]) {
      // The other panel is arriving; at no point does it take the step from the parked one until
      // it genuinely occupies more of the lane.
      expect(pickActiveStep([parked, at("arriving", bottom)], LANE)).toBe(
        "parked",
      );
    }
  });

  it("should hand over exactly once as one panel replaces another, never flapping", () => {
    // The outgoing panel rises out of the lane while the incoming one parks. Sampled across that
    // whole crossing, the winner changes ONCE and never changes back.
    const winners: (string | null)[] = [];
    for (let rise = 0; rise <= 120; rise += 4)
      winners.push(
        pickActiveStep([at("out", 380 - rise), at("in", 500 - rise)], LANE),
      );
    const changes = winners.filter((w, i) => i > 0 && w !== winners[i - 1]);
    expect(changes.length).toBe(1);
    expect(winners[0]).toBe("out");
    expect(winners[winners.length - 1]).toBe("in");
  });

  // Correction 2: "it must work for more than two steps" — this function never reads how many
  // panels it was given, but this locks that as a fact rather than an assumption, at the counts
  // the brief named, with the winner planted in the MIDDLE so a rule that only ever compares
  // neighbours or checks the ends would fail.
  for (const n of [4, 6, 8]) {
    it(`should find the winner among ${n} panels wherever it sits in the list`, () => {
      const panels = Array.from({ length: n }, (_, i) => at(`s${i}`, 300));
      const middle = Math.floor(n / 2);
      panels[middle] = at(`s${middle}`, 380);
      expect(pickActiveStep(panels, LANE)).toBe(`s${middle}`);
    });
  }
});

describe("measureProgress — the CONTINUOUS signal a consumer scrubs a visual against", () => {
  // Panels in document order, centres 100px apart, in a lane whose centre line is at 330.
  const cards = (...centres: number[]) =>
    centres.map((c, i) => ({ stepId: `s${i}`, top: c - 20, bottom: c + 20 }));

  it("should be exactly the index when that panel's own centre is on the line", () => {
    expect(measureProgress(cards(330, 430, 530), LANE)).toBeCloseTo(0, 6);
    expect(measureProgress(cards(230, 330, 430), LANE)).toBeCloseTo(1, 6);
    expect(measureProgress(cards(130, 230, 330), LANE)).toBeCloseTo(2, 6);
  });

  // THE LOCK-STEP PROPERTY, stated as a test rather than as an argument: a consumer scrubbing on
  // this number reaches the moment a caption names exactly when that caption reaches the middle of
  // its column. Interpolating a container's own scrollTop instead is what lets the two drift.
  it("should interpolate smoothly and monotonically between two card centres", () => {
    const seen: number[] = [];
    for (let shift = 0; shift <= 100; shift += 5)
      seen.push(measureProgress(cards(330 - shift, 430 - shift, 530 - shift), LANE));
    expect(seen[0]).toBeCloseTo(0, 6);
    expect(seen[seen.length - 1]).toBeCloseTo(1, 6);
    expect(seen[10]).toBeCloseTo(0.5, 6);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThan(seen[i - 1]);
  });

  it("should clamp before the first card arrives and after the last one passes", () => {
    // Every centre still below the line: the reader has not reached the first card.
    expect(measureProgress(cards(400, 500, 600), LANE)).toBe(0);
    // Every centre above it: there is nowhere further to go.
    expect(measureProgress(cards(100, 200, 300), LANE)).toBe(2);
  });

  it("should never move backwards as the cards travel up", () => {
    let last = -1;
    for (let shift = 0; shift <= 400; shift += 7) {
      const now = measureProgress(cards(330 - shift, 430 - shift, 530 - shift), LANE);
      expect(now).toBeGreaterThanOrEqual(last);
      last = now;
    }
  });

  it("should handle a degenerate page rather than throw", () => {
    expect(measureProgress([], LANE)).toBe(0);
    expect(measureProgress(cards(330), LANE)).toBe(0);
  });

  // Nothing here reads a panel's HEIGHT: the signal is about where a card's centre is, so a beat
  // whose steps carry two lines and five lines alike stays in step with its own words.
  for (const n of [4, 6, 8]) {
    it(`should resolve a fractional index among ${n} cards`, () => {
      const centres = Array.from({ length: n }, (_, i) => 330 - 100 * 2 + i * 100);
      expect(measureProgress(cards(...centres), LANE)).toBeCloseTo(2, 6);
    });
  }
});

// ---------------------------------------------------------------------------
// ImageFrame / DrawnGraphicFrame — the seed's two frame components, each SSR'd on its own. Neither
// one knows about the scaffold's `.step-frame` wrapper, the `active` class or `aria-hidden` — that
// is `renderScrolly`'s own job (see below), never the frame's.
// ---------------------------------------------------------------------------

describe("ImageFrame", () => {
  it("should render a plain, full-bleed img with an empty alt (the argument lives in the prose, not the graphic)", () => {
    const html = renderToStaticMarkup(
      createElement(ImageFrame, { src: "data:image/png;base64,AA==" }),
    );
    expect(html).toContain("<img");
    expect(html).toContain('src="data:image/png;base64,AA=="');
    expect(html).toContain('alt=""');
  });

  it("should never assign its own active/aria-hidden class — that is the scaffold's wrapper, not the frame", () => {
    const html = renderToStaticMarkup(
      createElement(ImageFrame, { src: "data:image/png;base64,AA==" }),
    );
    expect(html).not.toContain("step-frame");
    expect(html).not.toContain("aria-hidden");
  });
});

describe("DrawnGraphicFrame", () => {
  it("should paint only with the ground, its derived furniture and the one accent", () => {
    const ground = "#101820";
    const accent = "#E6A700";
    const furniture = deriveFurniture(ground);
    const svg = renderToStaticMarkup(
      createElement(DrawnGraphicFrame, { ground, accent, ...furniture }),
    );
    const allowed = new Set(
      [ground, accent, furniture.ink, furniture.muted, furniture.grid].map(
        (c) => c.toLowerCase(),
      ),
    );
    const used = new Set(
      (svg.match(/#[0-9a-fA-F]{6}/g) ?? []).map((c) => c.toLowerCase()),
    );
    expect([...used].filter((c) => !allowed.has(c))).toEqual([]);
    expect(used.has(accent.toLowerCase())).toBe(true);
  });

  it("should draw at the genre's own FRAME size, never a hard-coded one", () => {
    const ground = "#FFFFFF";
    const furniture = deriveFurniture(ground);
    const svg = renderToStaticMarkup(
      createElement(DrawnGraphicFrame, {
        ground,
        accent: "#0B7A75",
        ...furniture,
      }),
    );
    expect(svg).toContain(`width="${FRAME.width}"`);
    expect(svg).toContain(`height="${FRAME.height}"`);
  });

  it("should never assign its own active/aria-hidden class either — same rule as ImageFrame", () => {
    const ground = "#FFFFFF";
    const furniture = deriveFurniture(ground);
    const svg = renderToStaticMarkup(
      createElement(DrawnGraphicFrame, {
        ground,
        accent: "#0B7A75",
        ...furniture,
      }),
    );
    expect(svg).not.toContain("step-frame");
    expect(svg).not.toContain("aria-hidden");
  });

  // Correction 7 (a full-bleed graphic can be COVER-cropped hard at either extreme of the aspect
  // envelope this genre guarantees) — every element that carries meaning stays inside SAFE_AREA,
  // mechanically, not by eyeballing a screenshot. Every numeric coordinate is parsed straight out
  // of the rendered SVG string, not re-derived from the component's own formula, so a typo'd
  // literal in the component would be caught here exactly as a wrong formula would.
  describe("nothing annotated can be cropped — every element stays inside SAFE_AREA", () => {
    const ground = "#FFFFFF";
    const accent = "#0B7A75";
    const furniture = deriveFurniture(ground);

    function parseSvg(svg: string) {
      const texts = [...svg.matchAll(/<text x="([\d.-]+)" y="([\d.-]+)"/g)].map(
        (m) => ({
          x: Number(m[1]),
          y: Number(m[2]),
        }),
      );
      const lines = [
        ...svg.matchAll(
          /<line x1="([\d.-]+)" x2="([\d.-]+)" y1="([\d.-]+)" y2="([\d.-]+)"/g,
        ),
      ].map((m) => ({
        x1: Number(m[1]),
        x2: Number(m[2]),
        y1: Number(m[3]),
        y2: Number(m[4]),
      }));
      const circles = [
        ...svg.matchAll(/<circle cx="([\d.-]+)" cy="([\d.-]+)"/g),
      ].map((m) => ({
        cx: Number(m[1]),
        cy: Number(m[2]),
      }));
      return { texts, lines, circles };
    }

    // Text anchor points get extra horizontal slack (SAFE_AREA's own margin over the computed
    // envelope bound already budgets for this — see ScrollySeed.tsx's own doc-comment on
    // SAFE_AREA): a glyph's own rendered width is not computed here, only its anchor.
    const TEXT_SLACK_X = 90;

    for (const [label, waterLevelT] of [
      ["default", undefined],
      ["highest safe reading (t=0)", 0],
      ["lowest safe reading (t=1)", 1],
      ["a flood-like reading (t=0.05)", 0.05],
      ["a drought-like reading (t=0.95)", 0.95],
      ["out-of-range t=-1 (must clamp)", -1],
      ["out-of-range t=2 (must clamp)", 2],
    ] as const) {
      it(`should keep every element inside SAFE_AREA for ${label}`, () => {
        const svg = renderToStaticMarkup(
          createElement(DrawnGraphicFrame, {
            ground,
            accent,
            ...furniture,
            ...(waterLevelT === undefined ? {} : { waterLevelT }),
            dayLabel: "flood day", // the longest of the three real labels — the honest stress case
          }),
        );
        const { texts, lines, circles } = parseSvg(svg);
        expect(texts.length).toBeGreaterThan(0);
        expect(lines.length).toBeGreaterThan(0);
        expect(circles.length).toBe(1);

        for (const t of texts) {
          expect(t.y).toBeGreaterThanOrEqual(SAFE_AREA.y[0]);
          expect(t.y).toBeLessThanOrEqual(SAFE_AREA.y[1]);
          expect(t.x).toBeGreaterThanOrEqual(SAFE_AREA.x[0] - TEXT_SLACK_X);
          expect(t.x).toBeLessThanOrEqual(SAFE_AREA.x[1] + TEXT_SLACK_X);
        }
        for (const l of lines) {
          expect(Math.min(l.y1, l.y2)).toBeGreaterThanOrEqual(SAFE_AREA.y[0]);
          expect(Math.max(l.y1, l.y2)).toBeLessThanOrEqual(SAFE_AREA.y[1]);
          expect(Math.min(l.x1, l.x2)).toBeGreaterThanOrEqual(SAFE_AREA.x[0]);
          // the flow arrow's own marker overshoots x2 by its own markerWidth — budgeted here.
          expect(Math.max(l.x1, l.x2)).toBeLessThanOrEqual(SAFE_AREA.x[1] + 10);
        }
        for (const c of circles) {
          expect(c.cy).toBeGreaterThanOrEqual(SAFE_AREA.y[0]);
          expect(c.cy).toBeLessThanOrEqual(SAFE_AREA.y[1]);
          expect(c.cx).toBeGreaterThanOrEqual(SAFE_AREA.x[0]);
          expect(c.cx).toBeLessThanOrEqual(SAFE_AREA.x[1]);
        }
      });
    }

    it("should keep the seed's own three real DRAWN_VARIANTS readings inside SAFE_AREA", async () => {
      // Not synthetic values — the exact waterLevelT the seed's own runner passes for
      // instrument/flood/drought (scripts/render-scrolly.mjs's own DRAWN_VARIANTS).
      const variants = [
        { waterLevelT: 0.5, dayLabel: "today" },
        { waterLevelT: 0.05, dayLabel: "flood day" },
        { waterLevelT: 0.95, dayLabel: "dry spell" },
      ];
      for (const v of variants) {
        const svg = renderToStaticMarkup(
          createElement(DrawnGraphicFrame, {
            ground,
            accent,
            ...furniture,
            ...v,
          }),
        );
        const { circles } = parseSvg(svg);
        expect(circles[0].cy).toBeGreaterThanOrEqual(SAFE_AREA.y[0]);
        expect(circles[0].cy).toBeLessThanOrEqual(SAFE_AREA.y[1]);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// renderScrolly — the generic scaffold. Media-agnostic by construction: it is given already-built
// ReactElements and never asks what they are.
// ---------------------------------------------------------------------------

function makeStep(id: string, prose: string[]) {
  return {
    id,
    prose,
    frame: createElement(ImageFrame, { src: "data:image/png;base64,AA==" }),
  };
}

describe("renderScrolly — the full self-contained page", () => {
  it("should refuse fewer than two steps", async () => {
    await expect(
      renderScrolly({
        steps: [makeStep("only", ["one step is not a scrolly"])],
        title: "t",
        source: "s",
        ground: "#FFFFFF",
        outDir: "/tmp/scrolly-test-refuse",
        name: "x.html",
      }),
    ).rejects.toThrow("at least two steps");
  });

  it("should refuse steps that share an id", async () => {
    await expect(
      renderScrolly({
        steps: [makeStep("dup", ["a"]), makeStep("dup", ["b"])],
        title: "t",
        source: "s",
        ground: "#FFFFFF",
        outDir: "/tmp/scrolly-test-dup",
        name: "x.html",
      }),
    ).rejects.toThrow("unique id");
  });

  it("should never reference a frame's own kind — the generic scaffold stays media-agnostic", async () => {
    // Structural proof, not a convention taken on faith: read this skill's own `renderScrolly`
    // FUNCTION BODY (not the file's own module-level doc-comment, which is allowed to explain in
    // prose what the CONFIG seam further down is for) and assert the code itself never mentions
    // `frameKind`, `ImageFrame` or `DrawnGraphicFrame` by name.
    const source = await readFile(
      join(SCRIPTS_DIR, "render-scrolly.mjs"),
      "utf8",
    );
    const start = source.indexOf("async function renderScrolly");
    const end = source.indexOf("\nfunction inlineable");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const mechanics = source.slice(start, end);
    expect(mechanics).not.toContain("frameKind");
    for (const component of [
      "ImageFrame",
      "DrawnGraphicFrame",
      "MapFrame",
      "ChartFrame",
    ])
      expect(mechanics).not.toContain(component);
  });

  it("should write one HTML file carrying every step's prose, ungated, and exactly one active frame", async () => {
    const steps = [
      makeStep("first", ["First step's own words."]),
      makeStep("second", ["Second step's own words."]),
    ];
    const outDir = "/tmp/scrolly-test-full";
    const {
      outPath,
      steps: count,
      panelContrast,
    } = await renderScrolly({
      steps,
      title: "A generic two-step scrolly",
      source: "Test fixture",
      ground: "#FFFFFF",
      outDir,
      name: "test.html",
    });
    expect(count).toBe(2);
    expect(existsSync(outPath)).toBe(true);
    expect(panelContrast).toBeGreaterThanOrEqual(4.5);

    const html = await readFile(outPath, "utf8");

    // Every step's own prose is present as plain text, not behind any conditional markup.
    for (const step of steps) {
      for (const p of step.prose) expect(html).toContain(p);
    }

    // Exactly one frame carries `active` at build time — the no-JS default.
    const activeFrames = html.match(/class="step-frame active"/g) ?? [];
    expect(activeFrames.length).toBe(1);

    // The first step's own frame is the one marked active — assigned by renderScrolly's own
    // wrapper, matching assets/ScrollySeed.tsx's own doc-comment: never by the inline script.
    const firstFrame = html.slice(
      html.indexOf(`data-step="${steps[0].id}"`) - 40,
      html.indexOf(`data-step="${steps[0].id}"`) + 10,
    );
    expect(firstFrame).toContain("active");

    // Every frame's wrapper is decorative — the scaffold's own doing, not the frame component's.
    const hiddenFrames = html.match(/aria-hidden="true"/g) ?? [];
    expect(hiddenFrames.length).toBe(steps.length);

    // The title and source are unconditional page furniture. The source follows the visual rather
    // than hanging from the headline, so the credit is at the visual's floor in DOM and layout.
    expect(html).toContain("<h2>A generic two-step scrolly</h2>");
    expect(html).toContain("Test fixture");
    expect(html.indexOf('<p class="source">')).toBeGreaterThan(
      html.indexOf('<div class="scrolly-track">'),
    );

    // The interaction script is inlined, not fetched — and it is the scroll-driven one. An
    // IntersectionObserver in this file would be the delta-set rule coming back; see
    // assets/interaction.mjs's own header for the measurement that removed it.
    expect(html).not.toContain("<script src=");
    expect(html).toContain('addEventListener("scroll"');
    expect(html).not.toContain("IntersectionObserver");

    // Reduced motion is opt-in only — the transition sits behind the media query, never bare.
    const transitionIndex = html.indexOf("transition: opacity");
    const mediaIndex = html.indexOf("prefers-reduced-motion: no-preference");
    expect(transitionIndex).toBeGreaterThan(-1);
    expect(mediaIndex).toBeGreaterThan(-1);
    expect(transitionIndex).toBeGreaterThan(mediaIndex);

    // Measuring the contrast where prose actually crosses the graphic (correction 1): the panel
    // is painted fully opaque with the render's own `ground`, so ink-on-ground is exactly what a
    // reader sees wherever the panel sits over the sticky graphic — never a translucent scrim
    // whose effective colour would drift with whatever the graphic shows underneath.
    expect(html).toContain("background: var(--ground)");
    const furniture = deriveFurniture("#FFFFFF");
    expect(contrast(furniture.ink, "#FFFFFF")).toBeCloseTo(panelContrast, 5);
  });

  // THE EIGHTH CORRECTION, AND THIS TEST IS POINTED THE OTHER WAY ON PURPOSE. It used to assert
  // that the graphic and the prose share ONE box and that `grid-template-columns` never appears —
  // the third build had split them into two columns to dodge the sticky-overlap defect, and the
  // owner rejected that: "you solved it by splitting into two columns, that avoids the problem
  // rather than solving it." The seventh build kept them in one box and closed the collision by
  // PARKING the panel instead. That parked the words, which the owner then rejected in turn: "le
  // panel avec le texte ne bouge plus alors que l'effet c'est vraiment de les faire défiler."
  //
  // Both rejections stand, and the split that ships now satisfies both because it is a different
  // split from the third build's: the graphic still fills its own cell edge to edge and the prose
  // TRAVELS the full height of its own. What was rejected was a narrow graphic stranded beside a
  // column, not the existence of a second cell.
  //
  // The stale assertion this replaces was ALSO vacuous, and that is worth recording: it asserted
  // `margin-top: calc(-1 * var(--graphic-h))` was present, and it passed for six builds after that
  // rule was deleted — because the string survived in a doc-comment explaining its removal. A CSS
  // assertion that greps the whole stylesheet cannot tell a rule from a comment about a rule, so
  // every assertion below slices the RULE out first.
  it("should put the card back over the visual, in one shared box, with nothing painted between them", async () => {
    const steps = [makeStep("a", ["a"]), makeStep("b", ["b"])];
    const { outPath } = await renderScrolly({
      steps,
      title: "t",
      source: "s",
      ground: "#FFFFFF",
      outDir: "/tmp/scrolly-test-overlap",
      name: "x.html",
    });
    const html = await readFile(outPath, "utf8");
    // ONE box, two layers, the graphic underneath: no second cell, no column, no band.
    expect(rule(html, ".scrolly-track")).not.toContain("grid-template-columns");
    expect(rule(html, ".scrolly-track")).not.toContain("grid-template-rows");
    expect(html).not.toContain("--prose-col");
    expect(html).not.toContain("--prose-band");
    expect(html).not.toContain("@media (min-width: 860px)");
    expect(rule(html, ".scrolly-graphic")).toContain("position: absolute");
    expect(rule(html, ".scrolly-steps")).toContain("position: absolute");
    expect(rule(html, ".scrolly-graphic")).toContain("z-index: 0");
    expect(rule(html, ".scrolly-steps")).toContain("z-index: 1");
    expect(rule(html, ".scrolly-steps")).toContain("overflow-y: auto");
    // AND THE LAYER OVER THE VISUAL PAINTS NOTHING OF ITS OWN. The eighth correction gave
    // `.scrolly-steps` a `background` and a border because it was a column beside the graphic;
    // over the graphic either one is a scrim across the whole visual. The only opaque thing in
    // this layer is the card.
    expect(declarations(html, ".scrolly-steps")).not.toContain("background");
    expect(declarations(html, ".scrolly-steps")).not.toContain("border");
  });

  // Correction 3: "the prose panel centred over the graphic rather than pinned left" — `.step`'s
  // own flex row now centres its child on BOTH axes, not just vertically.
  it("should centre the step panel horizontally", async () => {
    const { outPath } = await renderScrolly({
      steps: [makeStep("a", ["a"]), makeStep("b", ["b"])],
      title: "t",
      source: "s",
      ground: "#FFFFFF",
      outDir: "/tmp/scrolly-test-centred-panel",
      name: "x.html",
    });
    const html = await readFile(outPath, "utf8");
    expect(html).toContain("justify-content: center");
  });

  // THE EIGHTH CORRECTION, and the assertion that was missing when the seventh shipped. Every
  // check on this vehicle asked WHICH step was painted; none asked whether the words MOVE. The
  // panel is an ordinary flow box centred in a step taller than the column, so it crosses that
  // column once per step under the reader's own scroll — nothing pins it, and `position: sticky`
  // reappearing on it is the exact regression `scripts/verify-scrolly.mjs`'s assertion G measures
  // in a driven browser (there: "panel record HELD one offset for 48 of 60 scroll-advancing
  // frames").
  it("should let the prose panel travel instead of pinning it", async () => {
    const { outPath } = await renderScrolly({
      steps: [makeStep("a", ["a"]), makeStep("b", ["b"])],
      title: "t",
      source: "s",
      ground: "#FFFFFF",
      outDir: "/tmp/scrolly-test-lane",
      name: "x.html",
    });
    const html = await readFile(outPath, "utf8");
    const panelRule = rule(html, ".step-panel");
    expect(panelRule).not.toContain("position: sticky");
    expect(panelRule).not.toContain("bottom:");
    // Centred, not bottom-anchored: `flex-end` existed only so a `bottom` sticky offset had a box
    // to clamp, and it is what left the panel parked at the foot of its step.
    const stepRule = rule(html, ".step");
    expect(stepRule).toContain("align-items: center");
    expect(stepRule).not.toContain("align-items: flex-end");
    // The step is taller than the frame it scrolls over, which is what gives the card a full
    // frame's worth of travel per step — and 140% rather than 115% is what leaves the visual
    // standing entirely clear between two cards. See `.step`'s own comment in `buildCss` for the
    // three heights that were driven and what each one measured.
    expect(stepRule).toContain("min-height: 140%");
  });

  // THE NINTH CORRECTION'S OWN GEOMETRY, in the stylesheet rather than in a driven browser (which
  // `scripts/verify-scrolly.mjs`'s assertion F does independently). Two regimes and nothing
  // between them: a card whose vertical edge lands in the outer band of the frame slices whatever
  // label is there for as long as it stays at that row.
  it("should give the card one of two widths and never the shape between them", async () => {
    const { outPath } = await renderScrolly({
      steps: [makeStep("a", ["a"]), makeStep("b", ["b"])],
      title: "t",
      source: "s",
      ground: "#FFFFFF",
      outDir: "/tmp/scrolly-test-card-width",
      name: "x.html",
    });
    const html = await readFile(outPath, "utf8");
    // NARROW is the default: edge to edge, no gutter to leave an edge inside the frame.
    expect(declarations(html, ".step-panel")).toContain("max-width: 100%");
    expect(declarations(html, ".step")).toContain("padding: 0;");
    // The reading measure is the override, at the width where 410px stops being 70% of the frame.
    expect(html).toContain("@media (min-width: 600px)");
    const wide = html.slice(html.indexOf("@media (min-width: 600px)"));
    expect(wide).toContain("max-width: min(46ch, 100%)");
    expect(wide).toContain("padding: 0 var(--prose-gutter)");
  });

  it("should carry a beat's own reserved band as a declaration, and reserve none of its own", async () => {
    const declared = await renderScrolly({
      steps: [makeStep("a", ["a"]), makeStep("b", ["b"])],
      title: "t",
      source: "s",
      ground: "#FFFFFF",
      // What a beat that still derives a camera or a plot box from its own copy of the constant
      // passes. The scaffold records it; it places nothing against it.
      proseLane: 0.36,
      outDir: "/tmp/scrolly-test-lane-value",
      name: "x.html",
    });
    const withLane = await readFile(declared.outPath, "utf8");
    expect(withLane).toContain("--prose-lane: 36%");
    expect(withLane).toContain('data-prose-lane="36"');

    // AND THE SEED PASSES NONE, which is the ninth correction's own residue closed rather than
    // named: the card travels the whole frame and rests nowhere, so a band at the bottom protected
    // the one place it never dwells. The default is 0 and nothing in the CSS reads the value.
    const none = await renderScrolly({
      steps: [makeStep("a", ["a"]), makeStep("b", ["b"])],
      title: "t",
      source: "s",
      ground: "#FFFFFF",
      outDir: "/tmp/scrolly-test-lane-none",
      name: "x.html",
    });
    const withoutLane = await readFile(none.outPath, "utf8");
    expect(withoutLane).toContain("--prose-lane: 0%");
    expect(withoutLane).toContain('data-prose-lane="0"');
    expect(withoutLane).not.toMatch(/var\(--prose-lane\)/);
  });

  it("should refuse a lane that is not a usable fraction of the graphic", async () => {
    await expect(
      renderScrolly({
        steps: [makeStep("a", ["a"]), makeStep("b", ["b"])],
        title: "t",
        source: "s",
        ground: "#FFFFFF",
        proseLane: 0.9,
        outDir: "/tmp/scrolly-test-lane-refuse",
        name: "x.html",
      }),
    ).rejects.toThrow("proseLane");
  });

  // NO PANEL IS EVER HIDDEN, and this assertion is the seventh build's own pointed the other way.
  // It used to require `.scrolly--live .step:not(.in-lane) .step-panel { opacity: 0 }` — a rule
  // that existed because a parked panel un-pinned one panel-height before the next one parked and
  // spent that gap opaque over the graphic's labels. The prose is now clipped inside its own cell
  // and cannot reach a label at any offset, so the rule has nothing to protect; keeping it would
  // make the reader watch the words they are reading DISSOLVE halfway up the column instead of
  // scrolling out of it, which is the owner's own defect wearing a different costume.
  it("should never hide a word — no rule fades, clips or removes a panel", async () => {
    const { outPath } = await renderScrolly({
      steps: [makeStep("a", ["a"]), makeStep("b", ["b"])],
      title: "t",
      source: "s",
      ground: "#FFFFFF",
      outDir: "/tmp/scrolly-test-one-panel",
      name: "x.html",
    });
    const html = await readFile(outPath, "utf8");
    // The SELECTORS, not the words: this file's own comments name both mechanisms in order to
    // explain their removal, and a grep of the whole document cannot tell those apart.
    expect(html).not.toContain(":not(.in-lane)");
    expect(html).not.toContain(".scrolly--live .step");
    expect(html).not.toContain('classList.add("scrolly--live")');
    expect(html).not.toContain('classList.toggle("in-lane"');
    expect(html).not.toMatch(/\.step-panel[^{]*\{[^}]*opacity/);
    expect(html).not.toMatch(/\.step-panel[^{]*\{[^}]*display: none/);
    expect(html).not.toMatch(/\.step-panel[^{]*\{[^}]*visibility: hidden/);
    // And every step's words are in the markup unconditionally, script or no script.
    expect(html).toContain(">a<");
    expect(html).toContain(">b<");
  });

  // Correction 7: the graphic is FIXED and the page does not scroll. Correction 5 sized a sticky
  // graphic to `--graphic-h: 100vh`; there is no sticky graphic and no `--graphic-h` any more, so
  // this asserts the model that replaced it. The component is one frame tall, the graphic fills
  // the track absolutely, and the only thing with scroll distance is the prose column.
  it("should fix the graphic and take the scroll off the document", async () => {
    const { outPath } = await renderScrolly({
      steps: [makeStep("a", ["a"]), makeStep("b", ["b"])],
      title: "t",
      source: "s",
      ground: "#FFFFFF",
      outDir: "/tmp/scrolly-test-fixed-graphic",
      name: "x.html",
    });
    const html = await readFile(outPath, "utf8");
    expect(html).toMatch(/body\s*\{[^}]*overflow: hidden/);
    // The graphic is the bottom LAYER of the track again — see "should put the card back over the
    // visual", above. What is unchanged across the eighth and ninth corrections, and is what this
    // test is for, is that nothing positions it from the scroll.
    expect(rule(html, ".scrolly-graphic")).toContain("inset: 0");
    expect(rule(html, ".scrolly-steps")).toContain("overflow-y: auto");
    // The reader's keyboard follows the scroll: taking it off the document takes Page Down with
    // it unless the new scroller can be focused.
    expect(html).toContain('<div class="scrolly-steps" tabindex="0">');
    // Nothing left of the sticky model, in a RULE — the doc-comments above `.scrolly-track` still
    // describe what was removed and why, which is deliberate.
    expect(html).not.toMatch(/\.scrolly-graphic\s*\{[^}]*position: sticky/);
    expect(html).not.toMatch(/\.scrolly-steps\s*\{[^}]*margin-top/);
    expect(html).not.toMatch(/\.scrolly-track\s*\{[^}]*--graphic-h/);
  });

  // Correction 6: "all web visuals must take the full width" — nothing may constrain `.scrolly`
  // itself to a narrow max-width, or every child of it — including the sticky graphic — inherits
  // a narrow column it should not have.
  //
  // Correction 7 (2026-08-10) REVERSES the second half of what this test used to assert. It used
  // to require `.scrolly-header { max-width: 640px }` — the sixth build's decision that the header
  // and the step panel were one category, "the prose". They are not. The header sits ABOVE the
  // graphic and frames it: it is furniture, and it takes the graphic's width, minus the gutter.
  // The panel travels OVER the graphic and keeps its measure. See references/scrolly-discipline.md,
  // "Sixth build → seventh build". The assertion is kept, pointed the other way, so reinstating the
  // cap goes red here.
  it("should cap neither .scrolly nor its header — only the step panel keeps a measure", async () => {
    const { outPath } = await renderScrolly({
      steps: [makeStep("a", ["a"]), makeStep("b", ["b"])],
      title: "t",
      source: "s",
      ground: "#FFFFFF",
      outDir: "/tmp/scrolly-test-full-width",
      name: "x.html",
    });
    const html = await readFile(outPath, "utf8");
    expect(html).not.toMatch(/\.scrolly\s*\{[^}]*max-width/);
    expect(html).not.toMatch(/\.scrolly-header\s*\{[^}]*max-width/);
    // The gutter is what survives the reversal: full bleed, but never touching the edge.
    expect(html).toMatch(/\.scrolly-header\s*\{[^}]*clamp\(16px, 6vw, 56px\)/);
    // And the card — prose over the graphic, not furniture beside it — still has its measure on
    // the viewports wide enough to carry one. It is in the `min-width: 600px` block now, not in
    // `.step-panel`'s own rule; see "should give the card one of two widths", above.
    expect(html.slice(html.indexOf("@media (min-width: 600px)"))).toMatch(
      /max-width:\s*min\(46ch, 100%\)/,
    );
  });

  // Correction 1: "the graphic must be fixed; only the text moves" — no mechanism in the shipped
  // CSS may write an opacity value from anything other than the `.active` class itself.
  it("should never ship a scroll-linked opacity mechanism — only the class-driven 0/1 swap", async () => {
    const { outPath } = await renderScrolly({
      steps: [makeStep("a", ["a"]), makeStep("b", ["b"])],
      title: "t",
      source: "s",
      ground: "#FFFFFF",
      outDir: "/tmp/scrolly-test-no-progressive",
      name: "x.html",
    });
    const html = await readFile(outPath, "utf8");
    expect(html).not.toContain("scrolly--progressive");
    expect(html).not.toContain("requestAnimationFrame");
  });

  // Correction 2, exercised at render time (not just against the pure `pickActiveStep` helper
  // above): the generic scaffold's own markup — one active frame, every id present, the overlap
  // scaffold — must hold at N steps for N well past two, not only the two the first three builds
  // were ever driven with.
  for (const n of [4, 6, 8]) {
    it(`should render a well-formed page for ${n} steps — exactly one active frame, every id present`, async () => {
      const steps = Array.from({ length: n }, (_, i) =>
        makeStep(`s${i}`, [`Step ${i}'s own words.`]),
      );
      const { outPath, steps: count } = await renderScrolly({
        steps,
        title: "t",
        source: "s",
        ground: "#FFFFFF",
        outDir: `/tmp/scrolly-test-n${n}`,
        name: "x.html",
      });
      expect(count).toBe(n);
      const html = await readFile(outPath, "utf8");
      const activeFrames = html.match(/class="step-frame active"/g) ?? [];
      expect(activeFrames.length).toBe(1);
      const stepFrames = html.match(/class="step-frame( active)?"/g) ?? [];
      expect(stepFrames.length).toBe(n);
      for (const step of steps) {
        expect(html).toContain(`data-step="${step.id}"`);
        for (const p of step.prose) expect(html).toContain(p);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// render — this skill's own seed runner (SEED / STEPS_META → renderScrolly).
// ---------------------------------------------------------------------------

describe("render — the seed's own runner", () => {
  it("should render the seed end to end, embedding its own rasters as data URIs", async () => {
    const outDir = "/tmp/scrolly-test-seed";
    const { outPath, steps, panelContrast, facts } = await render({ outDir });
    expect(steps).toBe(STEPS_META.length);
    expect(panelContrast).toBeGreaterThanOrEqual(4.5);
    expect(existsSync(outPath)).toBe(true);

    const html = await readFile(outPath, "utf8");
    expect(html).toContain(`<h2>${SEED.title}</h2>`);
    expect(html).toContain("data:image/png;base64,");
    // No external request — the photograph never appears as a bare filename src.
    expect(html).not.toContain('src="../assets/sample-data/basin-photo.png"');
    for (const step of STEPS_META) {
      for (const p of step.prose(facts)) expect(html).toContain(p);
    }
  });
});
