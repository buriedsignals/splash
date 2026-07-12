import { describe, it, expect } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { produceMap } from "../produce";
import type { MapSpec } from "../map-spec";
import { deleteChart } from "../../../dw-chart/src/datawrapper";

// Same render-free IHDR probe the native producers use (chart-native/scripts/
// produce.mjs readPngSize): width/height as big-endian uint32 at bytes 16-19/20-23.
function pngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// Live e2e against the real Datawrapper API. Requires DATAWRAPPER_API_TOKEN.
// Run with: `set -a; source /atelier/.env; set +a; bun test src/tests/e2e.test.ts`
// A passing assertion does NOT prove the map looks right — see output-proof/eu-renewables.png
// (the human gate: data bound, light→blue gradient, not black).
const hasToken = !!process.env.DATAWRAPPER_API_TOKEN;
const d = hasToken ? describe : describe.skip;

d("produceMap (live)", () => {
  it("publishes a real choropleth and exports a non-empty PNG", async () => {
    const spec: MapSpec = {
      mapType: "choropleth",
      basemap: "world-2019",
      mapKeyAttr: "DW_STATE_CODE",
      regionKey: "code",
      valueColumn: "value",
      data: "code,value\nFRA,25\nDEU,46\nESP,42\nSWE,66",
      title: "Sweden leads this group on renewable share",
      altInsight: "Renewable share ranges from 25% in France to 66% in Sweden",
      source: { name: "Eurostat" },
    };
    const png = `/tmp/map-dw-e2e-${Date.now()}.png`;
    const r = await produceMap(spec, png);
    expect(r.publicUrl).toMatch(/datawrapper/);
    expect(r.pngPath).toBe(png);
    expect((await Bun.file(png).arrayBuffer()).byteLength).toBeGreaterThan(0);
    // RENDER-SIZE FLOOR: the delivered PNG's real dims must equal the channel's
    // mediaSize ±2px (article-web default: 1200x675; DW's 2x export of the halved
    // 600x338 request box lands 1200x676 — the odd-height rounding the shared
    // assertRenderedSize tolerance exists for).
    const dims = pngSize(png);
    expect(Math.abs(dims.width - 1200)).toBeLessThanOrEqual(2);
    expect(Math.abs(dims.height - 675)).toBeLessThanOrEqual(2);
    // throwaway: this test chart is deleted; the kept proof is the eu-renewables chart in output-proof/
    await deleteChart(r.chartId);
  }, 60000);

  // Single-format floor: "interactive" delivers the hosted embed ALONE — no PNG is
  // exported or written for it (mirrors dw-chart's interactive contract).
  it('publishes the hosted embed and writes NO png when format is "interactive"', async () => {
    const spec: MapSpec = {
      mapType: "locator",
      title: "Three sites along the Arve valley",
      altInsight: "Annemasse, Geneva and Chamonix marked along the Arve",
      markers: [
        { lng: 6.2347, lat: 46.1939, label: "Annemasse" },
        { lng: 6.1432, lat: 46.2044, label: "Geneva" },
        { lng: 6.8694, lat: 45.9237, label: "Chamonix" },
      ],
      source: { name: "OpenStreetMap" },
    };
    const png = `/tmp/map-dw-interactive-e2e-${Date.now()}.png`;
    const r = await produceMap(spec, png, { format: "interactive" });
    expect(r.publicUrl).toMatch(/datawrapper/);
    expect(r.embed).toContain(r.publicUrl);
    expect(r.pngPath).toBeUndefined();
    expect(existsSync(png)).toBe(false);
    await deleteChart(r.chartId);
  }, 60000);

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

  it("publishes a real locator map and exports a non-empty PNG", async () => {
    const spec: MapSpec = {
      mapType: "locator",
      title: "Three sites along the Arve valley",
      altInsight: "Annemasse, Geneva and Chamonix marked along the Arve",
      markers: [
        { lng: 6.2347, lat: 46.1939, label: "Annemasse" },
        { lng: 6.1432, lat: 46.2044, label: "Geneva" },
        { lng: 6.8694, lat: 45.9237, label: "Chamonix" },
      ],
      source: { name: "OpenStreetMap" },
    };
    const png = `/tmp/map-dw-locator-e2e-${Date.now()}.png`;
    const r = await produceMap(spec, png);
    expect(r.publicUrl).toMatch(/datawrapper/);
    expect((await Bun.file(png).arrayBuffer()).byteLength).toBeGreaterThan(0);
    await deleteChart(r.chartId);
  }, 60000);
});
