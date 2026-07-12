import { describe, it, expect, afterAll } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync, rmSync } from "node:fs";
import { chromium } from "playwright";
import { produceChart } from "../src/produce";
import { deleteChart } from "../src/datawrapper";
import { HIGHLIGHT_MUTED_GREY } from "../src/spec-to-metadata";
import type { ChartSpec } from "../src/chart-spec";

// REAL-API e2e for the highlight feature (QA Wave 8, German-hospital case): a ranked
// bar with `highlight` must ship with the highlighted category on the accent and every
// other bar on the muted grey — confirmed against the LIVE chart metadata (what
// Datawrapper stored) AND the LIVE render (what a reader sees), because the original
// bug was precisely a chart that "passed" while shipping unhighlighted pixels.
// Requires DATAWRAPPER_API_TOKEN; skipped without it (mirrors produce.test.ts gating).
const hasToken = !!process.env.DATAWRAPPER_API_TOKEN;
const d = hasToken ? describe : describe.skip;

const ACCENT = "#E69F00";
// hexToRgb for the computed-style comparison below (getComputedStyle returns rgb()).
function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

let chartId = "";

d("highlight (real API e2e)", () => {
  it("publishes a ranked d3-bars whose highlighted category renders on the accent and the rest on the muted grey", async () => {
    const spec: ChartSpec = {
      type: "d3-bars",
      title: "Basel has the most hospital beds per capita",
      // Unsorted on purpose + sort:"desc": the category key must survive the re-sort
      // (a row index would not — that is why highlight is a VALUE, not an index).
      data: "city,beds\nBern,431\nBasel,812\nZurich,745",
      sort: "desc",
      subject: "hospital capacity",
      baseColor: ACCENT,
      highlight: "Basel",
      source: { name: "Sample data" },
      altInsight: "Basel tops the ranking with 812 beds per 100k residents",
    };
    const out = join(tmpdir(), "atelier-highlight.png");
    const res = await produceChart(spec, out);
    chartId = res.chartId;

    // 1. The stored chart metadata carries the category-keyed custom colors.
    const r = await fetch(`https://api.datawrapper.de/v3/charts/${chartId}`, {
      headers: { Authorization: `Bearer ${process.env.DATAWRAPPER_API_TOKEN}` },
    });
    const chart = (await r.json()) as {
      metadata: { visualize: Record<string, unknown> };
    };
    expect(chart.metadata.visualize["custom-colors"]).toEqual({
      Basel: ACCENT,
    });
    expect(chart.metadata.visualize["base-color"]).toBe(HIGHLIGHT_MUTED_GREY);

    // 2. The owned PNG was exported (cheap existence check; pixel truth is read from
    //    the live render below, where colors are queryable without a PNG decoder).
    expect(existsSync(out)).toBe(true);

    // 3. The LIVE RENDER paints exactly one bar in the accent and the others in the
    //    muted grey (d3-bars renders its bars as HTML divs — read background-color).
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({
        viewport: { width: 800, height: 600 },
      });
      await page.goto(res.publicUrl, {
        waitUntil: "networkidle",
        timeout: 60000,
      });
      await page.waitForTimeout(3000);
      const counts = await page.evaluate(() => {
        const out: Record<string, number> = {};
        for (const el of Array.from(document.querySelectorAll("*"))) {
          const rect = el.getBoundingClientRect();
          if (rect.width < 8 || rect.height < 8) continue;
          const bg = getComputedStyle(el).backgroundColor;
          if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "rgb(255, 255, 255)")
            continue;
          out[bg] = (out[bg] ?? 0) + 1;
        }
        return out;
      });
      expect(counts[rgb(ACCENT)]).toBe(1);
      expect(counts[rgb(HIGHLIGHT_MUTED_GREY)]).toBe(2);
    } finally {
      await browser.close();
    }
    rmSync(out, { force: true });
  }, 180000);
});

afterAll(async () => {
  if (chartId) await deleteChart(chartId);
});
