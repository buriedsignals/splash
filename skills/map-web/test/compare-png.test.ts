import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { comparePngBuffers } from "../scripts/compare-png.mjs";

/**
 * The preview `--check` of seven skills rests on this comparison (carried from here), and every one
 * of their canon tests only ever sees it say "same". So the other half is proven here, once, at
 * both settings in use — map-web's default and the strict one the other six pass: a picture that
 * genuinely changed is refused, and jitter under the per-channel tolerance is not. A decoder that read every PNG as zeros would pass every canon test and fail this.
 */

const committed = readFileSync(join(import.meta.dir, "..", "assets", "preview.png"));

function edited(paint: (data: Buffer, width: number, height: number) => void): Buffer {
  const png = PNG.sync.read(committed);
  paint(png.data, png.width, png.height);
  return PNG.sync.write(png);
}

describe("comparePngBuffers", () => {
  it("should call a re-encoded copy of the same picture the same", () => {
    // pngjs re-encodes with its own filters and deflate: different bytes, identical pixels.
    const reencoded = edited(() => {});
    expect(reencoded.equals(committed)).toBe(false);
    expect(comparePngBuffers(committed, reencoded).same).toBe(true);
  });

  it("should call every pixel moved by less than the tolerance the same", () => {
    const jittered = edited((data) => {
      for (let i = 0; i < data.length; i += 4)
        for (let k = 0; k < 3; k++) data[i + k] = data[i + k] > 127 ? data[i + k] - 4 : data[i + k] + 4;
    });
    expect(comparePngBuffers(committed, jittered).same).toBe(true);
  });

  it("should refuse a picture with one percent of it painted over, and say how much", () => {
    const painted = edited((data, width, height) => {
      const side = Math.ceil(Math.sqrt(width * height * 0.01));
      for (let y = 0; y < side; y++)
        for (let x = 0; x < side; x++) data.set([255, 0, 255, 255], (y * width + x) * 4);
    });
    const diff = comparePngBuffers(committed, painted);
    expect(diff.same).toBe(false);
    expect(diff.reason).toContain("exceed tolerance 6");
  });

  describe("strict, as every preview but map-web's calls it (no pixel past the tolerance)", () => {
    const STRICT = { tolerance: 6, maxDiffFraction: 0 };

    it("should refuse one pixel moved by 20 on one channel", () => {
      const nudged = edited((data, width, height) => {
        const at = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4;
        data[at] = data[at] > 127 ? data[at] - 20 : data[at] + 20;
      });
      expect(comparePngBuffers(committed, nudged).same).toBe(true); // map-web's default forgives it
      const diff = comparePngBuffers(committed, nudged, STRICT);
      expect(diff.same).toBe(false);
      expect(diff.diffPixels).toBe(1);
    });

    it("should call every pixel moved by 6 or less the same", () => {
      const jittered = edited((data) => {
        for (let i = 0; i < data.length; i += 4)
          for (let k = 0; k < 3; k++) data[i + k] = data[i + k] > 127 ? data[i + k] - 6 : data[i + k] + 6;
      });
      expect(comparePngBuffers(committed, jittered, STRICT).same).toBe(true);
    });
  });

  it("should refuse a picture of another size", () => {
    const png = PNG.sync.read(committed);
    const cropped = new PNG({ width: png.width - 1, height: png.height });
    PNG.bitblt(png, cropped, 0, 0, png.width - 1, png.height, 0, 0);
    expect(comparePngBuffers(committed, PNG.sync.write(cropped)).reason).toContain("size mismatch");
  });
});
