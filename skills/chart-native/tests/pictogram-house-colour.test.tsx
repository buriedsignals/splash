import { describe, it, expect } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  PictogramChart,
  PICTOGRAM_DEFAULT_ICON,
  type PictogramConfig,
} from "../src/PictogramChart";
import { runProduceConformance } from "../src/core/produce-conformance";
import sample from "../assets/sample-data/pictogram.json";

const config = sample as unknown as PictogramConfig;
const HOUSE = "#009E73"; // an Okabe-Ito green, as a newsroom profile would seed it

const markup = (c: PictogramConfig) =>
  renderToStaticMarkup(createElement(PictogramChart, { config: c }));

// The house-colour work of 2026-07-14 closed exactly this defect on maps: a chart that renders
// the engine's own blue under a green house profile. A pictogram is a single-hue type like a
// bar, so the hue reaches its MARKS — it is not one of the fixed-palette types where the hue
// may only tint furniture (base-colour-reach.ts).
describe("the house hue reaches the icons, not just the furniture", () => {
  it("paints every icon the house hue when one is set", () => {
    const html = markup({ ...config, baseColor: HOUSE });
    expect(html).toContain(HOUSE);
    expect(html).not.toContain(PICTOGRAM_DEFAULT_ICON);
  });

  it("falls back to the engine hue when no house colour is given", () => {
    expect(markup(config)).toContain(PICTOGRAM_DEFAULT_ICON);
  });

  it("the unit key's specimen icon takes the same hue as the data icons", () => {
    // a key drawn in a different colour than the marks it explains is a key for another chart
    const html = markup({ ...config, baseColor: HOUSE });
    const fills = [...html.matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)].map(
      (m) => m[1].toUpperCase(),
    );
    expect(new Set(fills.filter((f) => f === HOUSE.toUpperCase())).size).toBe(1);
    expect(fills.filter((f) => f === HOUSE.toUpperCase()).length).toBeGreaterThan(
      10,
    );
  });

  it("the produce guard checks the hue the component actually paints", () => {
    // a guard reading the default while the render uses the house colour would clear a
    // contrast failure nobody introduced and miss the one they did.
    const r = runProduceConformance("pictogram", {
      ...config,
      baseColor: "#DDDDDD", // off-palette AND far too pale to be a data mark
    } as unknown as Record<string, unknown>);
    expect(r.checked).toBe(true);
    expect(r.violations.length).toBeGreaterThan(0);
  });
});
