/**
 * THE COMPARATOR THIS TREE NEEDED, AND WHY IT DECODES PNG ITSELF.
 *
 * Every canon guard asked "are these two PNGs the same BYTES". Three measurements on 2026-08-19 say
 * that is the wrong question, and that it is already costing:
 *
 *   - `seed-renders-standalone` went red for `chart-video` on a seed no commit had touched — 20
 *     pixels out of 1 166 400 (0,002 %), none further apart than 8/255;
 *   - `scrolly`'s own `render-preview.mjs --check` is red on this branch: it renders 6543 bytes where
 *     `bc308ab8` committed 6609. A fresh render is 375/576000 pixels (0,065 %) from the committed
 *     one — the same picture, rasterised on another machine. `scrolly` renders through resvg with
 *     the SYSTEM fonts, so byte equality was asserting "this PNG is reproducible on any machine",
 *     which resvg does not promise;
 *   - `chart-video`'s preview flipped 78611 → 78605 in `bc308ab8` and back to 78611 when regenerated
 *     here. Two machines handing the same file back and forth, forever.
 *
 * `skills/map-web/scripts/compare-png.mjs` had already met this and answered it — by decoding both
 * PNGs on a real Chrome `<canvas>`. That works, and it drags a browser into the comparison. Five of
 * the seven canon skills rasterise through resvg and have no other reason to launch Chrome, so
 * copying the browser-based comparator to them would have made the guard cost more than the render.
 * This decodes PNG in ~90 lines of `node:zlib` instead: no browser, no dependency, synchronous, and
 * one substrate for all seven — which is what makes a walking parity test possible at all.
 *
 * SCOPE, stated rather than assumed: 8-bit, non-interlaced, RGB or RGBA. Measured across all
 * fourteen `preview.png` in this tree — every one is 8-bit RGB or RGBA, non-interlaced. Anything
 * else throws by name rather than decoding wrong.
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  setDefaultTimeout,
} from "bun:test";
import { deflateSync } from "node:zlib";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer";
import { comparePngBuffers, decodePng } from "../scripts/compare-png.mjs";

const SKILLS = join(import.meta.dirname, "..", "..");

/** A real PNG, encoded here so the decoder is tested against every filter type rather than against
 *  whatever filter an encoder happened to choose. `filter` is applied to every scanline. */
function png(
  width: number,
  height: number,
  pixel: (x: number, y: number) => [number, number, number, number],
  { filter = 0, channels = 4 }: { filter?: number; channels?: number } = {},
): Buffer {
  const stride = width * channels;
  // The TRUE bytes, kept separately: a PNG filter predicts from its neighbours' RECONSTRUCTED
  // values, never from the filtered bytes already written. Encoding in place gets filters 1-4
  // subtly wrong and the round-trip below is what says so.
  const truth = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixel(x, y);
      const values = channels === 4 ? [r, g, b, a] : [r, g, b];
      for (let c = 0; c < channels; c++)
        truth[y * stride + x * channels + c] = values[c] & 0xff;
    }
  const raw = Buffer.alloc(height * (1 + stride));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + stride)] = filter;
    for (let i = 0; i < stride; i++) {
      const here = truth[y * stride + i];
      const left = i >= channels ? truth[y * stride + i - channels] : 0;
      const above = y > 0 ? truth[(y - 1) * stride + i] : 0;
      const upLeft =
        y > 0 && i >= channels ? truth[(y - 1) * stride + i - channels] : 0;
      let out = here;
      if (filter === 1) out = here - left;
      if (filter === 2) out = here - above;
      if (filter === 3) out = here - Math.floor((left + above) / 2);
      if (filter === 4) {
        const p = left + above - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - above);
        const pc = Math.abs(p - upLeft);
        const pred = pa <= pb && pa <= pc ? left : pb <= pc ? above : upLeft;
        out = here - pred;
      }
      raw[y * (1 + stride) + 1 + i] = out & 0xff;
    }
  }
  const chunk = (type: string, body: Buffer) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(body.length);
    const typed = Buffer.concat([Buffer.from(type, "latin1"), body]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typed) >>> 0);
    return Buffer.concat([length, typed, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = channels === 4 ? 6 : 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

let TABLE: number[] | null = null;
function crc32(buf: Buffer): number {
  if (!TABLE) {
    TABLE = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      TABLE[n] = c;
    }
  }
  let c = 0xffffffff;
  for (const byte of buf) c = TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

const flat = (v: number) => () => [v, v, v, 255] as [number, number, number, number];

describe("decodePng reads the pictures this tree actually ships", () => {
  it("should decode an RGBA image to straight RGBA bytes", () => {
    const image = decodePng(png(4, 3, flat(120)));
    expect(image.width).toBe(4);
    expect(image.height).toBe(3);
    expect(image.data.length).toBe(4 * 3 * 4);
    expect([...image.data.slice(0, 4)]).toEqual([120, 120, 120, 255]);
  });

  it("should decode an RGB image by filling alpha", () => {
    const image = decodePng(png(4, 3, flat(90), { channels: 3 }));
    expect([...image.data.slice(0, 4)]).toEqual([90, 90, 90, 255]);
  });

  // A LINEAR GRADIENT IS NOT ENOUGH TO TEST PAETH, measured: with `x*17+y*3`-shaped data, breaking
  // the predictor to `pa <= pb ? left : above` — dropping the up-left branch entirely — left all
  // five filter tests green. Paeth only picks up-left where the surface turns, so the pattern below
  // is deliberately non-monotonic in both axes.
  const TURNING = (x: number, y: number) =>
    [
      (x * 61 + y * 17) % 256,
      (x * x * 13 + y * 7) % 256,
      (255 - x * 29 + y * y * 5) % 256,
      (x % 3 === 0 ? 255 : 40 + ((x * y) % 200)),
    ] as [number, number, number, number];

  for (const filter of [0, 1, 2, 3, 4]) {
    it(`should undo scanline filter ${filter}`, () => {
      const decoded = decodePng(png(9, 7, TURNING, { filter }));
      const reference = decodePng(png(9, 7, TURNING, { filter: 0 }));
      expect([...decoded.data]).toEqual([...reference.data]);
    });
  }

  it("should decode every preview.png this repository ships", () => {
    for (const skill of [
      "chart-beat",
      "chart-video",
      "chart-web",
      "image-beat",
      "map-beat",
      "map-web",
      "scrolly",
    ]) {
      const image = decodePng(
        readFileSync(join(SKILLS, skill, "assets", "preview.png")),
      );
      expect(`${skill} ${image.data.length}`).toBe(
        `${skill} ${image.width * image.height * 4}`,
      );
    }
  });

  it("should refuse what it cannot read, by name, rather than decoding it wrong", () => {
    const sixteenBit = png(2, 2, flat(10));
    sixteenBit[24] = 16; // IHDR bit depth
    expect(() => decodePng(sixteenBit)).toThrow(/8-bit/);
    const notAPng = Buffer.from("this is not a png at all");
    expect(() => decodePng(notAPng)).toThrow(/PNG/);
  });
});

describe("comparePngBuffers decides whether the picture changed, not whether the bytes did", () => {
  it("should call two identical pictures the same, with no differing pixel", () => {
    const a = png(32, 32, flat(100));
    const verdict = comparePngBuffers(a, a);
    expect(verdict.same).toBe(true);
    expect(verdict.diffPixels).toBe(0);
    expect(verdict.totalPixels).toBe(32 * 32);
  });

  it("should call a sub-tolerance shift across every pixel the same picture", () => {
    // The real readings were 20 pixels at ≤8/255 and 375 pixels at text edges; this shifts the WHOLE
    // picture by 4/255, which is strictly harder, and still has to pass.
    const verdict = comparePngBuffers(png(32, 32, flat(100)), png(32, 32, flat(104)));
    expect(verdict.same).toBe(true);
    expect(verdict.diffPixels).toBe(0);
  });

  it("should refuse two pictures of different sizes without comparing a pixel", () => {
    const verdict = comparePngBuffers(png(16, 16, flat(100)), png(32, 32, flat(100)));
    expect(verdict.same).toBe(false);
    expect(verdict.reason).toContain("size mismatch");
    expect(verdict.reason).toContain("16x16");
    expect(verdict.reason).toContain("32x32");
  });

  it("should call a picture that really changed different, and say by how much", () => {
    const block = (x: number, y: number) =>
      (x < 16 && y < 16 ? [190, 190, 190, 255] : [100, 100, 100, 255]) as [number, number, number, number];
    const verdict = comparePngBuffers(png(32, 32, flat(100)), png(32, 32, block));
    expect(verdict.same).toBe(false);
    expect(verdict.diffPixels).toBe(256);
    expect(verdict.fraction).toBeCloseTo(0.25, 5);
    expect(verdict.reason).toContain("exceed tolerance");
  });

  it("should count a change smaller than the allowed fraction as the same picture", () => {
    const oneOff = (x: number, y: number) =>
      (x === 0 && y === 0 ? [200, 200, 200, 255] : [100, 100, 100, 255]) as [number, number, number, number];
    const verdict = comparePngBuffers(png(32, 32, flat(100)), png(32, 32, oneOff));
    expect(verdict.diffPixels).toBe(1);
    expect(verdict.same).toBe(true);
  });

  it("should see a difference that lives only in the alpha channel", () => {
    // RGB-only comparison was the browser copy's shape and it is a real hole here: a still whose
    // background went transparent is a different picture and every RGB channel can be unchanged.
    const ghost = () => [100, 100, 100, 0] as [number, number, number, number];
    const verdict = comparePngBuffers(png(32, 32, flat(100)), png(32, 32, ghost));
    expect(verdict.diffPixels).toBe(1024);
    expect(verdict.same).toBe(false);
  });

  it("should let the caller tighten the tolerance until the jitter counts", () => {
    expect(
      comparePngBuffers(png(32, 32, flat(100)), png(32, 32, flat(104)), { tolerance: 1 }).same,
    ).toBe(false);
  });

  it("should let the caller tighten the allowed fraction until one pixel counts", () => {
    const oneOff = (x: number, y: number) =>
      (x === 0 && y === 0 ? [200, 200, 200, 255] : [100, 100, 100, 255]) as [number, number, number, number];
    expect(
      comparePngBuffers(png(32, 32, flat(100)), png(32, 32, oneOff), { maxDiffFraction: 0 }).same,
    ).toBe(false);
  });
});

/**
 * THE CROSS-SUBSTRATE CHECK, and the mutation that earned it.
 *
 * Every test above round-trips through an encoder written in this same file, so a decoder bug shared
 * with the encoder cancels out and stays green. Measured: breaking the Paeth predictor to
 * `pa <= pb ? left : above` left all five filter tests passing until their fixture stopped being a
 * linear gradient. That is exactly the class of hole `helper-parity.test.ts` names — a copy compared
 * only against itself — so the pure decoder is also checked against a SECOND, independent decoder:
 * the one inside Chrome, on the real `preview.png` files this repository ships, which use whatever
 * filters their encoders chose rather than whatever this file chose.
 *
 * A 2048x1800 image is 14,7 MB of RGBA and serialising that out of the page per file is the slow
 * part, not the decoding — so each side reduces its bytes to one FNV-1a checksum and the checksums
 * are compared. A single differing byte changes it.
 *
 * WHAT THIS CORPUS COVERS, counted rather than hoped: six of the seven previews use ONE filter for
 * every scanline (Sub for five of them, Up for `chart-video`). `map-web`'s is the only mixed one —
 * 929 Paeth lines, 770 Up, 80 Sub, 21 Average — so it is the single file carrying filters 3 and 4
 * here, and the Paeth mutation above fails on exactly it and on the synthetic filter-4 case. If
 * `map-web`'s preview ever stops being mixed, filters 3 and 4 lose their real-file cross-check and
 * only the synthetic round-trip remains.
 */
describe("the pure decoder agrees with Chrome's, on the real files", () => {
  setDefaultTimeout(120000);

  let browser: Awaited<ReturnType<typeof puppeteer.launch>>;
  let page: Awaited<ReturnType<typeof browser.newPage>>;

  /** A DUPLICATE of the `resolveChrome` every browser-driving file in this tree carries. */
  function resolveChrome(): string {
    const candidates: string[] = [];
    if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
    const cache = join(homedir(), ".cache/puppeteer/chrome");
    if (existsSync(cache))
      for (const build of readdirSync(cache).sort().reverse())
        candidates.push(
          join(cache, build, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
          join(cache, build, "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
          join(cache, build, "chrome-linux64/chrome"),
        );
    candidates.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
    const found = candidates.find((path) => existsSync(path));
    if (!found)
      throw new Error(`no Chrome to cross-check with. Looked in:\n  ${candidates.join("\n  ")}`);
    return found;
  }

  const fnv = (data: Uint8Array): string => {
    let h = 0x811c9dc5;
    for (let i = 0; i < data.length; i++) {
      h ^= data[i];
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  };

  beforeAll(async () => {
    browser = await puppeteer.launch({ executablePath: resolveChrome(), headless: true });
    page = await browser.newPage();
    await page.setContent("<!doctype html><html><body></body></html>");
  });

  afterAll(async () => {
    await browser?.close();
  });

  for (const skill of [
    "chart-beat",
    "chart-video",
    "chart-web",
    "image-beat",
    "map-beat",
    "map-web",
    "scrolly",
  ]) {
    it(`${skill}'s preview should decode to exactly the same pixels in both decoders`, async () => {
      const file = readFileSync(join(SKILLS, skill, "assets", "preview.png"));
      const mine = decodePng(file);
      const theirs = await page.evaluate(
        async (dataUrl) => {
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => reject(new Error("image failed to decode"));
            img.src = dataUrl;
          });
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let h = 0x811c9dc5;
          for (let i = 0; i < data.length; i++) {
            h ^= data[i];
            h = Math.imul(h, 0x01000193) >>> 0;
          }
          return {
            width: img.width,
            height: img.height,
            hash: (h >>> 0).toString(16).padStart(8, "0"),
          };
        },
        `data:image/png;base64,${file.toString("base64")}`,
      );
      expect(`${mine.width}x${mine.height} ${fnv(mine.data)}`).toBe(
        `${theirs.width}x${theirs.height} ${theirs.hash}`,
      );
    });
  }
});
