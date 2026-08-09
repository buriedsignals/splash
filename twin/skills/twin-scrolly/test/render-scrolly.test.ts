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
  ImageFrame,
  DrawnGraphicFrame,
  type ScrollyStepMeta,
} from "../assets/ScrollySeed.tsx";
import { render, renderScrolly, SEED } from "../scripts/render-scrolly.mjs";
import {
  pickActiveStep,
  frameWeight,
  computeFrameWeights,
} from "../assets/interaction.mjs";

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

  it("should give every step at least one non-empty paragraph", () => {
    for (const step of STEPS_META) {
      expect(step.prose.length).toBeGreaterThan(0);
      for (const p of step.prose) expect(p.trim().length).toBeGreaterThan(0);
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

// ---------------------------------------------------------------------------
// pickActiveStep — the one pure piece of the DOM wiring, unit-tested directly
// (assets/interaction.mjs's own doc-comment: initScrolly itself is DOM wiring, proven by
// driving a real browser, not by a test).
// ---------------------------------------------------------------------------

describe("pickActiveStep", () => {
  it("should pick the intersecting entry with the largest ratio", () => {
    const winner = pickActiveStep([
      { stepId: "a", isIntersecting: true, intersectionRatio: 0.2 },
      { stepId: "b", isIntersecting: true, intersectionRatio: 0.9 },
      { stepId: "c", isIntersecting: true, intersectionRatio: 0.4 },
    ]);
    expect(winner).toBe("b");
  });

  it("should ignore entries that are not currently intersecting", () => {
    const winner = pickActiveStep([
      { stepId: "a", isIntersecting: false, intersectionRatio: 1 },
      { stepId: "b", isIntersecting: true, intersectionRatio: 0.1 },
    ]);
    expect(winner).toBe("b");
  });

  it("should return null when nothing intersects", () => {
    expect(
      pickActiveStep([
        { stepId: "a", isIntersecting: false, intersectionRatio: 0 },
      ]),
    ).toBeNull();
  });

  it("should return null for an empty entry list", () => {
    expect(pickActiveStep([])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// frameWeight / computeFrameWeights — the continuous, scroll-linked crossfade the enhanced
// (motion-allowed) path paints every animation frame, in place of `pickActiveStep`'s own discrete
// binary switch. Pure, no DOM — see assets/interaction.mjs's own doc-comment on why
// `initProgressiveCrossfade` itself is not unit-tested here.
// ---------------------------------------------------------------------------

describe("frameWeight — one step's own continuous crossfade weight", () => {
  it("should be 1 when perfectly centred", () => {
    expect(frameWeight(0, 400)).toBe(1);
  });

  it("should fall off linearly toward 0 as distance approaches spacing", () => {
    expect(frameWeight(200, 400)).toBeCloseTo(0.5, 5);
    expect(frameWeight(100, 400)).toBeCloseTo(0.75, 5);
  });

  it("should clamp to 0 at or beyond a full spacing away", () => {
    expect(frameWeight(400, 400)).toBe(0);
    expect(frameWeight(900, 400)).toBe(0);
  });

  it("should treat a negative distance the same as its magnitude", () => {
    expect(frameWeight(-200, 400)).toBeCloseTo(frameWeight(200, 400), 5);
  });

  it("should fall back to all-or-nothing rather than dividing by zero when spacing is not positive", () => {
    expect(frameWeight(0, 0)).toBe(1);
    expect(frameWeight(5, 0)).toBe(0);
    expect(frameWeight(0, -10)).toBe(1);
  });
});

describe("computeFrameWeights — every step's own weight at once", () => {
  it("should give a step exactly at the viewport centre a weight of 1", () => {
    // viewportHeight 800 -> centre at 400; step 0's own centre sits exactly there.
    const weights = computeFrameWeights([400, 1200], 800);
    expect(weights[0]).toBe(1);
  });

  it("should split two steps evenly midway between their own centres", () => {
    // viewportHeight 800 -> centre 400; steps centred at 100 and 700 -> spacing 600 each,
    // both equidistant (300px) from the viewport centre.
    const weights = computeFrameWeights([100, 700], 800);
    expect(weights[0]).toBeCloseTo(0.5, 5);
    expect(weights[1]).toBeCloseTo(0.5, 5);
  });

  it("should change continuously, not in one jump, as the reader scrolls a step toward the viewport centre", () => {
    // Fixed viewport (800 -> centre 400); step 0's own centre approaches the viewport centre in
    // even steps, exactly what scrolling looks like from a fixed step's own point of view (its
    // document position never moves, its VIEWPORT position climbs steadily as the page scrolls).
    // Step 1 rides along 600px behind it, so spacing stays constant at 600 throughout — isolating
    // the one thing that should actually move the weight.
    const samples = [700, 600, 500, 400].map(
      (center0) => computeFrameWeights([center0, center0 + 600], 800)[0],
    );
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThan(samples[i - 1]);
    }
    expect(samples[0]).toBeGreaterThan(0);
    expect(samples[samples.length - 1]).toBe(1);
  });

  it("should use whichever neighbour is closer for an unevenly spaced set of steps", () => {
    // Steps at 0, 100, 1000: step 1's closer neighbour is step 0 (distance 100), not step 2
    // (distance 900) — its own crossfade completes over the SHORT gap, not the long one.
    const weights = computeFrameWeights([0, 100, 1000], 200);
    // viewport centre = 100, exactly step 1's own centre.
    expect(weights[1]).toBe(1);
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
    expect(mechanics).not.toContain("ImageFrame");
    expect(mechanics).not.toContain("DrawnGraphicFrame");
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

    // The interaction script is inlined, not fetched.
    expect(html).not.toContain("<script src=");
    expect(html).toContain("IntersectionObserver");

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
});

// ---------------------------------------------------------------------------
// render — this skill's own seed runner (SEED / STEPS_META → renderScrolly).
// ---------------------------------------------------------------------------

describe("render — the seed's own runner", () => {
  it("should render the seed end to end, embedding its own photograph as a data URI", async () => {
    const outDir = "/tmp/twin-scrolly-test-seed";
    const { outPath, steps, panelContrast } = await render({ outDir });
    expect(steps).toBe(STEPS_META.length);
    expect(panelContrast).toBeGreaterThanOrEqual(4.5);
    expect(existsSync(outPath)).toBe(true);

    const html = await readFile(outPath, "utf8");
    expect(html).toContain(`<h2>${SEED.title}</h2>`);
    expect(html).toContain("data:image/png;base64,");
    // No external request — the photograph never appears as a bare filename src.
    expect(html).not.toContain('src="../assets/sample-data/basin-photo.png"');
    for (const step of STEPS_META) {
      for (const p of step.prose) expect(html).toContain(p);
    }
  });
});
