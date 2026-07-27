import { describe, it, expect } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isPng, pngSize } from "./png";

// A real, minimal, VALID png: signature + IHDR chunk for a 1200x675 image. Written byte by
// byte rather than borrowed from a fixture, so what the test asserts about is exactly what
// the bytes say — this is the file format, not a stand-in for it.
function ihdrPng(width: number, height: number): Uint8Array {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const b = new Uint8Array(24);
  b.set(sig, 0);
  const view = new DataView(b.buffer);
  view.setUint32(8, 13); // IHDR length
  b.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  view.setUint32(16, width);
  view.setUint32(20, height);
  return b;
}

const dir = mkdtempSync(join(tmpdir(), "verify-png-"));

describe("pngSize — the delivered image's REAL pixel size", () => {
  it("reads width and height out of the IHDR chunk", () => {
    const p = join(dir, "ok.png");
    writeFileSync(p, ihdrPng(1200, 675));
    expect(pngSize(p)).toStrictEqual({ width: 1200, height: 675 });
  });

  it("reads a device-scaled image at its real pixel size, not its CSS size", () => {
    const p = join(dir, "dpr2.png");
    writeFileSync(p, ihdrPng(2400, 1350));
    expect(pngSize(p)).toStrictEqual({ width: 2400, height: 1350 });
  });

  it("answers null for a file that is not a png, instead of throwing", () => {
    const p = join(dir, "not.png");
    writeFileSync(p, "<html>this is not an image</html>");
    expect(pngSize(p)).toBeNull();
    expect(isPng(p)).toBe(false);
  });

  it("answers null for a truncated png header", () => {
    const p = join(dir, "short.png");
    writeFileSync(p, ihdrPng(10, 10).slice(0, 20));
    expect(pngSize(p)).toBeNull();
  });

  it("answers null for a missing file instead of throwing ENOENT", () => {
    expect(pngSize(join(dir, "nope.png"))).toBeNull();
    expect(isPng(join(dir, "nope.png"))).toBe(false);
  });
});
