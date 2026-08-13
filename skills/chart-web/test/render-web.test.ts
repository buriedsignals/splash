/**
 * REWRITTEN against the fluid frame (this skill's SECOND build, `references/web-discipline.md`,
 * "Responsive behaviour"). The previous version of this file could not even LOAD: it imported
 * `LAYOUTS` and `type WebLayout` from the CO₂ story's composition, both of which stopped existing
 * when the two-rung model was overturned, and its whole shape was built around that pair — a
 * `const [desktop, narrow] = LAYOUTS`, a `renderLayout(layout, …)` helper threading a `layout`
 * prop, and a loop asserting gutters "at the ${layout.name} layout".
 *
 * WHAT SURVIVED, AND WHY IT HAD TO BE RE-EXPRESSED RATHER THAN COPIED. The three invariants that
 * loop was protecting are still the right ones — nothing clipped, gutters inside the frame, the
 * plot's height derived from its content rather than assumed — but every one of them was written
 * against a world where the `<svg>` WAS the whole beat: it carried the words, its root `width`/
 * `height` attributes were the frame's real pixel size, and the plot rectangle sat INSET inside it
 * by padding baked into the viewBox. None of that is true now. The `<svg>` carries geometry only,
 * has no root `width`/`height` at all, and the plot rectangle IS the viewBox — `[0, width] ×
 * [0, height]` — because gutters became CSS grid tracks around it. So:
 *
 *   - "gutters inside the frame" is now a claim about `--y-gutter` (a real measured pixel value on
 *     a real grid track) and about the `aspect-ratio` being DERIVED from that measurement plus the
 *     real geometry — see "the frame's own proportions are measured, never assumed" below.
 *   - "nothing clipped" is now a claim about the geometry staying inside the viewBox. An SVG clips
 *     to its viewBox by default, so a coordinate outside it is silently cut at every width — which
 *     is exactly the class of defect the old assertion existed to catch, and is the reason
 *     `POINT_INSET` exists at all.
 *   - "height derived from content" is now a claim about the `aspect-ratio`'s denominator carrying
 *     the x-axis row, so the axis can never be overlapped by the plot above it.
 *
 * WHAT WAS DROPPED OUTRIGHT, each named so nobody re-adds it thinking it was lost by accident:
 *
 *   1. The `for (const layout of [desktop, narrow])` loop and both assertions inside it, in the
 *      form they had. There is one frame. A test that renders "the narrow layout" would have to
 *      invent a second frame this format does not ship, which is contorting an assertion to keep
 *      it rather than replacing it.
 *   2. `should keep both gutters inside the frame` in its literal form (`hit-area` x > 0 and
 *      x + width < frame width). Asserting that TODAY would assert a BUG: the hit area is
 *      deliberately `x=0 … width=frame.width`, the full plot box, so that a pointer anywhere over
 *      the plot resolves to a reading. The inequality it checked is now inverted by design.
 *   3. `should widen the right gutter to fit a longer end label rather than clip it`. The
 *      dedicated end-label gutter was removed by the redesign — the label now sits IN FRONT OF the
 *      plot as HTML with its own ground chip (`web-discipline.md`, "The one box this format
 *      allows"), so there is no gutter left to widen. The test was also already vacuous: it
 *      rendered a longer label and asserted only that the string was present, never that anything
 *      widened.
 *
 * The subject is still the CO₂ story's real composition rather than the seed. `seed-fluid-frame.
 * test.ts` covers the seed; this file's value is that the format's contract is proven against a
 * beat somebody actually shipped, and that the web format carries no second implementation of
 * data-to-coordinates. Reaching into `proof/co2-suisse/` from a `test/` directory is the one
 * exemption `splash/test/no-cross-skill-imports.test.ts` grants.
 *
 * None of this is the format's PROOF. A markup assertion cannot see a clipped label, a dead hover
 * or a frame taller than the window — `scripts/verify-web.mjs` drives a real browser for that.
 * This file protects the structure so the mechanism cannot be silently deleted.
 */
import { describe, it, expect, setDefaultTimeout } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
// THIS skill's own copy of the rasteriser helpers, not `chart-beat`'s (which the previous
// version of this file reached for). Both copies are held byte-identical by
// `splash/test/helper-parity.test.ts`; using the local one keeps this file's own dependency
// inside the skill it tests.
import { deriveFurniture, measureText } from "../scripts/render-still.mjs";
import {
  EmissionsWeb,
  FRAME,
  type WebFrame,
} from "../../../proof/co2-suisse/EmissionsWeb.tsx";
// The CO₂ story's own runner, in the story's own workspace — it left this skill when the skill
// stopped importing the story's component (a skill that imports out of itself does not build once
// copied on its own into a journalist's root). A `test/` directory may still reach for it; that is
// the one exemption `splash/test/no-cross-skill-imports.test.ts` grants.
import { readingsFromCsv } from "../../../proof/co2-suisse/render-web.mjs";
import {
  crossingGeometry,
  fr,
} from "../../../proof/co2-suisse/crossing-geometry";

// `measureText` loads a native rasteriser (`@resvg/resvg-js`) that scans every system font on its
// first call in a process — a one-time cost, observed here anywhere from ~100ms to several seconds
// under real system load, which the default 5000ms per-test budget is not built to absorb whenever
// this happens to be the first file bun:test loads. Every other suite in this repo warms the same
// cost inside a normal-length run because some earlier file already paid it; this file cannot
// assume that when run alone (`bun test skills/chart-web`), so it raises its own budget rather
// than risk a flaky red build over a one-time native-module cost that has nothing to do with a bug.
setDefaultTimeout(20000);

const FIXTURE_CSV = [
  "Entity,Code,Year,Annual CO₂ emissions",
  "France,FRA,1949,100000000",
  "Switzerland,CHE,1949,9000000",
  "Switzerland,CHE,1950,10251167",
  "Switzerland,CHE,1967,32527000",
  "Switzerland,CHE,1973,46204920",
  "Switzerland,CHE,2024,32071708",
  "France,FRA,2024,300000000",
].join("\n");

describe("readingsFromCsv", () => {
  it("should keep only the requested country, from the requested first year", () => {
    const readings = readingsFromCsv(FIXTURE_CSV, {
      entity: "Switzerland",
      firstYear: 1950,
    });
    expect(readings.map((r) => r.year)).toEqual([1950, 1967, 1973, 2024]);
  });

  it("should convert tonnes to megatonnes", () => {
    const readings = readingsFromCsv(FIXTURE_CSV, {
      entity: "Switzerland",
      firstYear: 1950,
    });
    expect(readings.find((r) => r.year === 1967)!.mt).toBeCloseTo(32.527, 3);
  });

  it("should refuse a csv with none of the required columns", () => {
    expect(() =>
      readingsFromCsv("a,b,c\n1,2,3", {
        entity: "Switzerland",
        firstYear: 1950,
      }),
    ).toThrow("Entity / Year / Annual CO");
  });
});

const BASE = {
  data: [
    { year: 1950, mt: 10.25 },
    { year: 1967, mt: 32.527 },
    { year: 1973, mt: 46.2 },
    { year: 2024, mt: 32.07 },
  ],
  title:
    "En 2024, la Suisse a émis moins de CO₂ sur son territoire qu'en 1967.",
  source:
    "Source : Global Carbon Budget 2025, via Our World in Data · données 2024",
  alt: "Une courbe qui grimpe puis redescend sous le niveau de 1967.",
  limits:
    "Émissions territoriales seulement, hors biens importés et aviation internationale.",
  ground: "#FFFFFF",
  accent: "#0B7A75",
  reference: 32.5,
  referenceLabel: "Niveau de 1967",
  peakLabel: "pic de 1973",
  measure: measureText,
};

/** One frame, one render — the replacement for the old `renderLayout(layout, …)`. `frame` is a
 *  parameter rather than a closed-over constant only so the proportion tests below can render the
 *  same beat at a deliberately different canonical geometry and watch the derived numbers follow;
 *  every other test takes the story's own shipped `FRAME`. */
function renderBeat(
  overrides: Partial<typeof BASE> = {},
  frame: WebFrame = FRAME,
) {
  const furniture = deriveFurniture(overrides.ground ?? BASE.ground);
  const props = { ...BASE, ...furniture, ...overrides, frame };
  return renderToStaticMarkup(createElement(EmissionsWeb, props));
}

/** The `<svg class="chart">` element's own markup, sliced out of the surrounding HTML furniture —
 *  the split this format's whole redesign is built on, so most assertions below need to say which
 *  side of it they are about. */
function svgOf(markup: string) {
  const from = markup.indexOf("<svg");
  const to = markup.indexOf("</svg>");
  expect(from).toBeGreaterThan(-1);
  expect(to).toBeGreaterThan(from);
  return markup.slice(from, to);
}

/** Every x/y coordinate the geometry actually draws at, as `{x, y}` pairs, from all four shapes
 *  this format uses. `r` is folded into the extremes for circles, because a circle is clipped by
 *  its EDGE, not its centre — which is the entire reason `POINT_INSET` exists. */
function drawnPoints(svg: string) {
  const pts: Array<{ x: number; y: number; what: string }> = [];
  for (const m of svg.matchAll(
    /<line[^>]*x1="([-\d.]+)"[^>]*x2="([-\d.]+)"[^>]*y1="([-\d.]+)"[^>]*y2="([-\d.]+)"/g,
  )) {
    pts.push({ x: Number(m[1]), y: Number(m[3]), what: "line start" });
    pts.push({ x: Number(m[2]), y: Number(m[4]), what: "line end" });
  }
  // Circle CENTRES, not edges. The radius is checked separately and per-axis, because the format
  // makes an inset promise on x (`POINT_INSET`) and none on y — see "should keep every point's
  // CENTRE inside the box" below for the measurement and why folding `r` in here would assert a
  // rule no component in this format implements.
  //
  // The leading `\s` on each attribute is load-bearing, not tidiness: an unanchored `r="` also
  // matches the tail of `data-yea|r="1973"`, which made the first draft of this helper read a
  // point's YEAR as its radius and report circle edges 2000 units outside the box. Caught by this
  // file's own assertion going red, which is the only reason to write the assertion at all.
  for (const m of svg.matchAll(
    /<circle[^>]*\scx="([-\d.]+)"[^>]*\scy="([-\d.]+)"[^>]*\sr="([-\d.]+)"/g,
  )) {
    pts.push({
      x: Number(m[1]),
      y: Number(m[2]),
      what: `circle centre (r=${Number(m[3])})`,
    });
  }
  for (const m of svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)) {
    const nums = (m[1].match(/[-\d.]+/g) ?? []).map(Number);
    for (let i = 0; i + 1 < nums.length; i += 2)
      pts.push({ x: nums[i], y: nums[i + 1], what: "path vertex" });
  }
  return pts;
}

describe("EmissionsWeb — the words", () => {
  it("should carry the title, the source, the limits and the alt text", () => {
    const markup = renderBeat();
    expect(markup).toContain("En 2024, la Suisse a");
    expect(markup).toContain("Global Carbon Budget 2025");
    expect(markup).toContain("Émissions territoriales seulement");
    expect(markup).toContain("<desc>Une courbe qui grimpe");
  });

  it("should not flatten its children behind role=img on the SVG root the way the static format does", () => {
    // web-discipline.md, "One deliberate departure": role=img on the ROOT would silence every
    // focusable point below it. The points themselves are individually role="img" on purpose —
    // it is only the root svg element this rule is about. Re-aimed at the `<svg>` specifically:
    // the component's own root element is now a `<figure>`, so slicing the first tag of the
    // markup (what this test used to do) would inspect the wrong element entirely and pass for
    // the wrong reason.
    //
    // NARROWED FROM "no `role=` at all", which was too blunt and cost the graphic its NAME. Measured
    // in Chrome on a delivered artifact through `Accessibility.getFullAXTree`: a root `<svg>` with a
    // `<desc>` and no name comes back as `SvgRoot`, `name: ""` — a description with nothing to
    // announce it against, which is why a bare `<desc>` is not reliably read out. The rule this test
    // is really about is the CHILDREN-FLATTENING roles, so those are what it names; `group` is
    // children-inclusive and is what `mapgen-dot-web` and `mapgen-symbol-web` already carried.
    const svg = svgOf(renderBeat());
    const rootTag = svg.slice(0, svg.indexOf(">") + 1);
    for (const flattening of [
      'role="img"',
      'role="presentation"',
      'role="none"',
    ])
      expect(rootTag).not.toContain(flattening);
  });

  it("should give the SVG root its own accessible name, not a bare <desc>", () => {
    // The other half of the same rule, and the half that was missing: a `<desc>` is a DESCRIPTION.
    // Without a name on the element it describes, it is announced inconsistently or not at all. This
    // fails if someone removes the name while "tidying up" the root tag.
    const svg = svgOf(renderBeat());
    const rootTag = svg.slice(0, svg.indexOf(">") + 1);
    const name = /aria-label(?:ledby)?="([^"]+)"/.exec(rootTag);
    expect(name?.[1] ?? "").not.toBe("");
  });

  it("should keep the reference rule, its label and the subject's end label unconditional", () => {
    // web-discipline.md, "What must not become interactive" — none of this is behind a class name
    // the interaction script could toggle off.
    const markup = renderBeat();
    expect(markup).toContain("Niveau de 1967");
    expect(markup).toContain("pic de 1973");
    expect(markup).toContain("2024 · 32,1 Mt");
    expect(markup).not.toContain("46,2 Mt<"); // the peak's own printed label stays silent on its value
  });

  it("should refuse a series with nothing to trace rather than draw a meaningless line", () => {
    expect(() => renderBeat({ data: [{ year: 2015, mt: 1 }] } as any)).toThrow(
      "needs at least two readings",
    );
  });
});

describe("EmissionsWeb — one fluid frame, geometry and type separated", () => {
  // This is the redesign's own contract, proven here on a REAL beat rather than only on the seed
  // (`seed-fluid-frame.test.ts` proves the same thing for `ChartWebSeed`). It replaces the old
  // two-rung loop: where that asked "is each of the two frames internally consistent", this asks
  // "is there exactly one frame, and is the thing that stretches free of the thing that must not".
  it("should render exactly one svg.chart — no second pre-rendered rung", () => {
    const markup = renderBeat();
    expect((markup.match(/class="chart"/g) ?? []).length).toBe(1);
    expect(markup).not.toContain("data-layout=");
  });

  it("should put no <text> inside the svg — every word is HTML outside it", () => {
    // The whole reason the viewBox may stretch to any width: type was never inside it to begin
    // with, so scaling the geometry cannot scale a font size.
    const markup = renderBeat();
    expect(svgOf(markup)).not.toContain("<text");
    const beforeSvg = markup.slice(0, markup.indexOf("<svg"));
    expect(beforeSvg).toContain("En 2024, la Suisse a");
    expect(markup).toContain("Niveau de 1967");
  });

  it("should stretch the svg rather than letterbox it, and carry no root pixel size", () => {
    const svg = svgOf(renderBeat());
    expect(svg).toContain('preserveAspectRatio="none"');
    expect(svg).toContain(`viewBox="0 0 ${FRAME.width} ${FRAME.height}"`);
    const rootTag = svg.slice(0, svg.indexOf(">") + 1);
    // A root width/height in pixels is what the two-rung build had and what would re-cap the
    // frame; the box's size comes from CSS now, never from the markup.
    expect(rootTag).not.toMatch(/\swidth="/);
    expect(rootTag).not.toMatch(/\sheight="/);
  });
});

describe("EmissionsWeb — nothing clipped (the old gutter invariant, re-expressed)", () => {
  it("should place every drawn coordinate inside the viewBox", () => {
    // An SVG clips to its viewBox: no `overflow: visible` is set, and setting one would only move
    // the problem into the neighbouring grid column. So a coordinate outside `[0, width] ×
    // [0, height]` is silently cut at EVERY container width — invisible to the markup, invisible
    // to a screenshot at one width, and the exact failure the old `hit-area` inequality was
    // written to catch back when the plot sat inset inside a larger canvas.
    const svg = svgOf(renderBeat());
    const outside = drawnPoints(svg).filter(
      (p) => p.x < 0 || p.y < 0 || p.x > FRAME.width || p.y > FRAME.height,
    );
    expect(
      outside.map((p) => `${p.what} at ${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    ).toEqual([]);
  });

  it("should inset the first and last point so their own circles never clip against the SIDE edges", () => {
    // The specific case the rule above generalises, kept separate because it is the one a future
    // edit is most likely to break: an end point drawn flush at x=0 or x=width loses half its
    // accent dot, and nothing but a rendered pixel would say so. This is exactly the promise
    // `POINT_INSET` makes and it is kept — measured worst-case x overhang is 0.000 units, in this
    // beat and in the seed alike.
    const svg = svgOf(renderBeat());
    const pts = [
      ...svg.matchAll(
        /<circle class="pt"[^>]*\scx="([-\d.]+)"[^>]*\sr="([-\d.]+)"/g,
      ),
    ].map((m) => ({ cx: Number(m[1]), r: Number(m[2]) }));
    expect(pts.length).toBeGreaterThan(1);
    for (const p of pts) {
      expect(p.cx - p.r).toBeGreaterThanOrEqual(0);
      expect(p.cx + p.r).toBeLessThanOrEqual(FRAME.width);
    }
  });

  it("should keep every point's CENTRE inside the box, bounding the vertical overhang by its own radius", () => {
    // A DELIBERATELY WEAKER CLAIM ON THE VERTICAL AXIS THAN ON THE HORIZONTAL, and the reason is
    // that the format only ever made the horizontal promise. `POINT_INSET` insets the x-range on
    // both sides; nothing insets y, because the fitted scale maps the data straight onto
    // `[height, 0]`. So a reading at the bottom of the fitted range sits within `r` of the floor
    // and its own hit circle overhangs it.
    //
    // Measured, rather than assumed, at the time of writing: worst vertical overhang 2.125 units
    // of a 460-unit box here, and 0.657 of 380 in `ChartWebSeed`. It is the INVISIBLE hit circle
    // (`fill="transparent"`), so nothing is cut at rest; what a reader can lose is a sliver of the
    // muted disc CSS paints while that lowest point is hovered or focused. Small, real, and the
    // format's own — not this beat's, and not something a skill test may quietly fix by asserting
    // a rule no component implements. It is recorded in `references/web-discipline.md`,
    // "Nothing clipped", as a named gap.
    //
    // What IS asserted is the bound that keeps it small: a centre inside the box means the
    // overhang can never exceed the radius. A point whose CENTRE escapes is a genuine geometry
    // fault and goes red here.
    const svg = svgOf(renderBeat());
    const pts = [
      ...svg.matchAll(
        /<circle class="pt"[^>]*\scx="([-\d.]+)"[^>]*\scy="([-\d.]+)"[^>]*\sr="([-\d.]+)"/g,
      ),
    ].map((m) => ({ cy: Number(m[2]), r: Number(m[3]) }));
    expect(pts.length).toBe(BASE.data.length);
    for (const p of pts) {
      expect(p.cy).toBeGreaterThanOrEqual(0);
      expect(p.cy).toBeLessThanOrEqual(FRAME.height);
      expect(p.cy + p.r - FRAME.height).toBeLessThanOrEqual(p.r);
    }
  });

  it("should position every overlay label within the box it annotates", () => {
    // The HTML furniture is placed in `%` of the same grid cell the svg occupies, so a value
    // outside 0–100% means a label that has walked off the plot it is pointing at — at every
    // width at once, since the percentage is width-independent.
    const markup = renderBeat();
    const overlay = markup.slice(
      markup.indexOf('class="overlay"'),
      markup.indexOf('<div class="x-axis"'),
    );
    expect(overlay.length).toBeGreaterThan(0);
    const positions = [...overlay.matchAll(/(left|top):([\d.]+)%/g)].map(
      (m) => ({ side: m[1], value: Number(m[2]) }),
    );
    expect(positions.length).toBeGreaterThan(0);
    expect(positions.filter((p) => p.value < 0 || p.value > 100)).toEqual([]);
  });
});

describe("EmissionsWeb — the frame's own proportions are measured, never assumed", () => {
  const gutterOf = (markup: string) =>
    Number(markup.match(/--y-gutter:([\d.]+)px/)![1]);
  const ratioOf = (markup: string) => {
    const m = markup.match(/aspect-ratio:([\d.]+) \/ ([\d.]+)/)!;
    return { w: Number(m[1]), h: Number(m[2]) };
  };

  it("should size the y-axis gutter from a real measurement, not a constant", () => {
    // The one gutter this format still measures. It is a CSS grid track now rather than viewBox
    // padding, which is why the old assertion could not simply be kept — but "the label column is
    // wide enough for the labels that will sit in it" is the same claim, and it is still the one
    // worth making.
    const markup = renderBeat();
    const gutter = gutterOf(markup);
    expect(gutter).toBeGreaterThan(0);
    const labels = [
      ...markup.matchAll(/class="axis-label y"[^>]*>([^<]+)</g),
    ].map((m) => m[1]);
    expect(labels.length).toBeGreaterThan(0);
    const widest = Math.max(...labels.map((l) => measureText(l, FRAME.axis)));
    expect(gutter).toBeGreaterThan(widest);
  });

  it("should derive the aspect-ratio from the measured gutter and the real geometry", () => {
    // The successor to "derive the frame's height from its own content, never clip the plot".
    // Height is no longer a number in the markup at all — it is a RATIO, and this is the
    // assertion that it was computed rather than typed. A hand-picked ratio goes red here.
    const markup = renderBeat();
    const { w, h } = ratioOf(markup);
    expect(w).toBeCloseTo(gutterOf(markup) + FRAME.width, 3);
    expect(h).toBeCloseTo(FRAME.height + FRAME.xAxisRowPx, 3);
  });

  it("should reserve the x-axis row in that ratio, so the axis is never overlapped", () => {
    const { h } = ratioOf(renderBeat());
    expect(h).toBeGreaterThan(FRAME.height);
    expect(h - FRAME.height).toBe(FRAME.xAxisRowPx);
  });

  it("should follow a different canonical geometry rather than bake this one in", () => {
    // The proof that the two numbers above are derived and not coincidences: render the same beat
    // at a deliberately different canonical size and watch every derived value move with it.
    const other: WebFrame = {
      ...FRAME,
      width: 640,
      height: 300,
      xAxisRowPx: 40,
    };
    const markup = renderBeat({}, other);
    const { w, h } = ratioOf(markup);
    expect(w).toBeCloseTo(gutterOf(markup) + 640, 3);
    expect(h).toBeCloseTo(340, 3);
    expect(svgOf(markup)).toContain('viewBox="0 0 640 300"');
  });
});

describe("EmissionsWeb — every reading reachable, and reachable without JS", () => {
  it("should render one focusable, labelled point per reading, none of it hidden without JS", () => {
    const markup = renderBeat();
    const points = markup.match(/class="pt"/g) ?? [];
    expect(points.length).toBe(BASE.data.length);
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('aria-label="1967 : 32,5 Mt"');
    expect(markup).toContain('data-detail="1967 · 32,5 Mt"');
  });

  it("should give each point the exact formatted value the source data carries", () => {
    // Cross-checked against the same three years the live browser drive also checks.
    const markup = renderBeat();
    expect(markup).toContain('data-detail="1950 · 10,3 Mt"');
    expect(markup).toContain('data-detail="1973 · 46,2 Mt"');
    expect(markup).toContain('data-detail="2024 · 32,1 Mt"');
  });

  it("should bake a data-detail on every hoverable mark, since that is what the tooltip reads", () => {
    // `assets/interaction.mjs` never formats a number — it reads this attribute back. A mark that
    // can be hovered but carries no detail is a mark that answers a reader with nothing, and it
    // is the contract `scripts/verify-web.mjs` discovers a beat's readings by.
    const markup = renderBeat();
    const hoverable = markup.match(/class="pt"/g) ?? [];
    const detailed = markup.match(/data-detail="/g) ?? [];
    expect(detailed.length).toBeGreaterThanOrEqual(hoverable.length);
  });

  it("should give the pointer one hit area covering the whole plot box", () => {
    // Deliberately the INVERSE of what this file used to assert. When the plot sat inset inside a
    // bigger canvas, a hit area starting at x=0 would have meant the geometry was inverted; now
    // the plot IS the box, and a hit area smaller than it would leave columns of the chart where
    // a pointer resolves to nothing — the "do not ask a phone reader to land a tap on a 5px
    // circle" rule in `web-discipline.md`, "Keyboard and touch".
    const svg = svgOf(renderBeat());
    const hits = [
      ...svg.matchAll(
        /<rect class="hit-area" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*fill="([^"]+)"/g,
      ),
    ];
    expect(hits.length).toBe(1);
    const [, x, y, w, h, fill] = hits[0];
    expect(Number(x)).toBe(0);
    expect(Number(y)).toBe(0);
    expect(Number(w)).toBe(FRAME.width);
    expect(Number(h)).toBe(FRAME.height);
    // And it must stay INVISIBLE. It is the topmost rect in the svg and covers the entire plot, so
    // any paint on it hides the whole chart behind it — a mutation the closed-palette test cannot
    // catch, because painting it with the beat's own accent uses a colour that is legitimately in
    // the palette.
    expect(fill).toBe("transparent");
  });
});

describe("EmissionsWeb — the palette stays closed and the accent stays reserved", () => {
  it("should paint only with the ground, its derived furniture and the one accent", () => {
    const ground = "#101820";
    const accent = "#E6A700";
    const furniture = deriveFurniture(ground);
    const markup = renderBeat({ ground, accent });
    const allowed = new Set(
      [ground, accent, furniture.ink, furniture.muted, furniture.grid].map(
        (c) => c.toLowerCase(),
      ),
    );
    const used = new Set(
      (markup.match(/#[0-9a-fA-F]{6}/g) ?? []).map((c) => c.toLowerCase()),
    );
    expect([...used].filter((c) => !allowed.has(c))).toEqual([]);
    expect(used.has(accent.toLowerCase())).toBe(true);
  });

  it("should never colour a non-subject point with the accent, even in the markup that hover would toggle", () => {
    // The .pt circles' own fill attribute — the state hover/focus start from — is transparent,
    // never the accent; only CSS (never inlined per-point) can move it to muted on interaction.
    const svg = svgOf(renderBeat());
    const ptFills = [...svg.matchAll(/class="pt"[^>]*fill="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(ptFills.length).toBe(BASE.data.length);
    expect(ptFills.every((f) => f === "transparent")).toBe(true);
  });
});

describe("nearestIndex", () => {
  it("should pick the entry closest to the given x, including ties toward the first", async () => {
    const { nearestIndex } = await import("../assets/interaction.mjs");
    expect(nearestIndex([10, 20, 30], 21)).toBe(1);
    expect(nearestIndex([10, 20, 30], 26)).toBe(2);
    expect(nearestIndex([10, 20, 30], 15)).toBe(0);
    expect(nearestIndex([10, 20, 30], -5)).toBe(0);
    expect(nearestIndex([10, 20, 30], 999)).toBe(2);
  });
});

describe("crossingGeometry reuse (one geometry, three outputs)", () => {
  it("should place this format's points at the exact coordinates the static/video formats would compute", () => {
    // The web format must not carry a second implementation of data-to-coordinates. Calling the
    // shared core directly here, at the FRAME's own canonical box and the component's own inset,
    // and comparing to the coordinates the component actually drew, pins that there is only one.
    // Under the two-rung build this could only be checked against a hand-written padding object
    // that duplicated the layout's own; now the frame IS the box, so the comparison is exact.
    const inset = 6; // POINT_INSET, `EmissionsWeb.tsx` — the only padding left in the viewBox
    const g = crossingGeometry(BASE.data, {
      width: FRAME.width,
      height: FRAME.height,
      padding: { top: 0, right: inset, bottom: 0, left: inset },
      reference: BASE.reference,
    });
    expect(g.points.map((p) => p.year)).toEqual(BASE.data.map((d) => d.year));
    expect(fr(g.end.mt)).toBe("32,1");

    const drawn = [
      ...svgOf(renderBeat()).matchAll(
        /<circle class="pt"[^>]*\scx="([-\d.]+)" cy="([-\d.]+)"/g,
      ),
    ].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
    expect(drawn.length).toBe(g.points.length);
    drawn.forEach((d, i) => {
      expect(d.x).toBeCloseTo(g.points[i].x, 6);
      expect(d.y).toBeCloseTo(g.points[i].y, 6);
    });
  });
});
