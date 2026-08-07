// THE GUARD MEASURES THE MAP THE CONFIG PINS, NOT A MAP IT CANNOT RENDER.
//
// `furnitureGround` used to composite the furniture pill over BOTH absolute poles and judge it on
// the worse one. For a saturated house ground the worse pole is always the one the config's own
// `mapStyle` rules out — a dark green pins `dataviz-dark`, and the guard measured it on WHITE —
// so two real newsroom grounds were refused over a render that cannot happen
// (docs/splash/defect-2026-08-07-saturated-house-ground-refused-at-produce.md).
//
// The conservative half is asserted in the same file on purpose: a ground that genuinely cannot
// carry text is still refused, loudly, on the basemap it does pin.
import { describe, it, expect } from "bun:test";
import {
  furnitureGround,
  runProduceMapConformance,
} from "../src/core/map-produce-conformance";

const source = { name: "Ember 2025", url: "https://example.org/x" };
const HOUSE_HUE = "#d5121e";

// A clean choropleth — everything except the ground is conformant, so a violation in these tests
// can only be about the ground.
function config(extra: Record<string, unknown>): Record<string, unknown> {
  return {
    basemap: "world",
    regionKey: "code",
    valueField: "share",
    title: "Renewables power most of Europe's north",
    description: "Share of electricity from renewables, 2024",
    source,
    rows: [
      { code: "NOR", share: 99 },
      { code: "SWE", share: 68 },
      { code: "DEU", share: 59 },
      { code: "FRA", share: 27 },
    ],
    ...extra,
  };
}

const contrastViolations = (v: string[]) =>
  v.filter((s) => s.startsWith("text colour"));

describe("a newsroom's own saturated ground is produced, not refused", () => {
  it("produces a dark house green that reads at 5.22:1 on the dark basemap it pins", () => {
    const r = runProduceMapConformance(
      "choropleth",
      config({
        themeBg: "#0A5C36",
        mapStyle: "dataviz-dark",
        brandHue: HOUSE_HUE,
      }),
    );
    expect(contrastViolations(r.violations)).toEqual([]);
  });

  it("produces a light house pink that reads at 6.40:1 on the light basemap it pins", () => {
    const r = runProduceMapConformance(
      "choropleth",
      config({
        themeBg: "#F2C6D6",
        mapStyle: "dataviz-light",
        brandHue: HOUSE_HUE,
      }),
    );
    expect(contrastViolations(r.violations)).toEqual([]);
  });
});

describe("a ground that cannot carry text is still refused", () => {
  it("refuses the mid-grey, and says what it measured", () => {
    const r = runProduceMapConformance(
      "choropleth",
      config({
        themeBg: "#717171",
        mapStyle: "dataviz-dark",
        brandHue: HOUSE_HUE,
      }),
    );
    const v = contrastViolations(r.violations);
    expect(v.length).toBeGreaterThan(0);
    // …and it is measured on the basemap the config pins, never on the white one it rules out.
    expect(v.join(" ")).toContain("#6b6b6b");
  });
});

describe("furnitureGround", () => {
  it("takes the basemap it must measure on, and never returns the opposite pole", () => {
    expect(furnitureGround("#0A5C36", HOUSE_HUE, true)).toBe("#16593a");
    expect(furnitureGround("#F2C6D6", HOUSE_HUE, false)).toBe("#e9c5d2");
    // The two values the old both-poles model produced, and the reason the two grounds above were
    // refused. Neither is reachable any more.
    expect(furnitureGround("#0A5C36", HOUSE_HUE, true)).not.toBe("#36795a");
    expect(furnitureGround("#F2C6D6", HOUSE_HUE, false)).not.toBe("#c6a2af");
  });
});

describe("keep mine anyway — the journalist's recorded override", () => {
  const illegible = config({
    themeBg: "#717171",
    mapStyle: "dataviz-dark",
    brandHue: HOUSE_HUE,
    groundAccepted: true,
  });

  it("produces the map instead of refusing it", () => {
    expect(
      contrastViolations(
        runProduceMapConformance("choropleth", illegible).violations,
      ),
    ).toEqual([]);
  });

  it("still says out loud that the text will be hard to read", () => {
    const r = runProduceMapConformance("choropleth", illegible);
    expect(r.concerns.some((c) => c.includes("#717171"))).toBe(true);
  });

  it("changes nothing for a ground that reads perfectly well", () => {
    const withFlag = runProduceMapConformance(
      "choropleth",
      config({
        themeBg: "#0A5C36",
        mapStyle: "dataviz-dark",
        brandHue: HOUSE_HUE,
        groundAccepted: true,
      }),
    );
    expect(withFlag.violations).toEqual([]);
    expect(withFlag.concerns.filter((c) => c.includes("ground"))).toEqual([]);
  });
});
