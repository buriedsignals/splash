import { describe, it, expect, afterAll } from "bun:test";
import { existsSync } from "node:fs";
import { produceMap } from "../produce";
import type { MapSpec } from "../map-spec";
import { deleteChart } from "../../../dw-chart/src/datawrapper";
import { readLiveRenderWithRetry } from "./live-render";

// REAL-API e2e, COLLIDING-PERCENT survivor — one of the suite's AT MOST TWO published
// charts (see e2e.test.ts's header for the publish-volume rule). This ONE chart carries:
// - the single-source conclusion for the live-shipped "%%" bug (QA Wave 10): a spec
//   with a percent numberFormat token ("0%") AND unit " %" shipped a legend reading
//   "10% % … 70% %" — the % arrived from BOTH the legend's `labelFormat` token and
//   `data.column-format`'s number-append. The probe matrix that DERIVED the surface map
//   (6 published variants, 2026-07-12) is retired: its conclusions are encoded in
//   formattedSurfaceUnit/rawTooltipUnit and the PURE unit-matrix tests in
//   spec-to-map-metadata.test.ts. This e2e only re-proves the conclusion end-to-end:
//   the % renders exactly ONCE per legend endpoint AND once in the hover tooltip.
// - the "interactive" single-format floor (folded from the retired publish in
//   e2e.test.ts): the hosted embed is delivered ALONE — no PNG exported or written.
// Requires DATAWRAPPER_API_TOKEN; skipped without it.
const hasToken = !!process.env.DATAWRAPPER_API_TOKEN;
const d = hasToken ? describe : describe.skip;

let chartId = "";

d("choropleth legend unit single-source (real API e2e)", () => {
  it('publishes the colliding "0%" + " %" spec: hosted embed alone, RENDERED legend + tooltip carry a single %', async () => {
    const spec: MapSpec = {
      mapType: "choropleth",
      basemap: "world-2019",
      mapKeyAttr: "DW_STATE_CODE",
      regionKey: "code",
      valueColumn: "value",
      data: "code,value\nFRA,10\nDEU,46\nESP,42\nSWE,70",
      title: "Sweden leads this group on renewable share",
      altInsight: "Renewable share ranges from 10% in France to 70% in Sweden",
      numberFormat: "0%",
      unit: " %",
      source: { name: "Eurostat" },
    };
    const png = `/tmp/map-dw-legend-unit-unused-${Date.now()}.png`;
    const r = await produceMap(spec, png, { format: "interactive" });
    // id captured BEFORE any assertion — afterAll must delete the chart even when an
    // assertion below fails.
    chartId = r.chartId;

    // 1. Interactive single-format floor (folded from the retired e2e.test.ts publish):
    //    the deliverable is the hosted embed ALONE — no PNG exported or written.
    expect(r.publicUrl).toMatch(/datawrapper/);
    expect(r.embed).toContain(r.publicUrl);
    expect(r.pngPath).toBeUndefined();
    expect(existsSync(png)).toBe(false);

    // 2. The stored metadata has ONE legend unit source: the labelFormat token renders
    //    the %, so the column append must be suppressed (it was the second, doubling %).
    //    The raw tooltip keeps its one baked suffix (the author's " %", spacing intact).
    const cr = await fetch(`https://api.datawrapper.de/v3/charts/${chartId}`, {
      headers: { Authorization: `Bearer ${process.env.DATAWRAPPER_API_TOKEN}` },
    });
    const chart = (await cr.json()) as {
      metadata: {
        visualize: {
          tooltip?: { body?: string };
          legends?: { color?: { labelFormat?: string } };
        };
        describe: Record<string, unknown>;
        data?: { "column-format"?: Record<string, Record<string, unknown>> };
      };
    };
    expect(chart.metadata.visualize.legends?.color?.labelFormat).toBe("0%");
    const colFmt = chart.metadata.data?.["column-format"]?.value ?? {};
    expect("number-append" in colFmt).toBe(false);
    // DW merges its own default `describe.number-append: ""` server-side, so the key
    // exists on read-back — the invariant is that it carries NO unit.
    expect(chart.metadata.describe["number-append"] ?? "").toBe("");
    expect(chart.metadata.visualize.tooltip?.body).toBe("%REGION_VALUE% %");

    // 3. The LIVE RENDER (one bounded CDN retry inside — see live-render.ts): every
    //    legend endpoint label reads "<number>%" with a single %, and the hover tooltip
    //    too — the metadata "passed" on the shipped bug while the pixels doubled, so
    //    the render is the assertion that counts. Content assertions stay OUT of the
    //    retry so a wrong-content read fails immediately.
    const { legendText, tooltipText } = await readLiveRenderWithRetry(
      r.publicUrl,
    );

    expect(legendText).not.toMatch(/%\s*%/); // the shipped doubling ("10% %")
    // every endpoint label is "<number>%" — the unit exactly once
    const labels = legendText.split(" ");
    expect(labels.length).toBeGreaterThanOrEqual(2);
    for (const label of labels) expect(label).toMatch(/^\d+%$/);

    expect(tooltipText).toMatch(/\d\s?%/); // the unit is there…
    expect(tooltipText).not.toMatch(/%\s*%/); // …exactly once
  }, 300000);
});

afterAll(async () => {
  if (chartId) await deleteChart(chartId);
}, 60000);
