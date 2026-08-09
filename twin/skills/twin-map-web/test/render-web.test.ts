import { describe, it, expect, setDefaultTimeout } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { deriveFurniture, measureText } from "../scripts/render-still.mjs";
import {
  MapWebSeed,
  RegionTable,
  DESKTOP_LAYOUT,
  NARROW_LAYOUT,
  pointDetail,
} from "../assets/MapWebSeed.tsx";
import {
  radiusScale,
  niceReferenceValues,
  drawOrder,
  readingOrder,
  labelPlacement,
  keepPoint,
  fr,
} from "../assets/geo-symbol.ts";

// `measureText` loads a native rasteriser (`@resvg/resvg-js`) that scans every system font on its
// first call in a process — a one-time cost this file cannot assume is already warm when run alone
// (`bun test skills/twin-map-web`), the same reasoning `twin-chart-web/test/render-web.test.ts`
// gives for raising its own budget.
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
  },
  {
    key: "b",
    name: "Beta Town",
    lon: 3.0,
    lat: 49.0,
    value: 5.6,
    px: 200,
    py: 150,
  },
  {
    key: "c",
    name: "Gamma",
    lon: 4.0,
    lat: 50.0,
    value: 1.4,
    px: 300,
    py: 200,
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
  measure: measureText,
};

function renderLayout(
  layout: typeof DESKTOP_LAYOUT,
  overrides: Partial<typeof BASE> = {},
) {
  const furniture = deriveFurniture(
    (overrides.ground ?? BASE.ground) as string,
  );
  const props = { ...BASE, ...furniture, ...overrides, layout };
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
  it("should be the one implementation the SVG attributes and the table both draw from", () => {
    expect(pointDetail({ name: "Alpha City", value: 11 })).toBe(
      "Alpha City : 11,0 million inhabitants",
    );
  });
});

describe("MapWebSeed", () => {
  it("should carry the title, the source, the caveat and the alt text", () => {
    const svg = renderLayout(DESKTOP_LAYOUT);
    expect(svg).toContain("A fixture map");
    expect(svg).toContain("Fixture source");
    expect(svg).toContain("Fixture caveat");
    expect(svg).toContain("<desc>Three circles");
  });

  it("should not flatten its children behind role=img on the root", () => {
    // map-web-discipline.md's own departure, mirroring the chart genre's: role=img on the ROOT
    // would silence every focusable circle below it.
    const svg = renderLayout(DESKTOP_LAYOUT);
    const rootTag = svg.slice(0, svg.indexOf(">") + 1);
    expect(rootTag).not.toContain("role=");
  });

  it("should render one focusable, labelled hit-circle per point, none of it hidden without JS", () => {
    const svg = renderLayout(DESKTOP_LAYOUT);
    const points = svg.match(/class="pt"/g) ?? [];
    expect(points.length).toBe(POINTS.length);
    expect(svg).toContain('tabindex="0"');
    expect(svg).toContain('aria-label="Alpha City : 11,0 million inhabitants"');
    expect(svg).toContain('data-detail="Beta Town : 5,6 million inhabitants"');
  });

  it("should nest a native <title> per point carrying the same detail string", () => {
    const svg = renderLayout(DESKTOP_LAYOUT);
    expect(svg).toContain("<title>Gamma : 1,4 million inhabitants</title>");
  });

  it("should keep every hit-circle transparent at rest, never inlined with the accent", () => {
    const svg = renderLayout(DESKTOP_LAYOUT);
    const ptFills = [...svg.matchAll(/class="pt"[^>]*fill="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(ptFills.length).toBeGreaterThan(0);
    expect(ptFills.every((f) => f === "transparent")).toBe(true);
  });

  it("should throw rather than draw a symbol map with fewer than two points", () => {
    expect(() =>
      renderLayout(DESKTOP_LAYOUT, {
        geometry: { frame: GEOMETRY.frame, points: [POINTS[0]!] },
      } as any),
    ).toThrow("needs at least two points");
  });

  it("should throw naming a missing subject rather than silently drop it", () => {
    const withoutParis = {
      frame: GEOMETRY.frame,
      points: POINTS.filter((p) => p.key !== "paris"),
    };
    // The fixture never has a "paris" point, so the seed's own SUBJECT_KEY constant is always
    // unmet by this fixture — asserting the throw happens at all, and names the key.
    expect(() =>
      renderLayout(DESKTOP_LAYOUT, { geometry: withoutParis } as any),
    ).toThrow("no point for the subject");
  });

  for (const layout of [DESKTOP_LAYOUT, NARROW_LAYOUT]) {
    it(`should paint only with the ground, its derived furniture and the one accent at the ${layout.name} layout`, () => {
      const ground = "#101820";
      const accent = "#E6A700";
      const furniture = deriveFurniture(ground);
      const points = [
        {
          key: "paris",
          name: "Paris",
          lon: 2.35,
          lat: 48.86,
          value: 11.0,
          px: 100,
          py: 100,
        },
        {
          key: "b",
          name: "Beta Town",
          lon: 3.0,
          lat: 49.0,
          value: 5.6,
          px: 200,
          py: 150,
        },
        {
          key: "c",
          name: "Gamma",
          lon: 4.0,
          lat: 50.0,
          value: 1.4,
          px: 300,
          py: 200,
        },
      ];
      const svg = renderToStaticMarkup(
        createElement(MapWebSeed, {
          ...BASE,
          ground,
          accent,
          ...furniture,
          geometry: { frame: GEOMETRY.frame, points },
          layout,
        } as any),
      );
      const allowed = new Set(
        [ground, accent, furniture.ink, furniture.muted].map((c) =>
          c.toLowerCase(),
        ),
      );
      const used = new Set(
        (svg.match(/#[0-9a-fA-F]{6}/g) ?? []).map((c) => c.toLowerCase()),
      );
      expect([...used].filter((c) => !allowed.has(c))).toEqual([]);
      expect(used.has(accent.toLowerCase())).toBe(true);
    });
  }
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
});
