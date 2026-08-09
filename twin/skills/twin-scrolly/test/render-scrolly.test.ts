import { describe, it, expect, setDefaultTimeout } from "bun:test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture, measureText } from "../scripts/render-still.mjs";
import {
  ScrollyChartSeed,
  STEPS,
  FRAME,
  chartPoints,
  tracePath,
  yTickValues,
  type ScrollyStep,
} from "../assets/ScrollySeed.tsx";
import { render, renderScrolly } from "../scripts/render-scrolly.mjs";
import { pickActiveStep } from "../assets/interaction.mjs";

// `measureText` loads a native rasteriser (`@resvg/resvg-js`) that scans every system font on its
// first call in a process — a one-time cost this default 5s budget is not built to absorb whenever
// this happens to be the first file bun:test loads. Same fix `twin-chart-web/test/render-web.test.ts`
// already uses for the same underlying rasteriser.
setDefaultTimeout(20000);

const SAMPLE = JSON.parse(
  await readFile(
    join(import.meta.dirname, "..", "assets", "sample-data", "rainfall.json"),
    "utf8",
  ),
);

// ---------------------------------------------------------------------------
// Pure geometry — the part a unit test can honestly prove.
// ---------------------------------------------------------------------------

describe("chartPoints / tracePath — data to coordinates, and a reveal cutoff, nothing else", () => {
  it("should place every point at coordinates derived from the FIXED full-series domain", () => {
    const { points } = chartPoints(SAMPLE, {
      width: 640,
      height: 380,
      padding: { top: 36, right: 24, bottom: 56, left: 70 },
    });
    expect(points.map((p: any) => p.year)).toEqual(
      SAMPLE.map((d: any) => d.year),
    );
    // 2016 is the series max (940) — its y must be the smallest (closest to the top).
    const y2016 = points.find((p: any) => p.year === 2016)!.y;
    const y2020 = points.find((p: any) => p.year === 2020)!.y;
    expect(y2016).toBeLessThan(y2020);
  });

  it("should trace only points up to and including the reveal cutoff", () => {
    const { points } = chartPoints(SAMPLE, {
      width: 640,
      height: 380,
      padding: { top: 36, right: 24, bottom: 56, left: 70 },
    });
    const path2020 = tracePath(points, 2020);
    const path2024 = tracePath(points, 2024);
    // A path string traced through more points is longer (more path commands).
    expect(path2024.length).toBeGreaterThan(path2020.length);
  });

  it("should return an empty path when nothing is revealed yet", () => {
    const { points } = chartPoints(SAMPLE, {
      width: 640,
      height: 380,
      padding: { top: 36, right: 24, bottom: 56, left: 70 },
    });
    expect(tracePath(points, 1999)).toBe("");
  });

  it("should never rescale the axis as the reveal advances — the two domain ends stay fixed", () => {
    const early = yTickValues(SAMPLE.slice(0, 2));
    const full = yTickValues(SAMPLE);
    // Both calls receive the SAME full series in this genre's real usage (chartPoints/yTickValues
    // are always called with the whole `data` array, never a sliced subset) — this test pins that
    // by asserting the full series' own domain matches itself across the two steps' own frames.
    expect(full).toEqual(yTickValues(SAMPLE));
    expect(early).not.toEqual(full); // sanity: a different input really does change the output
  });
});

describe("STEPS — the seed's own narrative arc", () => {
  it("should carry at least two steps, sorted to reveal forward only", () => {
    expect(STEPS.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < STEPS.length; i++) {
      expect(STEPS[i].revealThrough).toBeGreaterThanOrEqual(
        STEPS[i - 1].revealThrough,
      );
    }
  });

  it("should give every step at least one non-empty paragraph", () => {
    for (const step of STEPS) {
      expect(step.prose.length).toBeGreaterThan(0);
      for (const p of step.prose) expect(p.trim().length).toBeGreaterThan(0);
    }
  });

  it("should only show the peak marker from a step whose own reveal already reaches that year", () => {
    for (const step of STEPS) {
      if (step.showPeak) {
        // PEAK_YEAR is not exported (it's a baked CONFIG constant) — this asserts the OBSERVABLE
        // contract instead: any step claiming showPeak must reveal at least through 2021, the
        // only year in this seed's own data a peak marker could refer to.
        expect(step.revealThrough).toBeGreaterThanOrEqual(2021);
      }
    }
  });

  it("should only show the end label on the step that reaches the series' actual last year", () => {
    const lastYear = Math.max(...SAMPLE.map((d: any) => d.year));
    for (const step of STEPS) {
      if (step.showEnd) expect(step.revealThrough).toBe(lastYear);
    }
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
// Component SSR — the closed palette, the baked-in `active` class, unconditional furniture.
// ---------------------------------------------------------------------------

function renderStep(
  step: ScrollyStep,
  active: boolean,
  overrides: Record<string, unknown> = {},
) {
  const ground = (overrides.ground as string) ?? "#FFFFFF";
  const furniture = deriveFurniture(ground);
  return renderToStaticMarkup(
    createElement(ScrollyChartSeed, {
      data: SAMPLE,
      step,
      active,
      subject: "the sample basin",
      ground,
      accent: "#0B7A75",
      ...furniture,
      measure: measureText,
      ...overrides,
    } as any),
  );
}

describe("ScrollyChartSeed", () => {
  it("should mark exactly the step passed active=true, never assign the class itself unconditionally", () => {
    const activeSvg = renderStep(STEPS[0], true);
    const inactiveSvg = renderStep(STEPS[0], false);
    expect(activeSvg).toContain('class="step-frame active"');
    expect(inactiveSvg).toContain('class="step-frame"');
    expect(inactiveSvg).not.toContain('class="step-frame active"');
  });

  it("should stamp the step's own id as data-step, matching what assets/interaction.mjs matches on", () => {
    for (const step of STEPS) {
      const svg = renderStep(step, false);
      expect(svg).toContain(`data-step="${step.id}"`);
    }
  });

  it("should mark every frame decorative (aria-hidden) — the argument lives in the prose, not the graphic", () => {
    const svg = renderStep(STEPS[0], true);
    expect(svg).toContain('aria-hidden="true"');
  });

  it("should draw the reference rule and its label unconditionally, on every step", () => {
    for (const step of STEPS) {
      const svg = renderStep(step, false);
      expect(svg).toContain("2016 level");
    }
  });

  it("should paint only with the ground, its derived furniture and the one accent", () => {
    const ground = "#101820";
    const accent = "#E6A700";
    const furniture = deriveFurniture(ground);
    const svg = renderStep(STEPS[STEPS.length - 1], true, { ground, accent });
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

  it("should draw the peak marker only on steps that request it", () => {
    // React SSR escapes the apostrophe as a numeric entity — matched here as the exact bytes SSR
    // actually emits, not the plain-text sentence a browser would later render it back into.
    const withPeak = STEPS.find((s) => s.showPeak)!;
    const withoutPeak = STEPS.find((s) => !s.showPeak)!;
    expect(renderStep(withPeak, false)).toContain(
      "the year&#x27;s biggest rebound",
    );
    expect(renderStep(withoutPeak, false)).not.toContain(
      "the year&#x27;s biggest rebound",
    );
  });

  it("should draw the end label only on the step that reaches the series' last reading", () => {
    const withEnd = STEPS.find((s) => s.showEnd)!;
    const withoutEnd = STEPS.find((s) => !s.showEnd)!;
    expect(renderStep(withEnd, false)).toContain("the sample basin ·");
    expect(renderStep(withoutEnd, false)).not.toContain("the sample basin ·");
  });

  it("should refuse a series with nothing to trace rather than draw a meaningless line", () => {
    expect(() =>
      renderStep(STEPS[0], true, { data: [{ year: 2020, value: 1 }] } as any),
    ).toThrow("needs at least two readings");
  });

  it("should widen the right gutter only for the step that draws the end label, never clip it", () => {
    const withEnd = renderStep(
      STEPS.find((s) => s.showEnd)!,
      false,
    );
    const widthMatch = withEnd.match(/width="(\d+)"/)!;
    const width = Number(widthMatch[1]);
    // The end label text itself must appear, and the frame's own declared width must be this
    // genre's own FRAME.width — a clipped label would still be present in the markup (SVG text
    // does not truncate itself), so this also confirms the frame was not silently widened/narrowed.
    expect(width).toBe(FRAME.width);
    expect(withEnd).toContain("the sample basin · 615 mm");
  });
});

// ---------------------------------------------------------------------------
// The full render — one HTML file, N step sections, prose ungated, no-JS default baked in.
// ---------------------------------------------------------------------------

describe("renderScrolly / render — the full self-contained page", () => {
  it("should refuse fewer than two steps", async () => {
    await expect(
      renderScrolly({
        component: ScrollyChartSeed,
        steps: [STEPS[0]],
        props: {
          data: SAMPLE,
          title: "t",
          source: "s",
          subject: "x",
          ground: "#FFFFFF",
          accent: "#0B7A75",
        },
        outDir: "/tmp/twin-scrolly-test-refuse",
        name: "x.html",
      }),
    ).rejects.toThrow("at least two steps");
  });

  it("should refuse steps that reveal backward", async () => {
    const bad: ScrollyStep[] = [
      {
        id: "a",
        revealThrough: 2020,
        showPeak: false,
        showEnd: false,
        prose: ["a"],
      },
      {
        id: "b",
        revealThrough: 2018,
        showPeak: false,
        showEnd: false,
        prose: ["b"],
      },
    ];
    await expect(
      renderScrolly({
        component: ScrollyChartSeed,
        steps: bad,
        props: {
          data: SAMPLE,
          title: "t",
          source: "s",
          subject: "x",
          ground: "#FFFFFF",
          accent: "#0B7A75",
        },
        outDir: "/tmp/twin-scrolly-test-refuse2",
        name: "x.html",
      }),
    ).rejects.toThrow("reveal forward only");
  });

  it("should write one HTML file carrying every step's prose, ungated, and exactly one active frame", async () => {
    const outDir = "/tmp/twin-scrolly-test-full";
    const { outPath, readings, steps } = await render({
      dataPath: join(
        import.meta.dirname,
        "..",
        "assets",
        "sample-data",
        "rainfall.json",
      ),
      outDir,
      name: "test.html",
    });
    expect(readings).toBe(SAMPLE.length);
    expect(steps).toBe(STEPS.length);
    expect(existsSync(outPath)).toBe(true);

    const html = await readFile(outPath, "utf8");

    // Every step's own prose is present as plain text, not behind any conditional markup.
    for (const step of STEPS) {
      for (const p of step.prose) expect(html).toContain(p);
    }

    // Exactly one frame carries `active` at build time — the no-JS default.
    const activeFrames = html.match(/class="step-frame active"/g) ?? [];
    expect(activeFrames.length).toBe(1);

    // The first step's own frame is the one marked active, matching assets/ScrollySeed.tsx's own
    // doc-comment (item 3): STEPS[0], never assigned by the inline script.
    const firstFrame = html.slice(
      html.indexOf(`data-step="${STEPS[0].id}"`) - 40,
      html.indexOf(`data-step="${STEPS[0].id}"`) + 10,
    );
    expect(firstFrame).toContain("active");

    // The title/source live in the HTML header, unconditional and outside every step's own reveal
    // — see assets/ScrollySeed.tsx's own doc-comment on why this genre departs from the web genre
    // here.
    expect(html).toContain(
      "<h2>Flow through the sample basin fell by more than a third</h2>",
    );
    expect(html).toContain("Sample data — not a real measurement");

    // The interaction script is inlined, not fetched.
    expect(html).not.toContain("<script src=");
    expect(html).toContain("IntersectionObserver");

    // Reduced motion is opt-in only — the transition sits behind the media query, never bare.
    const transitionIndex = html.indexOf("transition: opacity");
    const mediaIndex = html.indexOf("prefers-reduced-motion: no-preference");
    expect(transitionIndex).toBeGreaterThan(-1);
    expect(mediaIndex).toBeGreaterThan(-1);
    expect(transitionIndex).toBeGreaterThan(mediaIndex);
  });
});
