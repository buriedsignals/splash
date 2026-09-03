import { describe, it, expect, setDefaultTimeout } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture } from "../scripts/render-still.mjs";
import { MapWebSeed, RegionTable, pointDetail } from "../assets/MapWebSeed.tsx";
import { renderMapWeb, separationHeadroom } from "../scripts/render-web.mjs";
import {
  radiusScale,
  niceReferenceValues,
  drawOrder,
  readingOrder,
  labelPlacement,
  keepPoint,
  groupsOf,
  markLayers,
  slugOf,
  fr,
} from "../assets/geo-symbol.ts";

// `deriveFurniture` is cheap (pure colour maths), unlike the old `measureText` this file used to
// warm up — kept anyway in case a future addition reaches for a native rasteriser again.
setDefaultTimeout(20000);

// The seed's own `SUBJECT_KEY` constant is `"paris"` (`MapWebSeed.tsx`) — every fixture below that
// exercises the happy path needs a point carrying that exact key, or the component throws by
// design (the same "no point for the subject" check `Co2MapStill.tsx` makes for its own subject).
const POINTS = [
  {
    key: "paris",
    name: "Alpha City",
    lon: 2.0,
    lat: 48.0,
    value: 11.0,
    px: 100,
    py: 100,
    group: "West",
  },
  {
    key: "b",
    name: "Beta Town",
    lon: 3.0,
    lat: 49.0,
    value: 5.6,
    px: 200,
    py: 150,
    group: "East",
  },
  {
    key: "c",
    name: "Gamma",
    lon: 4.0,
    lat: 50.0,
    value: 1.4,
    px: 300,
    py: 200,
    group: "East",
  },
];

const GEOMETRY = { frame: { width: 420, height: 420 }, points: POINTS };

const BASE = {
  geometry: GEOMETRY,
  plate: "data:image/png;base64,AAAA",
  title: "A fixture map",
  source: "Fixture source",
  basemapCredit: "basemap © Fixture",
  legendCaption: "Value, millions",
  caveat: "Fixture caveat text.",
  alt: "Three circles on a fixture map.",
  ground: "#FFFFFF",
  accent: "#0B7A75",
};

function renderSeed(overrides: Partial<typeof BASE> = {}) {
  const furniture = deriveFurniture(
    (overrides.ground ?? BASE.ground) as string,
  );
  const props = { ...BASE, ...furniture, ...overrides };
  return renderToStaticMarkup(createElement(MapWebSeed, props as any));
}

describe("radiusScale", () => {
  it("should give the max value the full requested radius and zero the zero value", () => {
    const scale = radiusScale(10, 30);
    expect(scale(10)).toBeCloseTo(30, 5);
    expect(scale(0)).toBe(0);
  });

  it("should be an equal-area (sqrt) scale, not linear", () => {
    const scale = radiusScale(100, 30);
    // Half the value should NOT be half the radius (linear) — sqrt(0.5) ≈ 0.707.
    expect(scale(50)).toBeCloseTo(30 * Math.sqrt(0.5), 5);
  });
});

// The legend is the only thing on a proportional-symbol map that says what an area MEANS — there
// is no axis. So these assert the property the name promises, not merely that the list descends:
// the previous test said "round, decreasing, at most count" and checked only the last two, which is
// why a legend reading 9 815 · 19 629 · 29 444 was green for as long as it existed.
describe("niceReferenceValues", () => {
  const LADDER = [1, 2, 2.5, 5];
  const isRoundMagnitude = (value: number) => {
    const mantissa = value / Math.pow(10, Math.floor(Math.log10(value)));
    return LADDER.some((rung) => Math.abs(rung - mantissa) < 1e-9);
  };

  it("should return values a reader can hold — 1/2/2.5/5 x 10^n, not one datum's arithmetic", () => {
    // Counts, which is the honest use of this chart type: the type sheet is explicit that circle
    // area encodes a TOTAL, and totals are rarely single digits. This is the case the old
    // implementation read 9 814.7 on.
    expect(niceReferenceValues(29444, 3)).toEqual([25000, 10000, 5000]);
    expect(niceReferenceValues(11.0, 3)).toEqual([10, 5, 2.5]);
  });

  it("should keep every value round at any magnitude", () => {
    for (const max of [0.4, 1, 3, 7, 100, 250, 999999, 0.0031]) {
      for (const value of niceReferenceValues(max, 3)) {
        expect(isRoundMagnitude(value)).toBe(true);
        expect(value).toBeLessThanOrEqual(max);
      }
    }
  });

  it("should halve, so no two legend circles are a radius apart the eye cannot separate", () => {
    // 25 000 / 20 000 / 10 000 is three round numbers and a broken legend: the first two draw
    // circles whose radii differ by 12%. Consecutive ladder rungs are not enough.
    for (const max of [29444, 11.0, 0.4, 250]) {
      const values = niceReferenceValues(max, 3);
      for (let i = 1; i < values.length; i++)
        expect(values[i]!).toBeLessThanOrEqual(values[i - 1]! / 2);
    }
  });

  it("should return round, decreasing values, at most `count`", () => {
    const values = niceReferenceValues(11.0, 3);
    expect(values.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < values.length; i++)
      expect(values[i]).toBeLessThan(values[i - 1]!);
  });

  it("should never return a non-positive value", () => {
    for (const v of niceReferenceValues(0.4, 3)) expect(v).toBeGreaterThan(0);
    // And nothing at all rather than a nonsense rung when there is no positive maximum.
    expect(niceReferenceValues(0, 3)).toEqual([]);
    expect(niceReferenceValues(-5, 3)).toEqual([]);
  });
});

// An ungrouped study set - issue #51. SKILL.md documents the beat with no filter as the NORMAL
// case and the discipline argues against adding one, but every point in `regions.json` carries a
// group (it is the beat that demonstrates the filter), so the ungrouped path had no coverage and
// `slugOf(undefined)` crashed the live layer, the slug guard and the filter CSS in turn. Since
// ruling R1 made the live map mandatory for every map x web beat, that meant such a beat could not
// be rendered at all.
describe("a beat with no filter dimension", () => {
  const UNGROUPED = [
    { key: "a", name: "A", lon: 1, lat: 1, value: 10, px: 0, py: 0 },
    { key: "b", name: "B", lon: 2, lat: 2, value: 20, px: 1, py: 1 },
  ];
  const LAYER = {
    maxValue: 20,
    maxRadiusFrameUnits: 10,
    subjectKey: "a",
    accent: "#f00",
    muted: "#999",
  };

  it("should report no filter groups at all, so nothing downstream slugs an absent one", () => {
    expect(groupsOf(UNGROUPED)).toEqual([]);
    // The condition SKILL.md and the discipline both name for shipping no filter.
    expect(groupsOf(UNGROUPED).length).toBeLessThanOrEqual(1);
  });

  it("should build the live layer without crashing, carrying a null group", () => {
    const { source } = markLayers(UNGROUPED, LAYER);
    expect(source.features.map((f) => f.properties.group)).toEqual([null, null]);
  });

  it("should still slug a real group when the beat declares one", () => {
    const grouped = UNGROUPED.map((p, i) => ({ ...p, group: i ? "East" : "Western Europe" }));
    expect(groupsOf(grouped)).toEqual(["East", "Western Europe"]);
    const { source } = markLayers(grouped, LAYER);
    expect(source.features.map((f) => f.properties.group).sort()).toEqual([
      "east",
      "western-europe",
    ]);
  });
});

describe("drawOrder / readingOrder", () => {
  it("should sort largest value first", () => {
    const ordered = drawOrder(POINTS);
    expect(ordered.map((p) => p.key)).toEqual(["paris", "b", "c"]);
  });

  it("should agree with drawOrder — one order for the keyboard and the table", () => {
    expect(readingOrder(POINTS).map((p) => p.key)).toEqual(
      drawOrder(POINTS).map((p) => p.key),
    );
  });
});

describe("labelPlacement", () => {
  it("should flip the label to the left near the right edge", () => {
    expect(labelPlacement(400, 200, { width: 420, height: 420 }).side).toBe(
      "left",
    );
  });

  it("should keep the label on the right away from the edge", () => {
    expect(labelPlacement(50, 200, { width: 420, height: 420 }).side).toBe(
      "right",
    );
  });
});

describe("keepPoint", () => {
  it("should keep a point inside the frame", () => {
    expect(keepPoint({ px: 200, py: 200 }, { width: 420, height: 420 })).toBe(
      true,
    );
  });

  it("should drop a point far outside the frame", () => {
    expect(keepPoint({ px: -500, py: 200 }, { width: 420, height: 420 })).toBe(
      false,
    );
  });
});

describe("fr", () => {
  it("should format with a French decimal comma", () => {
    expect(fr(11)).toBe("11,0");
    expect(fr(1.4)).toBe("1,4");
  });
});

describe("pointDetail", () => {
  it("should be the one implementation the hit-target attributes and the table both draw from", () => {
    expect(pointDetail({ name: "Alpha City", value: 11 })).toBe(
      "Alpha City : 11,0 million inhabitants",
    );
  });
});

describe("groupsOf / slugOf", () => {
  it("should list distinct groups once, in a stable sorted order", () => {
    expect(groupsOf(POINTS)).toEqual(["East", "West"]);
  });

  it("should slug a group name into a CSS-id-safe string", () => {
    expect(slugOf("Central & Northern Europe")).toBe("central-northern-europe");
  });
});

describe("MapWebSeed", () => {
  it("should carry the title, the source and the caveat as plain HTML, not SVG text", () => {
    const html = renderSeed();
    expect(html).toContain('class="mw-title"');
    expect(html).toContain("A fixture map");
    expect(html).toContain('class="mw-source"');
    expect(html).toContain("Fixture source");
    expect(html).toContain('class="mw-caveat"');
    expect(html).toContain("Fixture caveat");
    expect(html).not.toMatch(/<svg[^>]*>[\s\S]*<text/); // the SVG itself carries no <text>
  });

  it("should carry the alt text as the SVG's own aria-label, not a visible caption", () => {
    const html = renderSeed();
    expect(html).toContain('aria-label="Three circles on a fixture map."');
  });

  it("should render one fluid <svg> with viewBox matching the frame and no fixed pixel width", () => {
    const html = renderSeed();
    expect(html).toContain('viewBox="0 0 420 420"');
    expect(html).not.toMatch(/<svg[^>]*\bwidth="\d/); // no hardcoded pixel width on the svg itself
  });

  it("should render exactly one <svg> — no second, breakpoint-swapped layout", () => {
    const html = renderSeed();
    expect((html.match(/<svg/g) ?? []).length).toBe(1);
  });

  it("should render one focusable, labelled HTML button per point, none of it hidden without JS", () => {
    const html = renderSeed();
    const points = html.match(/class="pt"/g) ?? [];
    expect(points.length).toBe(POINTS.length);
    expect(html).toContain('<button type="button" class="pt"');
    expect(html).toContain(
      'aria-label="Alpha City : 11,0 million inhabitants"',
    );
    expect(html).toContain('data-detail="Beta Town : 5,6 million inhabitants"');
  });

  it("should carry a native title attribute per point button, the no-JS tooltip", () => {
    const html = renderSeed();
    expect(html).toContain('title="Gamma : 1,4 million inhabitants"');
  });

  it("should tag every point button, decorative circle and point label with its own data-group", () => {
    const html = renderSeed();
    // `data-r` sits between the detail and the group since B6.20: it is the mark's own radius in
    // frame units, and the live layer sizes the painted highlight from it. Asserted here in the
    // attribute run rather than separately, so removing it fails a test that already exists.
    expect(html).toMatch(
      /data-key="paris" data-detail="Alpha City : 11,0 million inhabitants" data-r="[\d.]+" data-group="west"/,
    );
    // The decorative SVG mark too — not just the interactive button and the label — or a filtered
    // view leaves unlabelled ghost circles on the map (caught by screenshotting the filtered
    // state; see references/map-web-discipline.md, "Filters").
    expect((html.match(/<circle[^>]*data-group="west"/g) ?? []).length).toBe(1);
    expect((html.match(/<circle[^>]*data-group="east"/g) ?? []).length).toBe(2);
    expect((html.match(/class="point-label[^"]*"/g) ?? []).length).toBe(
      POINTS.length,
    );
  });

  it("should carry the group SLUG in data-group, never the raw name — the value a CSS selector has to quote", () => {
    // The defect this pins: the raw name was HTML-escaped into the generated selector, so a group
    // called "Central & Northern Europe" produced `[data-group="Central &amp; Northern Europe"]`,
    // which matches nothing in CSS — and the `:not()` around it then matched everything, emptying
    // the map. See references/map-web-discipline.md, "Filters".
    const ampersand = POINTS.map((p) =>
      p.group === "East" ? { ...p, group: "Central & Northern" } : p,
    );
    const html = renderSeed({
      geometry: { frame: GEOMETRY.frame, points: ampersand },
    } as any);
    expect(html).toContain('data-group="central-northern"');
    expect(html).toContain('id="mw-filter-central-northern"');
    // The raw name still reads as the chip's own visible label — it is the value carried in
    // `data-group` (and quoted in a CSS selector) that must never be the escaped form.
    expect(html).toContain("<span>Central &amp; Northern</span>");
    expect(html).not.toMatch(/data-group="[^"]*&amp;/);
  });

  it("should render a filter fieldset with one radio per group plus an 'all' radio, all checked by 'All'", () => {
    const html = renderSeed();
    expect(html).toContain('class="mw-filter"');
    expect(html).toContain('id="mw-filter-all"');
    expect(html).toMatch(/id="mw-filter-all"[^>]*checked/);
    expect(html).toContain('id="mw-filter-east"');
    expect(html).toContain('id="mw-filter-west"');
  });

  it("should draw each filter option as a chip around a REAL radio, not a div wearing a role", () => {
    // The styling must not cost the native control (references/map-web-discipline.md, "Filters"):
    // whatever the chip looks like, Tab reaching the group and Arrow keys moving within it come
    // from the input being a real radio in a real fieldset, and nothing else.
    const html = renderSeed();
    const chips = html.match(/<label class="mw-chip">/g) ?? [];
    expect(chips.length).toBe(groupsOf(POINTS).length + 1); // one per group, plus "All regions"
    expect(html).not.toContain('role="radio"');
    expect(html).toMatch(
      /<label class="mw-chip"><input type="radio" id="mw-filter-all" name="mw-filter" checked/,
    );
  });

  it("should put the title before the filter — a control never precedes the claim it narrows", () => {
    const html = renderSeed();
    expect(html.indexOf('class="mw-title"')).toBeLessThan(
      html.indexOf('class="mw-filter"'),
    );
  });

  it("should wrap the map in a stage — the box that gets whatever height the window has left", () => {
    const html = renderSeed();
    expect(html).toContain('class="mw-stage"');
    expect(html.indexOf('class="mw-stage"')).toBeLessThan(
      html.indexOf('class="mw-viewport"'),
    );
  });

  it("should render no filter fieldset when every point shares one group", () => {
    const oneGroup = POINTS.map((p) => ({ ...p, group: "Everywhere" }));
    const html = renderSeed({
      geometry: { frame: GEOMETRY.frame, points: oneGroup },
    } as any);
    expect(html).not.toContain('class="mw-filter"');
  });

  // Ruling R1 deleted the bounded-zoom checkbox and the `ZOOM_SCALE` constant behind it: the map is
  // a live MapTiler map with its own zoom and pan now, and B6.14b asked for the out-of-map button's
  // removal by name. These pin that it is gone rather than merely off by default.
  it("should render no out-of-map zoom control at all", () => {
    const html = renderSeed();
    expect(html).not.toContain("mw-zoom-toggle");
    expect(html).not.toContain("bounded");
    expect(html).not.toContain("Pannable map area");
  });

  it("should ship the two map layers, with the fallback carrying the plate", () => {
    const html = renderSeed();
    expect(html).toContain('id="mw-map"');
    expect(html).toContain('id="mw-fallback"');
    expect(html).toContain("data:image/png;base64,");
  });

  it("should keep the labels and hit targets OUT of the fallback, so hiding it keeps every Tab stop", () => {
    // The first live draft nested them inside `#mw-fallback`. Hiding the fallback on `map.on(load)`
    // took every point label and every keyboard target with it — a total loss of keyboard reach on
    // the exact path the ruling was meant to improve, and nothing was red.
    const html = renderSeed();
    const fallbackStart = html.indexOf('id="mw-fallback"');
    const overlayStart = html.indexOf('class="mw-overlay"');
    expect([fallbackStart >= 0, overlayStart > fallbackStart]).toEqual([
      true,
      true,
    ]);
    expect(html.slice(fallbackStart, overlayStart)).not.toContain('class="pt"');
  });

  it("should not flatten the map's interactive children behind role=img on the svg", () => {
    const html = renderSeed();
    const svgOpenTag = html.slice(
      html.indexOf("<svg"),
      html.indexOf(">", html.indexOf("<svg")) + 1,
    );
    expect(svgOpenTag).not.toContain('role="img"');
  });

  it("should throw rather than draw a symbol map with fewer than two points", () => {
    expect(() =>
      renderSeed({
        geometry: { frame: GEOMETRY.frame, points: [POINTS[0]!] },
      } as any),
    ).toThrow("needs at least two points");
  });

  it("should throw naming a missing subject rather than silently drop it", () => {
    const withoutParis = {
      frame: GEOMETRY.frame,
      points: POINTS.filter((p) => p.key !== "paris"),
    };
    expect(() => renderSeed({ geometry: withoutParis } as any)).toThrow(
      "no point for the subject",
    );
  });

  it("should paint only with the ground, its derived furniture and the one accent", () => {
    const ground = "#101820";
    const accent = "#E6A700";
    const furniture = deriveFurniture(ground);
    const html = renderToStaticMarkup(
      createElement(MapWebSeed, {
        ...BASE,
        ground,
        accent,
        ...furniture,
      } as any),
    );
    const allowed = new Set(
      [ground, accent, furniture.ink, furniture.muted].map((c) =>
        c.toLowerCase(),
      ),
    );
    const used = new Set(
      (html.match(/#[0-9a-fA-F]{6}/g) ?? []).map((c) => c.toLowerCase()),
    );
    expect([...used].filter((c) => !allowed.has(c))).toEqual([]);
    expect(used.has(accent.toLowerCase())).toBe(true);
  });
});

describe("RegionTable", () => {
  it("should render one row per point, largest value first, with a caption and scoped headers", () => {
    const furniture = deriveFurniture(BASE.ground);
    const html = renderToStaticMarkup(
      createElement(RegionTable, { points: POINTS, ...furniture }),
    );
    expect(html).toContain("<caption>");
    expect(html).toContain('<th scope="col">');
    const rowNames = [...html.matchAll(/<th scope="row">([^<]+)<\/th>/g)].map(
      (m) => m[1],
    );
    expect(rowNames).toEqual(["Alpha City", "Beta Town", "Gamma"]);
  });

  it("should print the exact same formatted value the map's own data-detail carries", () => {
    const furniture = deriveFurniture(BASE.ground);
    const html = renderToStaticMarkup(
      createElement(RegionTable, { points: POINTS, ...furniture }),
    );
    expect(html).toContain("11,0 M");
    expect(html).toContain("1,4 M");
  });

  it("should tag every row with its own data-group SLUG, the same filter that narrows the map", () => {
    const furniture = deriveFurniture(BASE.ground);
    const html = renderToStaticMarkup(
      createElement(RegionTable, { points: POINTS, ...furniture }),
    );
    expect(html).toContain('data-group="west"');
    expect((html.match(/data-group="east"/g) ?? []).length).toBe(2);
  });
});

/**
 * `renderMapWeb` — the format's own machinery, exercised through the file it actually writes. These
 * assertions are about the HTML on disk, not about a React tree, because the two places this format
 * has been wrong were both in the assembly: a CSS selector that quoted a string the markup never
 * carried, and a table nobody chose to include.
 */
describe("renderMapWeb", () => {
  const PROPS = { ...BASE, geometry: GEOMETRY };

  async function build(options: Record<string, unknown> = {}) {
    const outDir = mkdtempSync(join(tmpdir(), "map-web-render-"));
    try {
      await renderMapWeb({
        component: MapWebSeed,
        table: RegionTable,
        props: PROPS as any,
        outDir,
        name: "beat.html",
        ...options,
      });
      return readFileSync(join(outDir, "beat.html"), "utf8");
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  }

  it("should leave the accessible region table OUT by default — it is opt-in per beat", async () => {
    const html = await build();
    expect(html).not.toContain('class="region-table"');
    // What a reader without the table still has, and what the discipline file weighs the choice
    // against: every point is still a labelled, focusable button.
    expect(html).toContain(
      'aria-label="Alpha City : 11,0 million inhabitants"',
    );
  });

  it("should render the table when the beat asks for it, with one row per point", async () => {
    // `tableRowNoun` is required alongside `regionTable` since B5.2: the table now ships inside a
    // disclosure whose summary has to say what it holds, and nothing in the format can invent that
    // word. `the-value-table-is-collapsed.test.ts` owns the disclosure's own assertions.
    const html = await build({
      regionTable: true,
      tableRowNoun: "metro areas",
    });
    expect(html).toContain('class="region-table"');
    expect((html.match(/<th scope="row">/g) ?? []).length).toBe(POINTS.length);
  });

  it("should refuse to render a table the beat gave no word for", async () => {
    // The invariant this format keeps everywhere: nothing renders in a value nobody chose. A summary
    // reading "Table of values — 3 undefined" would be worse than the throw.
    await expect(build({ regionTable: true })).rejects.toThrow(/tableRowNoun/);
  });

  it("should generate a filter selector quoting the SLUG, never an HTML-escaped group name", async () => {
    const ampersand = POINTS.map((p) =>
      p.group === "East" ? { ...p, group: "Central & Northern" } : p,
    );
    const html = await build({
      props: { ...PROPS, geometry: { ...GEOMETRY, points: ampersand } },
    });
    expect(html).toContain(
      '.map-web-page:has(#mw-filter-central-northern:checked) .pt:not([data-group="central-northern"])',
    );
    // The exact string that used to be generated, and that matched nothing.
    expect(html).not.toContain('[data-group="Central &amp; Northern"]');
  });

  it("should refuse two groups that slug alike rather than render a filter that narrows to both", async () => {
    const collide = POINTS.map((p, i) => ({
      ...p,
      group: i === 0 ? "Nord-Ost" : "Nord/Ost",
    }));
    await expect(
      build({
        props: { ...PROPS, geometry: { ...GEOMETRY, points: collide } },
      }),
    ).rejects.toThrow("both slug to");
  });

  it("should refuse a group named so that it slugs to the unfiltered option's own reserved id", async () => {
    const reserved = POINTS.map((p, i) => ({
      ...p,
      group: i === 0 ? "All" : "East",
    }));
    await expect(
      build({
        props: { ...PROPS, geometry: { ...GEOMETRY, points: reserved } },
      }),
    ).rejects.toThrow('slugs to "all"');
  });

  it("should bound the map by the window's height, not only by its width", async () => {
    // The mechanism, asserted as text because its EFFECT is only observable in a browser — which is
    // what scripts/verify-interaction.mjs measures. This test's job is to notice the rule being
    // deleted, not to prove it works.
    const html = await build();
    expect(html).toContain("container-type: size");
    expect(html).toContain("width: min(100cqw, calc(100cqh * 1))");
    expect(html).toContain("height: calc(100svh - var(--page-pad) * 2)");
  });
});

/**
 * `separationHeadroom` — the floor under how far a reader may zoom in, and the one number in the
 * live plan this seed's own data does not exercise.
 *
 * `leash()` bounds a reader where the study set stops filling the frame, which is right for someone
 * looking at the whole claim and useless for someone trying to pull two overlapping marks apart:
 * measured on `proof/mapgen-symbol-web` before the floor existed, 1.58 zoom levels at 1600x900 and
 * **0.33 at 768x1024**, a factor of 1.26. This seed's thirteen metros do not overlap, so the
 * function returns 0 for it and the frame-derived headroom governs alone — which is correct, and
 * which is also why it needs a fixture that DOES overlap or nothing here would ever run its body.
 *
 * Its first draft compared a radius in frame units against a distance in DEGREES and reported 5.04
 * zoom levels for this non-overlapping seed. The number looked plausible and was a unit mismatch.
 */
describe("separationHeadroom", () => {
  const r = () => 10;

  it("should ask for nothing when no two marks overlap", () => {
    const apart = [
      { px: 0, py: 0, value: 1 },
      { px: 100, py: 0, value: 1 },
    ];
    expect(separationHeadroom(apart, r)).toBe(0);
  });

  it("should ask for exactly the doublings that pull the closest pair apart", () => {
    // Two 10-unit radii touch at 20 units. At 5 units apart the reader needs 2 doublings, because a
    // camera-scaled circle holds its screen size while the distance between two centres doubles per
    // zoom level: 5 -> 10 -> 20.
    const overlapping = [
      { px: 0, py: 0, value: 1 },
      { px: 5, py: 0, value: 1 },
    ];
    expect(separationHeadroom(overlapping, r)).toBe(2);
  });

  it("should answer for the WORST pair, not the first or the average", () => {
    const mixed = [
      { px: 0, py: 0, value: 1 },
      { px: 10, py: 0, value: 1 },
      { px: 12.5, py: 0, value: 1 },
    ];
    // The 0/10 pair needs 1 doubling; the 0/12.5 pair needs less; the 10/12.5 pair needs 3. A reader
    // who can separate the worst pair can separate every pair.
    expect(separationHeadroom(mixed, r)).toBe(3);
  });

  it("should measure in the plate's own pixels, so a mark's radius and a gap are comparable", () => {
    // The unit-mismatch regression, pinned: `px`/`py` are the projected pixels the SVG draws the
    // circles at. Feeding it degrees would make the same two marks report a wildly different number.
    const inPixels = [
      { px: 0, py: 0, value: 1 },
      { px: 5, py: 0, value: 1 },
    ];
    const sameMarksInDegrees = [
      { px: 0, py: 0, value: 1 },
      { px: 0.05, py: 0, value: 1 },
    ];
    expect(separationHeadroom(inPixels, r)).not.toBe(
      separationHeadroom(sameMarksInDegrees, r),
    );
  });
});
