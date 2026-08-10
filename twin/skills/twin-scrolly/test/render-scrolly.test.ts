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
  PROSE_LANE,
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
import { pickActiveStep, pickLanePanel } from "../assets/interaction.mjs";

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

// A lane 100px tall parked at the bottom of a 400px-tall scrollport, with the panel's own 20px
// bottom offset already taken off — exactly the band `initScrolly` computes and hands these two.
const LANE = { top: 280, bottom: 380 };
/** A panel of `height` whose bottom edge sits at `bottom`. */
const at = (stepId: string, bottom: number, height = 80) => ({
  stepId,
  top: bottom - height,
  bottom,
});

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

describe("pickLanePanel — which PANEL may be painted", () => {
  it("should paint a panel parked inside the lane", () => {
    expect(pickLanePanel([at("a", 380)], LANE)).toBe("a");
  });

  // The whole point of the second decision: a panel that has begun climbing out of the lane is
  // over the band every frame keeps its labels in, so it stops being painted THERE, not later when
  // the next step wins the frame. Those two moments are one panel-height apart.
  it("should stop painting a panel the moment it rises above the lane", () => {
    // An 80px panel in a 100px lane may rise 20px before its own top crosses the lane's top; at
    // 360 its top sits exactly on it, and one pixel further it is over the band the frames keep
    // their labels in.
    expect(pickLanePanel([at("a", 379)], LANE)).toBe("a");
    expect(pickLanePanel([at("a", 361)], LANE)).toBe("a");
    expect(pickLanePanel([at("a", 355)], LANE)).toBeNull();
  });

  it("should still paint a panel TALLER than the lane, while it is parked", () => {
    // Measured on every beat on disk at 375x812: the prose is taller than the 28% reserved for it.
    // Such a panel can never be inside the lane, and painting nothing would leave a reader with a
    // graphic and no words — worse than the overlap. It stops being painted as soon as it rises.
    const tall = at("tall", 380, 160);
    expect(pickLanePanel([tall], LANE)).toBe("tall");
    expect(pickLanePanel([at("tall", 360, 160)], LANE)).toBeNull();
  });

  it("should never paint two panels at once during a handover", () => {
    for (let rise = 0; rise <= 160; rise += 4) {
      const winner = pickLanePanel(
        [at("out", 380 - rise), at("in", 540 - rise)],
        LANE,
      );
      expect(["out", "in", null]).toContain(winner);
    }
  });

  it("should return null between two steps rather than keep a stale panel painted", () => {
    expect(pickLanePanel([at("out", 300), at("in", 520)], LANE)).toBeNull();
  });
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
        outDir: "/tmp/twin-scrolly-test-refuse",
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
        outDir: "/tmp/twin-scrolly-test-dup",
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
    const outDir = "/tmp/twin-scrolly-test-full";
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

    // The title/source live in the HTML header, unconditional and ahead of every step's own
    // reveal — see assets/ScrollySeed.tsx's own doc-comment on why this genre keeps them there.
    expect(html).toContain("<h2>A generic two-step scrolly</h2>");
    expect(html).toContain("Test fixture");

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

  it("should keep the sticky graphic and the scrolling prose in the SAME track — the overlap is deliberate, not avoided by a second column", async () => {
    const steps = [makeStep("a", ["a"]), makeStep("b", ["b"])];
    const { outPath } = await renderScrolly({
      steps,
      title: "t",
      source: "s",
      ground: "#FFFFFF",
      outDir: "/tmp/twin-scrolly-test-overlap",
      name: "x.html",
    });
    const html = await readFile(outPath, "utf8");
    // The fix this correction shipped: the graphic sticks, the steps column is pulled back over
    // it with a matching negative margin — never a `grid-template-columns` split.
    expect(html).toContain("position: sticky");
    expect(html).toContain("margin-top: calc(-1 * var(--graphic-h))");
    expect(html).not.toContain("grid-template-columns");
  });

  // Correction 3: "the prose panel centred over the graphic rather than pinned left" — `.step`'s
  // own flex row now centres its child on BOTH axes, not just vertically.
  it("should centre the step panel horizontally", async () => {
    const { outPath } = await renderScrolly({
      steps: [makeStep("a", ["a"]), makeStep("b", ["b"])],
      title: "t",
      source: "s",
      ground: "#FFFFFF",
      outDir: "/tmp/twin-scrolly-test-centred-panel",
      name: "x.html",
    });
    const html = await readFile(outPath, "utf8");
    expect(html).toContain("justify-content: center");
  });

  // The correction that ended five rounds of panel-over-annotation patching: the panel no longer
  // travels with the scroll, it is PINNED in a reserved lane at the bottom of the graphic. Three
  // facts, each one load-bearing and each one wrong in an earlier build.
  it("should pin the prose panel in a lane instead of letting it travel with the scroll", async () => {
    const { outPath } = await renderScrolly({
      steps: [makeStep("a", ["a"]), makeStep("b", ["b"])],
      title: "t",
      source: "s",
      ground: "#FFFFFF",
      outDir: "/tmp/twin-scrolly-test-lane",
      name: "x.html",
    });
    const html = await readFile(outPath, "utf8");
    const panelRule = html.slice(
      html.indexOf(".step-panel {"),
      html.indexOf(".step-panel p"),
    );
    expect(panelRule).toContain("position: sticky");
    expect(panelRule).toContain("bottom:");
    // A `bottom` sticky offset can only ever shift a box UP, so the panel has to START at the
    // bottom of its step or the offset does nothing at all — measured in a real browser: with
    // `flex-start` the panel travelled from y=768 to y=-32 across one step.
    const stepRule = html.slice(
      html.indexOf(".step {"),
      html.indexOf(".step-panel {"),
    );
    expect(stepRule).toContain("align-items: flex-end");
  });

  it("should reserve exactly the lane the seed's own frames keep clear", async () => {
    const { outPath } = await renderScrolly({
      steps: [makeStep("a", ["a"]), makeStep("b", ["b"])],
      title: "t",
      source: "s",
      ground: "#FFFFFF",
      proseLane: PROSE_LANE,
      outDir: "/tmp/twin-scrolly-test-lane-value",
      name: "x.html",
    });
    const html = await readFile(outPath, "utf8");
    // A PERCENTAGE, not `vh`: the lane is a fraction of the TRACK the prose scrolls inside, which
    // is the viewport minus the fixed header. Under the sticky model those were the same number.
    expect(html).toContain(`--prose-lane: ${(PROSE_LANE * 100).toFixed(0)}%`);
    // The interaction layer observes that same lane, and reads it from the markup rather than
    // re-deriving it.
    expect(html).toContain(`data-prose-lane="${Math.round(PROSE_LANE * 100)}"`);
  });

  it("should refuse a lane that is not a usable fraction of the graphic", async () => {
    await expect(
      renderScrolly({
        steps: [makeStep("a", ["a"]), makeStep("b", ["b"])],
        title: "t",
        source: "s",
        ground: "#FFFFFF",
        proseLane: 0.9,
        outDir: "/tmp/twin-scrolly-test-lane-refuse",
        name: "x.html",
      }),
    ).rejects.toThrow("proseLane");
  });

  // One panel is PAINTED at a time, and only where a script is running — with JavaScript off no
  // rule hides a word. `opacity`, never `display`/`visibility`: a faded panel stays in the
  // accessibility tree, so a screen reader still meets every step's words in order.
  it("should paint only the active step's panel, and only once the script has run", async () => {
    const { outPath } = await renderScrolly({
      steps: [makeStep("a", ["a"]), makeStep("b", ["b"])],
      title: "t",
      source: "s",
      ground: "#FFFFFF",
      outDir: "/tmp/twin-scrolly-test-one-panel",
      name: "x.html",
    });
    const html = await readFile(outPath, "utf8");
    // `in-lane`, NOT `active`: which FRAME the graphic shows is held across the gap between two
    // steps; which PANEL is painted is not, because a `bottom`-sticky panel un-pins one
    // panel-height before the next one parks and spends that gap climbing over the graphic.
    expect(html).toContain(".scrolly--live .step:not(.in-lane) .step-panel");
    expect(html).toMatch(/\.scrolly--live[^{]*\{[^}]*opacity: 0/);
    expect(html).not.toMatch(/\.step-panel[^{]*\{[^}]*display: none/);
    expect(html).not.toMatch(/\.step-panel[^{]*\{[^}]*visibility: hidden/);
    // The class is added by the script, never baked into the markup.
    expect(html).not.toContain('class="scrolly scrolly--live"');
    expect(html).toContain('root.classList.add("scrolly--live")');
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
      outDir: "/tmp/twin-scrolly-test-fixed-graphic",
      name: "x.html",
    });
    const html = await readFile(outPath, "utf8");
    expect(html).toMatch(/body\s*\{[^}]*overflow: hidden/);
    expect(html).toMatch(
      /\.scrolly-graphic\s*\{[^}]*position: absolute;\s*inset: 0/,
    );
    expect(html).toMatch(/\.scrolly-steps\s*\{[^}]*overflow-y: auto/);
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
      outDir: "/tmp/twin-scrolly-test-full-width",
      name: "x.html",
    });
    const html = await readFile(outPath, "utf8");
    expect(html).not.toMatch(/\.scrolly\s*\{[^}]*max-width/);
    expect(html).not.toMatch(/\.scrolly-header\s*\{[^}]*max-width/);
    // The gutter is what survives the reversal: full bleed, but never touching the edge.
    expect(html).toMatch(/\.scrolly-header\s*\{[^}]*clamp\(16px, 6vw, 56px\)/);
    // And the panel — prose over the graphic, not furniture beside it — still has its measure.
    expect(html).toMatch(
      /\.step-panel\s*\{[^}]*max-width:\s*min\(46ch, 100%\)/,
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
      outDir: "/tmp/twin-scrolly-test-no-progressive",
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
        outDir: `/tmp/twin-scrolly-test-n${n}`,
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
    const outDir = "/tmp/twin-scrolly-test-seed";
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
