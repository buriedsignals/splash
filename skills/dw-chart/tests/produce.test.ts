import { describe, it, expect, afterAll } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync, rmSync, readFileSync } from "node:fs";
import { produceChart } from "../src/produce";
import { deleteChart } from "../src/datawrapper";
import type { ChartSpec } from "../src/chart-spec";

const spec = JSON.parse(
  readFileSync(
    join(import.meta.dir, "..", "assets", "sample-data", "sample.spec.json"),
    "utf8",
  ),
) as ChartSpec;
let id = "";
let msId = "";
let annId = "";
let interactiveId = "";

// Real Datawrapper API round-trips. Requires DATAWRAPPER_API_TOKEN; skipped without it
// so a clean checkout / CI stays green (mirrors map-dw's live-test gating).
const hasToken = !!process.env.DATAWRAPPER_API_TOKEN;
const d = hasToken ? describe : describe.skip;

d("produceChart (real API)", () => {
  it("produces a published chart, an embed, and an owned PNG with conformance applied", async () => {
    expect(!!process.env.DATAWRAPPER_API_TOKEN).toBe(true);
    const out = join(tmpdir(), "atelier-produce.png");
    const res = await produceChart(spec, out);
    id = res.chartId;
    expect(res.publicUrl).toContain("datawrapper");
    expect(res.embed).toContain(res.publicUrl);
    expect(existsSync(out)).toBe(true);
    // conformance applied: fetch the chart, assert aria-description == altInsight + base-color set
    const r = await fetch(`https://api.datawrapper.de/v3/charts/${id}`, {
      headers: { Authorization: `Bearer ${process.env.DATAWRAPPER_API_TOKEN}` },
    });
    const chart = await r.json();
    expect(chart.metadata.describe["aria-description"]).toBe(spec.altInsight);
    expect(chart.metadata.visualize["base-color"]).toBe("#0072B2");
    rmSync(out, { force: true });
  }, 60000);

  it("produces a multi-series stacked chart with per-series colours and correct orientation", async () => {
    const msSpec = {
      type: "stacked-column-chart",
      title: "Renewables overtook coal in the energy mix by 2022",
      data: "year,Coal,Gas,Renewables\n2018,50,30,20\n2020,40,30,30\n2022,28,30,42",
      seriesColors: { Coal: "#0072B2", Gas: "#E69F00", Renewables: "#009E73" },
      transpose: true,
      altInsight:
        "Renewables grew from 20% in 2018 to 42% in 2022, overtaking coal",
    };
    const out = join(tmpdir(), "atelier-multiseries.png");
    const res = await produceChart(msSpec as any, out);
    msId = res.chartId;
    const r = await fetch(
      `https://api.datawrapper.de/v3/charts/${res.chartId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.DATAWRAPPER_API_TOKEN}`,
        },
      },
    );
    const chart = await r.json();
    expect(chart.metadata.data.transpose).toBe(true);
    expect(chart.metadata.visualize["custom-colors"]).toEqual(
      msSpec.seriesColors,
    );
    rmSync(out, { force: true });
  }, 60000);

  it("produces a chart with a text annotation that lands on the live chart", async () => {
    const annSpec = {
      type: "d3-lines",
      title: "Unemployment peaked in 2021",
      data: "year,value\n2018,5.1\n2021,5.6\n2023,3.7",
      baseColor: "#0072B2",
      altInsight: "It peaked at 5.6% in 2021",
      annotations: [{ text: "Peak", x: "2021", y: 5.6 }],
    };
    const out = join(tmpdir(), "atelier-annot.png");
    const res = await produceChart(annSpec as any, out);
    annId = res.chartId;
    const r = await fetch(`https://api.datawrapper.de/v3/charts/${annId}`, {
      headers: { Authorization: `Bearer ${process.env.DATAWRAPPER_API_TOKEN}` },
    });
    const chart = await r.json();
    const notes = chart.metadata.visualize["text-annotations"];
    expect(Array.isArray(notes)).toBe(true);
    expect(notes[0].text).toBe("Peak");
    rmSync(out, { force: true });
  }, 60000);

  // Single-format-produce-export (Task 3): "interactive" delivers the hosted embed
  // alone — dw-chart must NOT export/write a PNG for it (the old unconditional
  // exportPng call after every publish). "static" (the default, tested above) is
  // unchanged: it still exports the media.
  it('produces the embed/publicUrl but writes NO png when format is "interactive"', async () => {
    const out = join(tmpdir(), "atelier-interactive.png");
    rmSync(out, { force: true });
    const res = await produceChart(spec, out, { format: "interactive" });
    interactiveId = res.chartId;
    expect(res.publicUrl).toContain("datawrapper");
    expect(res.embed).toContain(res.publicUrl);
    expect(res.pngPath).toBeUndefined();
    expect(existsSync(out)).toBe(false);
  }, 60000);
});

afterAll(async () => {
  if (id) await deleteChart(id);
  if (msId) await deleteChart(msId);
  if (annId) await deleteChart(annId);
  if (interactiveId) await deleteChart(interactiveId);
});
