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
import { pickActiveStep } from "../assets/interaction.mjs";

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

  // Correction 2: "it must work for more than two steps" — pickActiveStep never reads the length
  // of `entries` to decide how to behave (see its own doc-comment), but this locks that as a fact
  // about the function, not an assumption about it, at exactly the counts the brief named.
  for (const n of [4, 6, 8]) {
    it(`should still pick the single largest-ratio winner among ${n} intersecting entries`, () => {
      const entries = Array.from({ length: n }, (_, i) => ({
        stepId: `s${i}`,
        isIntersecting: true,
        intersectionRatio: (i + 1) / (n + 1), // strictly increasing — last entry is the winner
      }));
      expect(pickActiveStep(entries)).toBe(`s${n - 1}`);
    });

    it(`should pick the winner among ${n} entries regardless of which position in the array it sits at`, () => {
      // The winner planted in the MIDDLE of the array, not at either end — a boundary-maths bug
      // that only ever compares neighbours, or only ever checks the first/last entry, would miss
      // this while still passing the "last entry wins" case above.
      const entries = Array.from({ length: n }, (_, i) => ({
        stepId: `s${i}`,
        isIntersecting: true,
        intersectionRatio: 0.1,
      }));
      const middle = Math.floor(n / 2);
      entries[middle].intersectionRatio = 0.99;
      expect(pickActiveStep(entries)).toBe(`s${middle}`);
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

  // Correction 3: "the prose panel centred over the graphic rather than pinned left" — `.step`'s
  // own flex row now centres its child on BOTH axes, not just vertically.
  it("should centre the step panel horizontally, not just vertically", async () => {
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
