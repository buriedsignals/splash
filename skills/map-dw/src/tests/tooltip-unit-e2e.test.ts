import { describe, it, expect, afterAll } from "bun:test";
import { produceMap, readPngSize } from "../produce";
import type { MapSpec } from "../map-spec";
import { deleteChart } from "../../../dw-chart/src/datawrapper";
import { readLiveRenderWithRetry } from "./live-render";

// REAL-API e2e, PLAIN-UNIT survivor — one of the suite's AT MOST TWO published charts
// (see e2e.test.ts's header for the publish-volume rule). This ONE chart carries:
// - the tooltip unit conclusion (probed live 2026-07-12): a rainfall choropleth with
//   unit " mm" stored `describe.number-append`/`column-format` correctly yet hovered a
//   BARE "624" — %REGION_VALUE% never applies number-append, so the unit must be baked
//   into the tooltip body TEMPLATE (rawTooltipUnit). The original bug was precisely
//   metadata that "passed" while shipping unitless hover pixels, hence the live read.
// - the legend's plain-unit mechanism on the SAME render: the value column's
//   `column-format` number-append is the endpoints' unit source (" mm" once per label).
// - the "static" single-format floor (folded from the retired publish in e2e.test.ts):
//   publish → exportPng → delivered PNG dims == channel mediaSize ±2px, read back from
//   the file's own IHDR.
// Requires DATAWRAPPER_API_TOKEN; skipped without it (mirrors e2e.test.ts).
const hasToken = !!process.env.DATAWRAPPER_API_TOKEN;
const d = hasToken ? describe : describe.skip;

let chartId = "";

d("choropleth plain unit ' mm' — legend + LIVE hover + static floor (real API e2e)", () => {
  it("publishes ONE static choropleth whose PNG hits the channel box and whose LIVE legend + hover tooltip carry ' mm' once", async () => {
    const spec: MapSpec = {
      mapType: "choropleth",
      basemap: "world-2019",
      mapKeyAttr: "DW_STATE_CODE",
      regionKey: "code",
      valueColumn: "value",
      data: "code,value\nFRA,867\nDEU,700\nESP,636\nSWE,624",
      title: "France gets the most annual rainfall of the four",
      altInsight:
        "Annual rainfall ranges from 624 mm in Sweden to 867 mm in France",
      unit: " mm",
      source: { name: "World Bank" },
    };
    // "static": the owned PNG is the deliverable — and map-dw is HOSTED, so the PNG can
    // only be exported FROM a published map, which means the SAME chart also exposes
    // the live embed (publicUrl) this test hovers. One publish, both surfaces + floor.
    const png = `/tmp/map-dw-tooltip-unit-e2e-${Date.now()}.png`;
    const r = await produceMap(spec, png, { format: "static" });
    // id captured BEFORE any assertion — afterAll must delete the chart even when an
    // assertion below fails.
    chartId = r.chartId;

    // 1. Static single-format floor (folded from the retired e2e.test.ts publish):
    //    the PNG exists, non-empty, and its REAL dims equal the channel mediaSize ±2px
    //    (article-web default 1200x675; DW's 2x export of the halved 600x338 request
    //    box lands 1200x676 — inside the shared assertRenderedSize tolerance).
    expect(r.publicUrl).toMatch(/datawrapper/);
    expect(r.pngPath).toBe(png);
    expect((await Bun.file(png).arrayBuffer()).byteLength).toBeGreaterThan(0);
    const dims = readPngSize(png);
    expect(Math.abs(dims.width - 1200)).toBeLessThanOrEqual(2);
    expect(Math.abs(dims.height - 675)).toBeLessThanOrEqual(2);

    // 2. The stored chart metadata bakes the unit into the tooltip body template
    //    (number-append alone never reaches %REGION_VALUE% — the probed bug).
    const cr = await fetch(`https://api.datawrapper.de/v3/charts/${chartId}`, {
      headers: { Authorization: `Bearer ${process.env.DATAWRAPPER_API_TOKEN}` },
    });
    const chart = (await cr.json()) as {
      metadata: { visualize: { tooltip?: { body?: string } } };
    };
    expect(chart.metadata.visualize.tooltip?.body).toBe("%REGION_VALUE% mm");

    // 3. The LIVE RENDER (one bounded CDN retry inside — see live-render.ts): content
    //    assertions stay OUT here so a wrong-content read fails immediately.
    const { legendText, tooltipText } = await readLiveRenderWithRetry(
      r.publicUrl,
    );

    // Legend: every endpoint label reads "<number> mm" — the column-format append
    // mechanism, unit exactly once. Splitting on the " mm" separator must leave only
    // bare numbers ("624 mm 867 mm" → ["624","867"]); a dropped unit ("624 867") or a
    // doubled one ("624 mm mm") both fail.
    expect(legendText).not.toMatch(/mm\s*mm/);
    const nums = legendText
      .split(" mm")
      .map((s) => s.trim())
      .filter(Boolean);
    expect(nums.length).toBeGreaterThanOrEqual(2);
    for (const n of nums) expect(n).toMatch(/^\d[\d.,]*$/);

    // Hover: the value line reads "<number> mm" — the unit the bug dropped — once.
    expect(tooltipText).toMatch(/\d\s?mm/);
    expect(tooltipText).not.toMatch(/mm\s*mm/);
  }, 300000);
});

afterAll(async () => {
  if (chartId) await deleteChart(chartId);
}, 60000);
