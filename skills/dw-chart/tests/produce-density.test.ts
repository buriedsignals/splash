import { describe, it, expect, afterAll } from "bun:test";
import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { produceChart, readPngSize } from "../src/produce";
import { channelToExportRequestSize } from "../src/export-aspect";
import { deleteChart } from "../src/datawrapper";
import type { ChartSpec } from "../src/chart-spec";

// Delivered-density floor for dw-chart static (harmonized with map-dw): the channel
// model's mediaSize IS the delivered physical pixel size for every producer.
// chart-native renders logical/2 at deviceScaleFactor:2 → mediaSize delivered,
// IHDR-asserted; map-native same; map-dw halves its DW export request because DW
// rasterizes PNG at 2x → delivers exactly mediaSize, IHDR-asserted ±2px. dw-chart
// static was the odd one out: it requested the FULL channel box, so DW delivered 2x
// (2400x1350 for article-web) and nothing asserted the result.

describe("channelToExportRequestSize — the requested DW export box is HALF the delivered channel box", () => {
  // DW's PNG export rasterizes at 2x (retina), so dw-chart requests HALF the channel's
  // mediaSize and the export doubles it back onto the channel size — the same halving
  // map-dw's mapExportSize and chart-native's static path (deviceScaleFactor:2) apply.
  it("article-web fixed-aspect → half of 1200x675 (600x338; odd 675 rounds to 338 → a 676px PNG, inside ±2px)", () => {
    expect(channelToExportRequestSize("article-web", "d3-lines")).toEqual({
      width: 600,
      height: 338,
    });
  });

  it("social-feed fixed-aspect → half of 1080x1080 (540x540, exact square)", () => {
    expect(channelToExportRequestSize("social-feed", "column-chart")).toEqual({
      width: 540,
      height: 540,
    });
  });

  it("social-vertical fixed-aspect → half of 1080x1920 (540x960, exact 9:16)", () => {
    expect(channelToExportRequestSize("social-vertical", "d3-area")).toEqual({
      width: 540,
      height: 960,
    });
  });

  it("an absent channel defaults to article-web (legacy callers keep producing)", () => {
    expect(channelToExportRequestSize(undefined, "d3-lines")).toEqual({
      width: 600,
      height: 338,
    });
  });

  it("a row-driven type halves the WIDTH only — the height stays omitted (content-driven, DW must never crop rows)", () => {
    const req = channelToExportRequestSize("article-web", "d3-bars");
    expect(req.width).toBe(600);
    expect(req.height).toBeUndefined();
    const feed = channelToExportRequestSize("social-feed", "d3-dot-plot");
    expect(feed.width).toBe(540);
    expect(feed.height).toBeUndefined();
  });

  it("a garbled channel fails hard (normalizeChannel is fail-closed)", () => {
    expect(() => channelToExportRequestSize("instagramz", "d3-lines")).toThrow(
      /unknown channel/,
    );
  });
});

describe("readPngSize — IHDR readback refuses a non-PNG file", () => {
  // Without the signature check, garbage bytes at offsets 16/20 read back as absurd
  // "dimensions" and the render-size floor fails with a confusing size mismatch
  // instead of naming the real problem (the export handed back something not a PNG).
  it('throws a clear "not a PNG" error on a file without the PNG signature', () => {
    const p = join(tmpdir(), `dw-chart-not-a-png-${Date.now()}.png`);
    writeFileSync(p, "<html>an error page, not an image</html>");
    expect(() => readPngSize(p)).toThrow(/not a PNG/);
  });

  it('throws "not a PNG" on a file too short to hold an IHDR chunk', () => {
    const p = join(tmpdir(), `dw-chart-short-png-${Date.now()}.png`);
    writeFileSync(p, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    expect(() => readPngSize(p)).toThrow(/not a PNG/);
  });

  it("reads width/height from a well-formed PNG header", () => {
    // Minimal on-disk PNG head: 8-byte signature + IHDR length + "IHDR" tag +
    // width/height as big-endian uint32 — exactly the bytes the probe consumes.
    const head = Buffer.alloc(24);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(head, 0);
    head.writeUInt32BE(13, 8); // IHDR data length
    head.write("IHDR", 12, "ascii");
    head.writeUInt32BE(1200, 16); // width
    head.writeUInt32BE(675, 20); // height
    const p = join(tmpdir(), `dw-chart-real-png-head-${Date.now()}.png`);
    writeFileSync(p, head);
    expect(readPngSize(p)).toEqual({ width: 1200, height: 675 });
  });
});

// Live e2e against the real Datawrapper API (requires DATAWRAPPER_API_TOKEN; skipped
// without it, mirroring produce.test.ts). RED proof for the density harmonization:
// on the pre-fix code these fail with a 2x-delivered PNG (2400x1350 / 2160x2160).
const hasToken = !!process.env.DATAWRAPPER_API_TOKEN;
const d = hasToken ? describe : describe.skip;

let webId = "";
let feedId = "";

d(
  "produceChart delivered static density (real API) — the shared render-size floor",
  () => {
    it("article-web static delivers exactly the channel mediaSize (1200x675 ±2px), IHDR-verified", async () => {
      const spec = {
        type: "d3-lines",
        title: "Unemployment is at a five-year low",
        data: "year,value\n2018,5.1\n2019,4.8\n2020,5.4\n2021,5.6\n2022,4.2\n2023,3.7",
        baseColor: "#0072B2",
        channel: "article-web",
        altInsight:
          "Unemployment rose to 5.6% in 2021 then fell to a five-year low of 3.7% in 2023",
      } as ChartSpec;
      const out = join(tmpdir(), `dw-density-web-${Date.now()}.png`);
      const res = await produceChart(spec, out);
      webId = res.chartId;
      const dims = readPngSize(out);
      expect(Math.abs(dims.width - 1200)).toBeLessThanOrEqual(2);
      expect(Math.abs(dims.height - 675)).toBeLessThanOrEqual(2);
      rmSync(out, { force: true });
    }, 120000);

    it("social-feed static delivers exactly 1080x1080 ±2px, IHDR-verified", async () => {
      const spec = {
        type: "column-chart",
        title: "Renewable share doubled in five years",
        data: "year,share\n2018,21\n2020,28\n2022,35\n2023,42",
        baseColor: "#009E73",
        channel: "social-feed",
        altInsight: "Renewable share doubled from 21% in 2018 to 42% in 2023",
      } as ChartSpec;
      const out = join(tmpdir(), `dw-density-feed-${Date.now()}.png`);
      const res = await produceChart(spec, out);
      feedId = res.chartId;
      const dims = readPngSize(out);
      expect(Math.abs(dims.width - 1080)).toBeLessThanOrEqual(2);
      expect(Math.abs(dims.height - 1080)).toBeLessThanOrEqual(2);
      rmSync(out, { force: true });
    }, 120000);
  },
);

afterAll(async () => {
  if (webId) await deleteChart(webId);
  if (feedId) await deleteChart(feedId);
});
