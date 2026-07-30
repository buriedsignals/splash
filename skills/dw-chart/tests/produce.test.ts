import { describe, it, expect, afterAll } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync, rmSync, readFileSync } from "node:fs";
import { produceChart } from "../src/produce";
import { deleteChart } from "../src/datawrapper";
import type { ChartSpec } from "../src/chart-spec";
// The LOOP's own assembler (lib/loop/assemble/dw-chart.ts), not a second copy of the
// carrier — skills/ is allowed to import lib/ (never the reverse). This is what proves
// the segment a live-API regression could otherwise silently break: brief.lang's OUTPUT
// reaching THIS FILE's produceChart, not a hand-built ChartSpec that never went through
// the loop's own translation.
import { assembleDwChart } from "../../../lib/loop/assemble/dw-chart";
import type { ProductionBrief } from "../../../lib/core/production-brief";

const spec = JSON.parse(
  readFileSync(
    join(import.meta.dir, "..", "assets", "sample-data", "sample.spec.json"),
    "utf8",
  ),
) as ChartSpec;
let id = "";
let msId = "";
let annId = "";
let frId = "";
let interactiveId = "";
let barId = "";
let carrierFrId = "";

// Real Datawrapper API round-trips. Requires DATAWRAPPER_API_TOKEN; skipped without it
// so a clean checkout / CI stays green (mirrors map-dw's live-test gating).
const hasToken = !!process.env.DATAWRAPPER_API_TOKEN;
const d = hasToken ? describe : describe.skip;

d("produceChart (real API)", () => {
  it("produces a published chart, an embed, and an owned PNG with conformance applied", async () => {
    expect(!!process.env.DATAWRAPPER_API_TOKEN).toBe(true);
    const out = join(tmpdir(), "splash-produce.png");
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
      source: { name: "IEA" },
    };
    const out = join(tmpdir(), "splash-multiseries.png");
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
      source: { name: "sample data" },
    };
    const out = join(tmpdir(), "splash-annot.png");
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

  // SOURCE-LABEL i18n (mirrors map-dw, see spec-to-metadata.ts): a non-English chart
  // ships its OWN localized source line via annotate.notes and blanks the native
  // describe.source-name/source-url (DW's "Source:" caption prefix never localizes).
  it("publishes a FRENCH chart whose source line is localized via annotate.notes (native caption blanked)", async () => {
    const frSpec: ChartSpec = {
      type: "column-chart",
      title: "Le chômage recule depuis 2021",
      data: "année,taux\n2021,7.9\n2022,7.3\n2023,7.1",
      lang: "fr",
      source: { name: "Insee", url: "https://insee.fr" },
      altInsight:
        "Le taux de chômage est passé de 7,9 % en 2021 à 7,1 % en 2023",
    };
    const out = join(tmpdir(), "splash-fr-source.png");
    const res = await produceChart(frSpec, out);
    frId = res.chartId;
    // The existing e2e pattern exports the render — keep it (static default).
    expect(existsSync(out)).toBe(true);
    const r = await fetch(`https://api.datawrapper.de/v3/charts/${frId}`, {
      headers: { Authorization: `Bearer ${process.env.DATAWRAPPER_API_TOKEN}` },
    });
    const chart = await r.json();
    // The localized line landed on the LIVE chart, URL preserved (Task 3: the
    // fixture carries a source URL, so the em-dash-suffixed form is the true
    // contract — name-only is only correct when no URL was supplied at all).
    expect(chart.metadata.annotate.notes).toBe(
      "Source : Insee — https://insee.fr",
    );
    // …and the native (untranslatable "Source:"-prefixed) caption is blanked, so the
    // footer never shows BOTH captions — the map-dw decision, mirrored.
    expect(chart.metadata.describe["source-name"]).toBe("");
    expect(chart.metadata.describe["source-url"]).toBe("");
    // DW still localizes numbers/dates from the chart language.
    expect(chart.language).toBe("fr-FR");
    rmSync(out, { force: true });
  }, 60000);

  // THE CARRIER, not a hand-built spec (task 6, family-b "what reaches the reader"): every
  // test above this one constructs a ChartSpec directly, so none of them would notice a
  // regression in the loop's OWN wiring — lib/loop/assemble/dw-chart.ts's
  // `...(brief.lang ? { lang: brief.lang } : {})` line, the one place `ProductionBrief.lang`
  // actually reaches a ChartSpec. This starts from a ProductionBrief (what produce() actually
  // hands the assembler), runs it through assembleDwChart, and only THEN through the real
  // produceChart — so a future edit that drops the assembler's lang line fails THIS test,
  // not just a unit test against the assembler in isolation.
  it("a French ProductionBrief's language survives assembleDwChart into a real published chart", async () => {
    const brief: ProductionBrief = {
      elementId: "e1",
      nativeType: "column-chart",
      format: "static",
      angle: {
        confirmedTakeaway: "Le chômage recule depuis 2021",
        altInsight:
          "Le taux de chômage est passé de 7,9 % en 2021 à 7,1 % en 2023",
      },
      dataCsv: "année,taux\n2021,7.9\n2022,7.3\n2023,7.1",
      attribution: "Insee",
      sourceUrl: "https://insee.fr",
      lang: "fr",
    };
    const assembled = assembleDwChart(brief);
    expect(assembled.ok).toBe(true);
    if (!assembled.ok) return;
    const carrierSpec = assembled.value as ChartSpec;
    expect(carrierSpec.lang).toBe("fr");

    const out = join(tmpdir(), "splash-carrier-fr.png");
    const res = await produceChart(carrierSpec, out);
    carrierFrId = res.chartId;
    expect(existsSync(out)).toBe(true);
    const r = await fetch(
      `https://api.datawrapper.de/v3/charts/${carrierFrId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.DATAWRAPPER_API_TOKEN}`,
        },
      },
    );
    const chart = await r.json();
    expect(chart.language).toBe("fr-FR");
    expect(chart.metadata.annotate.notes).toBe(
      "Source : Insee — https://insee.fr",
    );
    expect(chart.metadata.describe["source-name"]).toBe("");
    expect(chart.metadata.describe["source-url"]).toBe("");
    rmSync(out, { force: true });
  }, 60000);

  // DIRECT VALUE LABELS ON BAR-FAMILY CHARTS (FT/data-to-viz best-practice #3, QA Wave
  // 13 gap). A ranked d3-bars must ship with the value printed ON/beside each bar, not
  // leave the reader estimating off the gridlines. The metadata lever is verified LIVE
  // here (show-value-labels + value-label-format round-trip on the published chart, and
  // force-grid keeps the value axis as the accessible fallback); the PNG is exported to a
  // stable path for a human render-verify (the numbers must actually appear on the bars).
  it("publishes a ranked d3-bars whose value labels + axis land on the live chart, and renders the numbers", async () => {
    const barSpec: ChartSpec = {
      type: "d3-bars",
      title: "Steak is the most expensive item on the menu",
      data: "product,price\nCoffee,4.20\nSandwich,8.50\nSalad,11.00\nSteak,32.00\nWater,2.10",
      baseColor: "#0072B2",
      numberFormat: "$0,0.00",
      altInsight: "Steak at $32 is roughly eight times the price of coffee",
      source: { name: "sample data" },
    };
    const out = join(tmpdir(), "splash-dwbar-value-labels.png");
    rmSync(out, { force: true });
    const res = await produceChart(barSpec, out);
    barId = res.chartId;
    expect(existsSync(out)).toBe(true);
    // The PNG must be a real PNG (IHDR probe would throw otherwise) — read the signature.
    const png = readFileSync(out);
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    const r = await fetch(`https://api.datawrapper.de/v3/charts/${barId}`, {
      headers: { Authorization: `Bearer ${process.env.DATAWRAPPER_API_TOKEN}` },
    });
    const chart = await r.json();
    // The direct labels are ON, formatted, and the axis fallback is kept — all live.
    expect(chart.metadata.visualize["show-value-labels"]).toBe(true);
    expect(chart.metadata.visualize["value-label-format"]).toBe("$0,0.00");
    expect(chart.metadata.visualize["force-grid"]).toBe(true);
  }, 60000);

  // Single-format-produce-export (Task 3): "interactive" delivers the hosted embed
  // alone — dw-chart must NOT export/write a PNG for it (the old unconditional
  // exportPng call after every publish). "static" (the default, tested above) is
  // unchanged: it still exports the media.
  it('produces the embed/publicUrl but writes NO png when format is "interactive"', async () => {
    const out = join(tmpdir(), "splash-interactive.png");
    rmSync(out, { force: true });
    const res = await produceChart(spec, out, { format: "interactive" });
    interactiveId = res.chartId;
    expect(res.publicUrl).toContain("datawrapper");
    expect(res.embed).toContain(res.publicUrl);
    expect(res.pngPath).toBeUndefined();
    expect(existsSync(out)).toBe(false);
  }, 60000);
});

// NOT token-gated — this must hold precisely when no API access exists at all. The
// adversarial-review finding: produceChart resolved the export size (channelToExportSize,
// which is fail-closed on a garbled spec.channel) only AFTER createChart/setData/
// patchChart/publishChart, so a garbled channel threw after a live Datawrapper chart was
// already created and published (an orphaned hosted chart). The ordering witness needs no
// mock: with DATAWRAPPER_API_TOKEN unset, the FIRST API-client call (createChart's
// token()) throws "DATAWRAPPER_API_TOKEN is not set" — so seeing the unknown-channel
// error instead PROVES the channel resolution now runs before any API-touching code.
describe("produceChart fails fast on a garbled channel BEFORE any API call", () => {
  it("rejects with the unknown-channel error (not the missing-token error) when no token is set", async () => {
    const saved = process.env.DATAWRAPPER_API_TOKEN;
    delete process.env.DATAWRAPPER_API_TOKEN;
    try {
      const out = join(tmpdir(), "splash-garbled-channel.png");
      const garbled = { ...spec, channel: "instagramz" };
      await expect(produceChart(garbled, out)).rejects.toThrow(
        /unknown channel "instagramz"/,
      );
      expect(existsSync(out)).toBe(false);
    } finally {
      if (saved !== undefined) process.env.DATAWRAPPER_API_TOKEN = saved;
    }
  });
});

// Real-API cleanup: the DELETE round-trips can exceed bun's 5s default hook
// timeout under load — give the hook the same generous budget as the tests.
afterAll(async () => {
  if (id) await deleteChart(id);
  if (msId) await deleteChart(msId);
  if (annId) await deleteChart(annId);
  if (frId) await deleteChart(frId);
  if (interactiveId) await deleteChart(interactiveId);
  if (barId) await deleteChart(barId);
  if (carrierFrId) await deleteChart(carrierFrId);
}, 60000);
