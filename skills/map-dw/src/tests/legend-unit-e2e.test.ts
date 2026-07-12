import { describe, it, expect, afterAll } from "bun:test";
// Same deterministic sibling-path playwright import as tooltip-unit-e2e.test.ts (map-dw
// ships no node_modules of its own — it rides dw-chart's pinned install).
import { chromium } from "../../../dw-chart/node_modules/playwright/index.mjs";
import { produceMap } from "../produce";
import type { MapSpec } from "../map-spec";
import { deleteChart } from "../../../dw-chart/src/datawrapper";

// REAL-API e2e for the LEGEND unit single-source (QA Wave 10, live-shipped "%%" bug).
// A choropleth spec carrying a percent numberFormat token ("0%") AND unit " %" shipped a
// legend reading "10% % … 70% %": the % arrived from TWO sources — the legend's
// `labelFormat` token rendered one, and `data.column-format`'s number-append added the
// second. Probe matrix (2026-07-12, 6 published variants read back headless) pinned the
// real surface map: the legend's unit sources are labelFormat + the column append
// (`describe.number-append` reaches NOTHING); the %REGION_VALUE% tooltip is substituted
// RAW — its only unit source is the baked template suffix. After the single-source fix,
// the colliding spec must render the % exactly ONCE per legend endpoint and exactly once
// in the hover tooltip. Requires DATAWRAPPER_API_TOKEN; skipped without it.
const hasToken = !!process.env.DATAWRAPPER_API_TOKEN;
const d = hasToken ? describe : describe.skip;

let chartId = "";

d("choropleth legend unit single-source (real API e2e)", () => {
  it('publishes the colliding "0%" + " %" spec and the RENDERED legend + tooltip carry a single %', async () => {
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
    const r = await produceMap(spec, "/tmp/map-dw-legend-unit-unused.png", {
      format: "interactive",
    });
    chartId = r.chartId;

    // 1. The stored metadata has ONE legend unit source: the labelFormat token renders
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

    // 2. The LIVE RENDER: every legend endpoint label reads "<number>%" with a single %,
    //    and the hover tooltip too — the metadata "passed" on the shipped bug while the
    //    pixels doubled, so the render is the assertion that counts.
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({
        viewport: { width: 900, height: 700 },
      });
      await page.goto(r.publicUrl, {
        waitUntil: "networkidle",
        timeout: 60000,
      });
      await page.waitForTimeout(4000);

      const legendText = await page.evaluate(() => {
        const el = document.querySelector(".color-legend");
        return el
          ? (el as HTMLElement).innerText.trim().replace(/\s+/g, " ")
          : "";
      });
      expect(legendText).not.toBe(""); // the legend rendered
      expect(legendText).not.toMatch(/%\s*%/); // the shipped doubling ("10% %")
      // every endpoint label is "<number>%" — the unit exactly once
      const labels = legendText.split(" ");
      expect(labels.length).toBeGreaterThanOrEqual(2);
      for (const label of labels) expect(label).toMatch(/^\d+%$/);

      // hover sweep (canvas-drawn regions — same discipline as tooltip-unit-e2e)
      let tooltipText = "";
      outer: for (let y = 120; y <= 520; y += 40) {
        for (let x = 80; x <= 820; x += 40) {
          await page.mouse.move(x, y);
          await page.waitForTimeout(120);
          const tip = await page.evaluate(() => {
            for (const el of Array.from(
              document.querySelectorAll(".dw-tooltip"),
            )) {
              const t = (el as HTMLElement).innerText?.trim();
              const st = getComputedStyle(el as HTMLElement);
              if (t && st.display !== "none" && st.visibility !== "hidden")
                return t;
            }
            return null;
          });
          if (tip) {
            tooltipText = tip;
            break outer;
          }
        }
      }
      expect(tooltipText).not.toBe("");
      expect(tooltipText).toMatch(/\d\s?%/); // the unit is there…
      expect(tooltipText).not.toMatch(/%\s*%/); // …exactly once
    } finally {
      await browser.close();
    }
  }, 180000);
});

afterAll(async () => {
  if (chartId) await deleteChart(chartId);
}, 60000);
