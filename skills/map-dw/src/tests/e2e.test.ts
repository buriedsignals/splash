import { describe, it, expect } from "bun:test";
import { produceMap } from "../produce";
import type { MapSpec } from "../map-spec";

// Live refusal guards — real API knowledge, ZERO published charts.
//
// PUBLISH-VOLUME RULE (recurring root-gate failure, 2026-07-12): the sequential gate
// runs the dw-chart suites first (~15 live publishes) and Datawrapper throttling/CDN
// lag then stalls any publish→render→hover chain map-dw adds on top — the suite
// repeatedly timed out in the full gate while passing in isolation. So the WHOLE
// map-dw suite keeps AT MOST TWO published-chart e2e, each guarding a conclusion
// end-to-end (never re-deriving probe work):
// - legend-unit-e2e.test.ts — the colliding percent case ("0%" + " %" → a single % on
//   legend AND tooltip) + the "interactive" embed-alone single-format floor.
// - tooltip-unit-e2e.test.ts — the plain-unit case (' mm' on legend AND hover) + the
//   "static" publish→exportPng→IHDR render-size floor.
// The three publishes this file used to make are retired: the static choropleth and
// interactive locator floors moved onto those two charts; locator MAPPING stays covered
// pure (spec-to-map-metadata.test.ts's locator block), the pre-API gates token-free
// (produce-format.test.ts), and output-proof/ keeps the published locator as the human
// gate. Both remaining tests refuse BEFORE createChart, so nothing is ever published.
// Requires DATAWRAPPER_API_TOKEN (the dataless-join guard reads the live basemap
// geometry); skipped without it.
const hasToken = !!process.env.DATAWRAPPER_API_TOKEN;
const d = hasToken ? describe : describe.skip;

d("produceMap (live) — refusal guards, zero publishes", () => {
  it("REFUSES to produce a symbol map (hover-only, unlabeled static) and routes to map-native", async () => {
    // #2 — map-dw symbol maps are retired: the owned static PNG ships mute, unlabeled circles
    // (values are hover-only). produceMap must reject the spec before touching the API and steer
    // the caller to map-native, whose proportional-symbol renderer labels the circles by name + value.
    const spec = {
      mapType: "symbol",
      basemap: "france-metropolitan-departments",
      latColumn: "lat",
      lonColumn: "lon",
      sizeColumn: "population",
      data: "city,lat,lon,population\nParis,48.8566,2.3522,2100\nLyon,45.7640,4.8357,520\nMarseille,43.2965,5.3698,870",
      title: "Population concentrates in Paris among these cities",
      altInsight:
        "Paris (2.1M) far larger than Marseille (0.87M) and Lyon (0.52M)",
      source: { name: "INSEE" },
    } as unknown as MapSpec;
    const png = `/tmp/map-dw-symbol-e2e-${Date.now()}.png`;
    await expect(produceMap(spec, png)).rejects.toThrow(/map-native/);
  }, 60000);

  it("REFUSES to produce a dataless choropleth (join-key mismatch) instead of shipping grey", async () => {
    // The silent grey-map bug: `mapKeyAttr:"ISO_A3"` on `world-2019` (real alpha-3 key
    // `DW_STATE_CODE`) fails the region join — every region unmatched — yet Datawrapper
    // still publishes it. Bypass the validation-level key check with a basemap the static
    // registry does not know, so ONLY the produce-time dataless-join guard can catch it.
    const spec = {
      mapType: "choropleth",
      basemap: "world",
      mapKeyAttr: "ISO_A3", // wrong for DW's `world` basemap (its codes live under `id`)
      regionKey: "code",
      valueColumn: "value",
      data: "code,value\nUSA,88\nFRA,84\nDEU,92\nGBR,95",
      title: "Internet penetration across four large economies",
      altInsight:
        "Internet penetration ranges from 84% in France to 95% in the UK",
      source: { name: "ITU" },
    } as unknown as MapSpec;
    const png = `/tmp/map-dw-dataless-e2e-${Date.now()}.png`;
    await expect(produceMap(spec, png)).rejects.toThrow(/dataless choropleth/);
  }, 60000);
});
