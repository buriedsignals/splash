import { describe, it, expect, afterAll } from "bun:test";
// map-dw deliberately ships no node_modules of its own — it rides dw-chart's API client
// (`../../dw-chart/src/datawrapper`), so the headless browser comes from the SAME sibling
// install (pinned by dw-chart's package.json). A bare "playwright" import would fall back
// to bun's auto-install cache here (no node_modules anywhere up-tree), which is
// network-dependent and not version-pinned — the explicit sibling path is deterministic.
import { chromium } from "../../../dw-chart/node_modules/playwright/index.mjs";
import { produceMap } from "../produce";
import type { MapSpec } from "../map-spec";
import { deleteChart } from "../../../dw-chart/src/datawrapper";

// REAL-API e2e for the choropleth TOOLTIP UNIT (probed live 2026-07-12): a published
// rainfall choropleth with unit " mm" stored `describe.number-append` and
// `data.column-format[value].number-append` correctly, yet its rendered hover tooltip
// showed a BARE "624" — %REGION_VALUE% never applies number-append (only the legend
// endpoints do). The fix bakes the unit into the tooltip body TEMPLATE. This test
// confirms BOTH what Datawrapper stored AND what a reader hovering the LIVE map sees,
// because the original bug was precisely metadata that "passed" while shipping unitless
// hover pixels. Requires DATAWRAPPER_API_TOKEN; skipped without it (mirrors e2e.test.ts).
const hasToken = !!process.env.DATAWRAPPER_API_TOKEN;
const d = hasToken ? describe : describe.skip;

let chartId = "";

d("choropleth tooltip unit (real API e2e)", () => {
  it("publishes a choropleth with unit ' mm' whose LIVE hover tooltip carries the unit", async () => {
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
    // "interactive": the deliverable under test IS the hosted embed (no PNG on disk).
    const r = await produceMap(spec, "/tmp/map-dw-tooltip-unit-unused.png", {
      format: "interactive",
    });
    chartId = r.chartId;

    // 1. The stored chart metadata bakes the unit into the tooltip body template
    //    (number-append alone never reaches %REGION_VALUE% — the probed bug).
    const cr = await fetch(`https://api.datawrapper.de/v3/charts/${chartId}`, {
      headers: { Authorization: `Bearer ${process.env.DATAWRAPPER_API_TOKEN}` },
    });
    const chart = (await cr.json()) as {
      metadata: { visualize: { tooltip?: { body?: string } } };
    };
    expect(chart.metadata.visualize.tooltip?.body).toBe("%REGION_VALUE% mm");

    // 2. The LIVE RENDER: hovering a data-bearing region shows "<value> mm", not a bare
    //    number. Regions are canvas-drawn (no per-region DOM), so sweep the map area until
    //    the .dw-tooltip appears — the same live-render discipline as dw-chart's
    //    highlight e2e (the metadata can "pass" while the pixels ship wrong).
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
      expect(tooltipText).not.toBe(""); // a region was hovered and a tooltip appeared
      // the value line reads "<number> mm" — the unit the bug dropped
      expect(tooltipText).toMatch(/\d\s?mm/);
    } finally {
      await browser.close();
    }
  }, 180000);
});

afterAll(async () => {
  if (chartId) await deleteChart(chartId);
}, 60000);
