import { describe, it, expect, setDefaultTimeout } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture } from "../scripts/render-still.mjs";
import {
  MapWebSeed,
  RegionTable,
  pointDetail,
  ZOOM_SCALE,
} from "../assets/MapWebSeed.tsx";
import { renderMapWeb } from "../scripts/render-web.mjs";
import {
  radiusScale,
  niceReferenceValues,
  drawOrder,
  readingOrder,
  labelPlacement,
  keepPoint,
  groupsOf,
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

function renderSeed(
  overrides: Partial<typeof BASE & { zoomable: boolean }> = {},
) {
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

describe("niceReferenceValues", () => {
  it("should return round, decreasing values, at most `count`", () => {
    const values = niceReferenceValues(11.0, 3);
    expect(values.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < values.length; i++)
      expect(values[i]).toBeLessThan(values[i - 1]!);
  });

  it("should never return a non-positive value", () => {
    for (const v of niceReferenceValues(0.4, 3)) expect(v).toBeGreaterThan(0);
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
    expect(html).toContain(
      'data-key="paris" data-detail="Alpha City : 11,0 million inhabitants" data-group="west"',
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

  it("should not render a zoom toggle by default", () => {
    const html = renderSeed();
    expect(html).not.toContain("mw-zoom-toggle");
  });

  it("should render a bounded zoom checkbox when zoomable is true, unchecked by default", () => {
    const html = renderSeed({ zoomable: true } as any);
    expect(html).toContain('id="mw-zoom-toggle"');
    expect(html).not.toMatch(/id="mw-zoom-toggle"[^>]*checked/);
    expect(html).toContain(`${ZOOM_SCALE}×`);
    // The pannable viewport is only keyboard-focusable in its own right when there is something
    // to pan — not present at all when zoom is off.
    expect(html).toContain("Pannable map area");
  });

  it("should not make the viewport independently focusable when not zoomable — nothing to pan", () => {
    const html = renderSeed();
    expect(html).not.toContain("Pannable map area");
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
 * `renderMapWeb` — the genre's own machinery, exercised through the file it actually writes. These
 * assertions are about the HTML on disk, not about a React tree, because the two places this genre
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
    expect(html).toContain('aria-label="Alpha City : 11,0 million inhabitants"');
  });

  it("should render the table when the beat asks for it, with one row per point", async () => {
    const html = await build({ regionTable: true });
    expect(html).toContain('class="region-table"');
    expect((html.match(/<th scope="row">/g) ?? []).length).toBe(POINTS.length);
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
      build({ props: { ...PROPS, geometry: { ...GEOMETRY, points: collide } } }),
    ).rejects.toThrow("both slug to");
  });

  it("should refuse a group named so that it slugs to the unfiltered option's own reserved id", async () => {
    const reserved = POINTS.map((p, i) => ({
      ...p,
      group: i === 0 ? "All" : "East",
    }));
    await expect(
      build({ props: { ...PROPS, geometry: { ...GEOMETRY, points: reserved } } }),
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
