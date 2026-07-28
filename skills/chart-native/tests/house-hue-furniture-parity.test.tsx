// The newsroom's house hue must reach the furniture of every chart that is themed at all.
//
// `deriveFurniture(bg, houseHue)` tints the greys — muted (subtitle, source, axis labels),
// axis, grid — toward the house colour at constant lightness, so the chrome belongs to the
// newsroom while keeping its WCAG contrast. Two seams carry that hue into a chart:
//
//   themeColors(config.themeBg, config.baseColor)   → the component's own furniture
//   <ChartFrame baseColor={config.baseColor}>       → the title/subtitle/source band
//
// `themeBg` (the house GROUND) and `baseColor` (the house HUE) are the two halves of one
// setting, and sixteen of the twenty-seven themed components carried both while eleven
// carried only the ground. That is not eleven bugs, it is a missing invariant — nothing said
// the halves travel together, so every composition type inherited the gap. This file says it.
//
// WHY A COMPOSITION CHART GETS THE HUE, AND WHY THAT IS NOT ABOUT ITS MARKS. A stacked,
// grouped, pie or diverging chart encodes categories with a categorical palette; the house
// hue must NOT colour its bands, or two categories collapse onto one colour. On those
// configs `baseColor` is a FURNITURE tint and nothing else, used in exactly the two seams
// above. Withholding the field from them because their MARKS could not use it is what also
// withheld their chrome.
import { describe, it, expect } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { themeColors } from "../src/core/tokens";
import { StackedBarChart, type StackedConfig } from "../src/StackedBarChart";
import { PieChart, type PieConfig } from "../src/PieChart";
import { GroupedBarChart, type GroupedConfig } from "../src/GroupedBarChart";
import stackedSample from "../assets/sample-data/stacked.json";
import pieSample from "../assets/sample-data/pie.json";
import groupedSample from "../assets/sample-data/grouped.json";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");
const read = (f: string) => readFileSync(join(SRC, f), "utf8");

// Base components only. `Interactive*Chart.tsx` are thin bindings that pass the SAME config
// object straight through to the base component, so they declare no theme fields of their own.
const BASE = readdirSync(SRC).filter(
  (f) => f.endsWith("Chart.tsx") && !f.startsWith("Interactive"),
);
const THEMED = BASE.filter((f) => read(f).includes("themeBg?: string"));

// The components that are not themed AT ALL — no `themeBg`, so they paint the static light
// `COLORS` and no house ground reaches them either. Giving them a `baseColor` alone would
// tint nothing: their furniture never goes through `themeColors`. That is a WIDER gap than
// this file's invariant (a whole theme seam missing, not one of its two halves), tracked
// separately in docs/splash/residuals.md. Frozen as a list so the set cannot quietly grow:
// a new chart type must be themed, or it must be added here on purpose.
const UNTHEMED = [
  "MarimekkoChart.tsx",
  "ParallelChart.tsx",
  "PictogramChart.tsx",
  "RadarChart.tsx",
  "SankeyChart.tsx",
  "StreamgraphChart.tsx",
  "SunburstChart.tsx",
];

// A JSX opening tag ends at the first `>` seen at brace depth 0 — props hold nested elements
// and objects carrying their own `>`.
function openingTag(afterTagName: string): string {
  let depth = 0;
  for (let i = 0; i < afterTagName.length; i++) {
    const c = afterTagName[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ">" && depth === 0) return afterTagName.slice(0, i + 1);
  }
  return afterTagName;
}

describe("house hue reaches every themed chart's furniture", () => {
  it("finds the components (guards against a silent empty sweep)", () => {
    expect(BASE.length).toBeGreaterThanOrEqual(40);
    expect(THEMED.length).toBe(BASE.length - UNTHEMED.length);
  });

  it("the unthemed set is exactly the frozen list — no chart type joins it silently", () => {
    expect(BASE.filter((f) => !THEMED.includes(f)).sort()).toEqual(
      [...UNTHEMED].sort(),
    );
  });

  it("themeBg and baseColor travel together: a config declaring one declares both", () => {
    const missing = THEMED.filter((f) => !/baseColor\?: string/.test(read(f)));
    expect(missing).toEqual([]);
  });

  it("every themed component's <ChartFrame> forwards baseColor", () => {
    const missing: string[] = [];
    for (const f of THEMED) {
      for (const seg of read(f).split("<ChartFrame").slice(1)) {
        if (!/baseColor=/.test(openingTag(seg))) missing.push(f);
      }
    }
    expect(missing).toEqual([]);
  });

  it("every themeColors() call passes the house hue as well as the ground", () => {
    // `themeColors(config.themeBg)` alone derives UNTINTED greys — the ground is themed and
    // the hue is dropped on the floor. The single argument is the whole defect.
    const missing: string[] = [];
    for (const f of THEMED) {
      for (const seg of read(f).split("themeColors(").slice(1)) {
        const args = seg.slice(0, seg.indexOf(")"));
        if (!args.includes(",")) missing.push(`${f}: themeColors(${args})`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("the spec mapper emits baseColor for every type it can build", () => {
    // The house hue is on the spec for every chart (brand-profile seeds it from
    // `palette[0]`). A per-type branch that drops it makes the threading above unreachable.
    const mapper = read("spec-to-config.ts");
    const types = [...mapper.matchAll(/^\s*type: "([a-z-]+)",/gm)].map(
      (m) => m[1],
    );
    expect(types.length).toBeGreaterThanOrEqual(27);
    const emits = mapper.split("baseColor: spec.baseColor").length - 1;
    expect(emits).toBe(types.length);
  });

  describe("and it shows in the render", () => {
    // Deliberately NOT an Okabe-Ito hue: a house colour that collided with a category colour
    // would make "the marks did not change" unreadable.
    const HOUSE = "#B3005E";
    const tinted = themeColors(undefined, HOUSE);
    const plain = themeColors(undefined);

    const cases = [
      [
        "stacked",
        (base?: string) => (
          <StackedBarChart
            config={
              { ...(stackedSample as object), baseColor: base } as StackedConfig
            }
            progress={1}
            width={840}
            height={460}
          />
        ),
      ],
      [
        "pie",
        (base?: string) => (
          <PieChart
            config={{ ...(pieSample as object), baseColor: base } as PieConfig}
            progress={1}
            width={840}
            height={480}
          />
        ),
      ],
      [
        "grouped",
        (base?: string) => (
          <GroupedBarChart
            config={
              { ...(groupedSample as object), baseColor: base } as GroupedConfig
            }
            progress={1}
            width={840}
            height={460}
          />
        ),
      ],
    ] as const;

    it("the tint is a real change, not a no-op the assertions could not see", () => {
      expect(tinted.muted).not.toBe(plain.muted);
      expect(tinted.axis).not.toBe(plain.axis);
      expect(tinted.grid).not.toBe(plain.grid);
    });

    for (const [name, render] of cases) {
      it(`${name}: the furniture picks up the house hue`, () => {
        const html = renderToStaticMarkup(render(HOUSE));
        expect(html).toContain(tinted.muted);
        expect(html).not.toContain(plain.muted);
      });

      it(`${name}: stays byte-identical without one`, () => {
        expect(renderToStaticMarkup(render(undefined))).toContain(plain.muted);
        expect(renderToStaticMarkup(render(undefined))).not.toContain(
          tinted.muted,
        );
      });

      it(`${name}: the categorical MARKS are untouched — the hue is chrome, not encoding`, () => {
        const fills = (html: string) =>
          html.match(/fill="#[0-9A-Fa-f]{6}"/g) ?? [];
        const withHue = fills(renderToStaticMarkup(render(HOUSE)));
        const without = fills(renderToStaticMarkup(render(undefined)));
        // Same count of painted fills, and the only ones that moved are furniture greys.
        expect(withHue.length).toBe(without.length);
        const moved = withHue.filter((v, i) => v !== without[i]);
        for (const m of moved) {
          expect(m.toLowerCase()).toContain(tinted.muted.toLowerCase());
        }
      });
    }
  });
});
