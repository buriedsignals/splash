import { describe, it, expect } from "bun:test";
import { existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  produceMap,
  mapExportSize,
  readPngSize,
  type DwMapFormat,
} from "../produce";
import type { MapSpec } from "../map-spec";

// Single-format floor for map-dw (mirrors dw-chart's produce.test.ts ordering seam):
// these tests are NOT token-gated — they must hold precisely when no API access exists
// at all. With DATAWRAPPER_API_TOKEN unset, the FIRST API-client call throws
// "DATAWRAPPER_API_TOKEN is not set" — so seeing any OTHER rejection PROVES the gate
// under test ran before any API-touching code (no orphaned published map can exist),
// and seeing the missing-token error PROVES the gate ACCEPTED the input and handed
// off to the API step.

// A valid locator spec: the cheapest MapSpec that passes validateMapSpec (no data
// table, no dataless-join guard), so the only thing standing between it and the
// Datawrapper API is the format/channel resolution under test.
function locatorSpec(extra: Record<string, unknown> = {}): MapSpec {
  return {
    mapType: "locator",
    title: "Three sites along the Arve valley",
    altInsight: "Annemasse, Geneva and Chamonix marked along the Arve",
    markers: [
      { lng: 6.2347, lat: 46.1939, label: "Annemasse" },
      { lng: 6.1432, lat: 46.2044, label: "Geneva" },
      { lng: 6.8694, lat: 45.9237, label: "Chamonix" },
    ],
    ...extra,
  } as unknown as MapSpec;
}

async function withoutToken(fn: () => Promise<void>): Promise<void> {
  const saved = process.env.DATAWRAPPER_API_TOKEN;
  delete process.env.DATAWRAPPER_API_TOKEN;
  try {
    await fn();
  } finally {
    if (saved !== undefined) process.env.DATAWRAPPER_API_TOKEN = saved;
  }
}

describe("produceMap — single-format gate fires BEFORE any API call", () => {
  for (const bad of ["video", "scrolly"]) {
    it(`rejects format "${bad}" with the map-dw message (not the missing-token error)`, async () => {
      await withoutToken(async () => {
        const out = join(tmpdir(), `map-dw-format-${bad}-${Date.now()}.png`);
        await expect(
          produceMap(locatorSpec(), out, {
            format: bad as unknown as DwMapFormat,
          }),
        ).rejects.toThrow(
          new RegExp(
            `map-dw cannot build format "${bad}".*video/scrolly require map-native`,
          ),
        );
        expect(existsSync(out)).toBe(false);
      });
    });
  }

  it('accepts "static" — the next failure is the missing token, i.e. the API step', async () => {
    await withoutToken(async () => {
      const out = join(tmpdir(), `map-dw-format-static-${Date.now()}.png`);
      await expect(
        produceMap(locatorSpec(), out, { format: "static" }),
      ).rejects.toThrow(/DATAWRAPPER_API_TOKEN is not set/);
      expect(existsSync(out)).toBe(false);
    });
  });

  it('accepts "interactive" — the next failure is the missing token, i.e. the API step', async () => {
    await withoutToken(async () => {
      const out = join(tmpdir(), `map-dw-format-interactive-${Date.now()}.png`);
      await expect(
        produceMap(locatorSpec(), out, { format: "interactive" }),
      ).rejects.toThrow(/DATAWRAPPER_API_TOKEN is not set/);
      expect(existsSync(out)).toBe(false);
    });
  });
});

describe("produceMap — channel/export-size resolution fires BEFORE any API call", () => {
  // The dw-chart orphaned-published-chart lesson, mirrored: a garbled channel must
  // throw with ZERO API side effects (never after createChart/publishChart).
  it("rejects a garbled channel with the unknown-channel error (not the missing-token error)", async () => {
    await withoutToken(async () => {
      const out = join(tmpdir(), `map-dw-garbled-channel-${Date.now()}.png`);
      await expect(
        produceMap(locatorSpec({ channel: "instagramz" }), out, {
          format: "static",
        }),
      ).rejects.toThrow(/unknown channel "instagramz"/);
      expect(existsSync(out)).toBe(false);
    });
  });
});

describe("mapExportSize — the requested DW export box derives from the channel", () => {
  // DW's PNG export rasterizes at 2x (retina), so map-dw requests HALF the channel's
  // mediaSize and the export doubles it back onto the channel size — the same halving
  // chart-native's static path applies (deviceScaleFactor:2).
  it("article-web → half of 1200x675 (600x338; odd 675 rounds to 338 → a 676px PNG, inside ±2px)", () => {
    expect(mapExportSize("article-web")).toEqual({ width: 600, height: 338 });
  });

  it("social-feed → half of 1080x1080 (540x540, exact square)", () => {
    expect(mapExportSize("social-feed")).toEqual({ width: 540, height: 540 });
  });

  it("social-vertical → half of 1080x1920 (540x960, exact 9:16)", () => {
    expect(mapExportSize("social-vertical")).toEqual({
      width: 540,
      height: 960,
    });
  });

  it("an absent channel defaults to article-web (legacy callers keep producing)", () => {
    expect(mapExportSize(undefined)).toEqual({ width: 600, height: 338 });
  });

  it("a garbled channel fails hard (normalizeChannel is fail-closed)", () => {
    expect(() => mapExportSize("instagramz")).toThrow(/unknown channel/);
  });
});

describe("readPngSize — IHDR readback refuses a non-PNG file", () => {
  // Without the signature check, garbage bytes at offsets 16/20 read back as absurd
  // "dimensions" and the render-size floor fails with a confusing size mismatch
  // instead of naming the real problem (the export handed back something not a PNG).
  it('throws a clear "not a PNG" error on a file without the PNG signature', () => {
    const p = join(tmpdir(), `map-dw-not-a-png-${Date.now()}.png`);
    writeFileSync(p, "<html>an error page, not an image</html>");
    expect(() => readPngSize(p)).toThrow(/not a PNG/);
  });

  it('throws "not a PNG" on a file too short to hold an IHDR chunk', () => {
    const p = join(tmpdir(), `map-dw-short-png-${Date.now()}.png`);
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
    head.writeUInt32BE(1080, 16); // width
    head.writeUInt32BE(1920, 20); // height
    const p = join(tmpdir(), `map-dw-real-png-head-${Date.now()}.png`);
    writeFileSync(p, head);
    expect(readPngSize(p)).toEqual({ width: 1080, height: 1920 });
  });
});
