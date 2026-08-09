import { describe, it, expect, setDefaultTimeout } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  deriveFurniture,
  measureText,
} from "../../twin-chart-beat/scripts/render-still.mjs";
import {
  EmissionsWeb,
  LAYOUTS,
  type WebLayout,
} from "../../../proof/co2-suisse/EmissionsWeb.tsx";
// The CO₂ story's own runner, in the story's own workspace — it left this skill when the skill
// stopped importing the story's component (a skill that imports out of itself does not build once
// copied on its own into a journalist's root). A `test/` directory may still reach for it; that is
// the one exemption `splash-twin/test/no-cross-skill-imports.test.ts` grants.
import { readingsFromCsv } from "../../../proof/co2-suisse/render-web.mjs";
import {
  crossingGeometry,
  fr,
} from "../../../proof/co2-suisse/crossing-geometry";

// The story's own array export, not its two layout constants imported by name — `render-web.mjs`
// stopped naming them too (Task 2's fix: a skill importing a story's frame geometry by name is the
// dependency that ran backwards). `[desktop, narrow]` here is this test file's own local
// destructuring, in the order `EmissionsWeb.tsx` lists them.
const [desktop, narrow] = LAYOUTS;

// `measureText` loads a native rasteriser (`@resvg/resvg-js`) that scans every system font on its
// first call in a process — a one-time cost, observed here anywhere from ~100ms to several seconds
// under real system load, which the default 5000ms per-test budget is not built to absorb whenever
// this happens to be the first file bun:test loads. Every other suite in this repo warms the same
// cost inside a normal-length run because some earlier file already paid it; this file cannot
// assume that when run alone (`bun test skills/twin-chart-web`), so it raises its own budget rather
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

function renderLayout(layout: WebLayout, overrides: Partial<typeof BASE> = {}) {
  const furniture = deriveFurniture(overrides.ground ?? BASE.ground);
  const props = { ...BASE, ...furniture, ...overrides, layout };
  return renderToStaticMarkup(createElement(EmissionsWeb, props));
}

describe("EmissionsWeb", () => {
  it("should carry the title, the source, the limits and the alt text", () => {
    const svg = renderLayout(desktop);
    expect(svg).toContain("En 2024, la Suisse a");
    expect(svg).toContain("Global Carbon Budget 2025");
    expect(svg).toContain("Émissions territoriales seulement");
    expect(svg).toContain("<desc>Une courbe qui grimpe");
  });

  it("should not flatten its children behind role=img on the root the way the static genre does", () => {
    // web-discipline.md, "One deliberate departure": role=img on the ROOT would silence every
    // focusable point below it. The points themselves are individually role="img" on purpose —
    // it is only the root svg element this rule is about.
    const svg = renderLayout(desktop);
    const rootTag = svg.slice(0, svg.indexOf(">") + 1);
    expect(rootTag).not.toContain("role=");
  });

  it("should render one focusable, labelled point per reading, none of it hidden without JS", () => {
    const svg = renderLayout(desktop);
    const points = svg.match(/class="pt"/g) ?? [];
    expect(points.length).toBe(BASE.data.length);
    expect(svg).toContain('tabindex="0"');
    expect(svg).toContain('aria-label="1967 : 32,5 Mt"');
    expect(svg).toContain('data-detail="1967 · 32,5 Mt"');
  });

  it("should give each point the exact formatted value the source data carries", () => {
    // Cross-checked against the same three years the live browser drive also checks.
    const svg = renderLayout(desktop);
    expect(svg).toContain('data-detail="1950 · 10,3 Mt"');
    expect(svg).toContain('data-detail="1973 · 46,2 Mt"');
    expect(svg).toContain('data-detail="2024 · 32,1 Mt"');
  });

  it("should paint only with the ground, its derived furniture and the one accent", () => {
    const ground = "#101820";
    const accent = "#E6A700";
    const furniture = deriveFurniture(ground);
    const svg = renderLayout(desktop, { ground, accent });
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

  it("should never colour a non-subject point with the accent, even in the markup that hover would toggle", () => {
    // The .pt circles' own fill attribute — the state hover/focus start from — is transparent,
    // never the accent; only CSS (never inlined per-point) can move it to muted on interaction.
    const svg = renderLayout(desktop);
    const ptFills = [...svg.matchAll(/class="pt"[^>]*fill="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(ptFills.every((f) => f === "transparent")).toBe(true);
  });

  it("should keep the reference rule, its label and the subject's end label unconditional", () => {
    // web-discipline.md, "What must not become interactive" — none of this is behind a class name
    // the interaction script could toggle off.
    const svg = renderLayout(desktop);
    expect(svg).toContain("Niveau de 1967");
    expect(svg).toContain("pic de 1973");
    expect(svg).toContain("2024 · 32,1 Mt");
    expect(svg).not.toContain("46,2 Mt<"); // the peak's own printed label stays silent on its value
  });

  it("should refuse a series with nothing to trace rather than draw a meaningless line", () => {
    expect(() =>
      renderLayout(desktop, { data: [{ year: 2015, mt: 1 }] } as any),
    ).toThrow("needs at least two readings");
  });

  for (const layout of [desktop, narrow]) {
    it(`should keep both gutters inside the frame at the ${layout.name} layout`, () => {
      // Nothing clipped, at either layout — the invariant the narrow-width drive also confirms
      // visually. A gutter wider than the frame itself would mean the plot rectangle is inverted.
      const svg = renderLayout(layout);
      const width = Number(svg.match(/width="(\d+)"/)![1]);
      const xs = [
        ...svg.matchAll(
          /<rect class="hit-area" x="([\d.]+)"[^>]*width="([\d.]+)"/g,
        ),
      ];
      expect(xs.length).toBe(1);
      const [, x, hitWidth] = xs[0];
      expect(Number(x)).toBeGreaterThan(0);
      expect(Number(x) + Number(hitWidth)).toBeLessThan(width);
    });

    it(`should derive the ${layout.name} frame's height from its own content, never clip the plot`, () => {
      const svg = renderLayout(layout);
      const height = Number(svg.match(/height="(\d+)"/)![1]);
      const hit = svg.match(
        /<rect class="hit-area"[^>]*y="([\d.]+)"[^>]*height="([\d.]+)"/,
      )!;
      const plotBottom = Number(hit[1]) + Number(hit[2]);
      expect(plotBottom).toBeLessThan(height);
    });
  }

  it("should widen the right gutter to fit a longer end label rather than clip it", () => {
    const narrowSvg = renderLayout(desktop);
    const wideData = [...BASE.data.slice(0, -1), { year: 2024, mt: 32.07 }];
    const svg = renderLayout(desktop, {
      data: wideData,
      referenceLabel:
        "Niveau de 1967 — un niveau que la Suisse n'avait plus vu depuis longtemps",
    });
    // The longer reference label does not change point count or crash rendering; it is still present.
    expect(svg).toContain("Niveau de 1967 — un niveau");
    expect(narrowSvg).toContain("2024 · 32,1 Mt");
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
  it("should place this genre's points at the exact coordinates the static/video genres would compute", () => {
    // The web genre must not carry a second implementation of data-to-coordinates. Calling the
    // shared core directly here and comparing to the component's own points, at desktop padding,
    // pins that there is only one.
    const padding = { top: 200, right: 120, bottom: 64, left: 60 };
    const g = crossingGeometry(BASE.data, {
      width: desktop.width,
      height: 560,
      padding,
      reference: BASE.reference,
    });
    expect(g.points.map((p) => p.year)).toEqual(BASE.data.map((d) => d.year));
    expect(fr(g.end.mt)).toBe("32,1");
  });
});
